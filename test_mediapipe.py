import mediapipe as mp
import cv2
import numpy as np
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

print("mediapipe version:", mp.__version__)
print("opencv version:", cv2.__version__)

base_options = mp_tasks.BaseOptions(model_asset_path="pose_landmarker.task")
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,
)
landmarker = vision.PoseLandmarker.create_from_options(options)

dummy_np = np.ones((100, 100, 3), dtype=np.uint8) * 200
mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=dummy_np)
result = landmarker.detect(mp_image)

print("PoseLandmarker initialized OK")
print("Landmarks detected on blank image:", len(result.pose_landmarks) > 0)
print("All good - MediaPipe 0.10.35 Tasks API is working correctly.")
