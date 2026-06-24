import numpy as np

# MediaPipe Pose landmark indices
LANDMARKS = {
    "nose": 0,
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
}


def _get_point(landmarks: list[dict], idx: int) -> np.ndarray:
    lm = landmarks[idx]
    return np.array([lm["x"], lm["y"], lm["z"]])


def calculate_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Calculate angle at point b given three 3D points a, b, c."""
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    cosine = np.clip(cosine, -1.0, 1.0)
    angle = np.degrees(np.arccos(cosine))
    return round(float(angle), 1)


def calculate_all_angles(landmarks: list[dict]) -> dict:
    """Calculate all major joint angles from a single pose's landmarks."""
    L = LANDMARKS
    angles = {}

    # Shoulder angles (elbow-shoulder-hip)
    angles["left_shoulder"] = calculate_angle(
        _get_point(landmarks, L["left_elbow"]),
        _get_point(landmarks, L["left_shoulder"]),
        _get_point(landmarks, L["left_hip"]),
    )
    angles["right_shoulder"] = calculate_angle(
        _get_point(landmarks, L["right_elbow"]),
        _get_point(landmarks, L["right_shoulder"]),
        _get_point(landmarks, L["right_hip"]),
    )

    # Elbow angles (shoulder-elbow-wrist)
    angles["left_elbow"] = calculate_angle(
        _get_point(landmarks, L["left_shoulder"]),
        _get_point(landmarks, L["left_elbow"]),
        _get_point(landmarks, L["left_wrist"]),
    )
    angles["right_elbow"] = calculate_angle(
        _get_point(landmarks, L["right_shoulder"]),
        _get_point(landmarks, L["right_elbow"]),
        _get_point(landmarks, L["right_wrist"]),
    )

    # Hip angles (shoulder-hip-knee)
    angles["left_hip"] = calculate_angle(
        _get_point(landmarks, L["left_shoulder"]),
        _get_point(landmarks, L["left_hip"]),
        _get_point(landmarks, L["left_knee"]),
    )
    angles["right_hip"] = calculate_angle(
        _get_point(landmarks, L["right_shoulder"]),
        _get_point(landmarks, L["right_hip"]),
        _get_point(landmarks, L["right_knee"]),
    )

    # Knee angles (hip-knee-ankle)
    angles["left_knee"] = calculate_angle(
        _get_point(landmarks, L["left_hip"]),
        _get_point(landmarks, L["left_knee"]),
        _get_point(landmarks, L["left_ankle"]),
    )
    angles["right_knee"] = calculate_angle(
        _get_point(landmarks, L["right_hip"]),
        _get_point(landmarks, L["right_knee"]),
        _get_point(landmarks, L["right_ankle"]),
    )

    return angles
