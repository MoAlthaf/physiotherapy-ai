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

MIN_VISIBILITY = 0.5


def _get_point(landmarks: list[dict], idx: int) -> np.ndarray:
    lm = landmarks[idx]
    return np.array([lm["x"], lm["y"], lm["z"]])


def _visible(landmarks: list[dict], *indices: int) -> bool:
    return all(landmarks[i].get("visibility", 0) >= MIN_VISIBILITY for i in indices)


def calculate_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Calculate angle at point b given three 3D points a, b, c."""
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    cosine = np.clip(cosine, -1.0, 1.0)
    angle = np.degrees(np.arccos(cosine))
    return round(float(angle), 1)


# Each angle definition: (name, point_a, point_b, point_c)
ANGLE_DEFS = [
    ("left_shoulder", "left_elbow", "left_shoulder", "left_hip"),
    ("right_shoulder", "right_elbow", "right_shoulder", "right_hip"),
    ("left_elbow", "left_shoulder", "left_elbow", "left_wrist"),
    ("right_elbow", "right_shoulder", "right_elbow", "right_wrist"),
    ("left_hip", "left_shoulder", "left_hip", "left_knee"),
    ("right_hip", "right_shoulder", "right_hip", "right_knee"),
    ("left_knee", "left_hip", "left_knee", "left_ankle"),
    ("right_knee", "right_hip", "right_knee", "right_ankle"),
]


def calculate_all_angles(landmarks: list[dict]) -> dict:
    """Calculate joint angles, skipping joints with low-visibility landmarks."""
    L = LANDMARKS
    angles = {}

    for name, a_name, b_name, c_name in ANGLE_DEFS:
        a_idx, b_idx, c_idx = L[a_name], L[b_name], L[c_name]
        if _visible(landmarks, a_idx, b_idx, c_idx):
            angles[name] = calculate_angle(
                _get_point(landmarks, a_idx),
                _get_point(landmarks, b_idx),
                _get_point(landmarks, c_idx),
            )

    return angles


def get_low_visibility_joints(landmarks: list[dict]) -> list[str]:
    """Return list of joint groups where landmarks aren't visible enough."""
    L = LANDMARKS
    low_vis = []

    joint_groups = {
        "shoulders": [L["left_shoulder"], L["right_shoulder"]],
        "elbows": [L["left_elbow"], L["right_elbow"]],
        "wrists": [L["left_wrist"], L["right_wrist"]],
        "hips": [L["left_hip"], L["right_hip"]],
        "knees": [L["left_knee"], L["right_knee"]],
        "ankles": [L["left_ankle"], L["right_ankle"]],
    }

    for group, indices in joint_groups.items():
        if any(landmarks[i].get("visibility", 0) < MIN_VISIBILITY for i in indices):
            low_vis.append(group)

    return low_vis
