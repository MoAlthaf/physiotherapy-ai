import streamlit as st
import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import PoseLandmarksConnections

@st.cache_resource
def load_landmarker():
    base_options = mp_tasks.BaseOptions(model_asset_path="pose_landmarker.task")
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
    )
    return vision.PoseLandmarker.create_from_options(options)

def draw_skeleton(image_rgb, pose_landmarks_list):
    annotated = image_rgb.copy()
    h, w = annotated.shape[:2]

    for pose_landmarks in pose_landmarks_list:
        # Draw connections (bones)
        for connection in PoseLandmarksConnections.POSE_LANDMARKS:
            start_idx = connection.start
            end_idx = connection.end
            lm_start = pose_landmarks[start_idx]
            lm_end = pose_landmarks[end_idx]
            x1, y1 = int(lm_start.x * w), int(lm_start.y * h)
            x2, y2 = int(lm_end.x * w), int(lm_end.y * h)
            cv2.line(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Draw joints
        for lm in pose_landmarks:
            cx, cy = int(lm.x * w), int(lm.y * h)
            cv2.circle(annotated, (cx, cy), 4, (255, 0, 0), -1)

    return annotated


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
        annotated = draw_skeleton(rgb, result.pose_landmarks)
        st.image(annotated, caption="Pose detected", use_container_width=True)
    else:
        st.image(rgb, caption="No pose detected", use_container_width=True)
        st.warning("No pose detected — make sure your full body is visible.")
