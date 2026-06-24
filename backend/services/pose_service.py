import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision
from pathlib import Path


class PoseService:
    def __init__(self):
        model_path = Path(__file__).parent.parent.parent / "pose_landmarker.task"
        base_options = mp_tasks.BaseOptions(model_asset_path=str(model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
        )
        self.landmarker = vision.PoseLandmarker.create_from_options(options)

    def detect_from_base64(self, image_b64: str):
        import base64
        img_bytes = base64.b64decode(image_b64)
        img_np = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        return self.detect(img_np)

    def detect(self, image_bgr: np.ndarray):
        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.landmarker.detect(mp_image)
        return result

    def landmarks_to_dict(self, result):
        all_poses = []
        for pose_landmarks in result.pose_landmarks:
            points = []
            for lm in pose_landmarks:
                points.append({
                    "x": lm.x,
                    "y": lm.y,
                    "z": lm.z,
                    "visibility": lm.visibility,
                })
            all_poses.append(points)
        return all_poses


pose_service = PoseService()
