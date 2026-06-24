import streamlit as st
import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

@st.cache_resource
def load_landmarker():
    base_options = mp_tasks.BaseOptions(model_asset_path="pose_landmarker.task")
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
    )
    return vision.PoseLandmarker.create_from_options(options)

landmarker = load_landmarker()

frame = st.camera_input("Take a picture")

if frame:
    image_np = cv2.imdecode(
        np.frombuffer(frame.getvalue(), np.uint8),
        cv2.IMREAD_COLOR
    )
    rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_image)

    if result.pose_landmarks:
        st.success("Pose detected!")
    else:
        st.warning("No pose detected in the image.")
