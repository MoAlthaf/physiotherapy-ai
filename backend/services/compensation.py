import numpy as np
from backend.services.biomechanics import LANDMARKS, _get_point


def detect_compensations(landmarks: list[dict], exercise_type: str) -> list[dict]:
    """Rule-based compensation detection."""
    flags = []
    L = LANDMARKS

    # --- Torso lean detection ---
    left_shoulder = _get_point(landmarks, L["left_shoulder"])
    right_shoulder = _get_point(landmarks, L["right_shoulder"])
    left_hip = _get_point(landmarks, L["left_hip"])
    right_hip = _get_point(landmarks, L["right_hip"])

    mid_shoulder = (left_shoulder + right_shoulder) / 2
    mid_hip = (left_hip + right_hip) / 2

    # Lateral lean: difference in x between shoulder midpoint and hip midpoint
    lateral_lean = abs(mid_shoulder[0] - mid_hip[0])
    if lateral_lean > 0.05:
        severity = "high" if lateral_lean > 0.1 else "medium"
        flags.append({
            "type": "torso_lateral_lean",
            "severity": severity,
            "message": f"Torso leaning laterally ({severity}). Keep your trunk centered.",
        })

    # Forward lean: difference in z (depth)
    forward_lean = mid_shoulder[2] - mid_hip[2]
    if forward_lean > 0.08:
        severity = "high" if forward_lean > 0.15 else "medium"
        flags.append({
            "type": "torso_forward_lean",
            "severity": severity,
            "message": f"Excessive forward lean ({severity}). Engage your core and stay upright.",
        })

    # --- Shoulder hiking (for shoulder exercises) ---
    if exercise_type in ("shoulder_abduction", "shoulder_flexion"):
        shoulder_height_diff = abs(left_shoulder[1] - right_shoulder[1])
        if shoulder_height_diff > 0.04:
            flags.append({
                "type": "shoulder_hiking",
                "severity": "medium",
                "message": "One shoulder is higher than the other. Avoid hiking your shoulder.",
            })

    # --- Knee valgus (for squat/leg exercises) ---
    if exercise_type in ("squat", "leg_raise", "knee_flexion"):
        left_knee = _get_point(landmarks, L["left_knee"])
        right_knee = _get_point(landmarks, L["right_knee"])
        left_ankle = _get_point(landmarks, L["left_ankle"])
        right_ankle = _get_point(landmarks, L["right_ankle"])

        # Check if knees cave inward relative to ankles
        left_valgus = left_ankle[0] - left_knee[0]
        right_valgus = right_knee[0] - right_ankle[0]

        if left_valgus > 0.03 or right_valgus > 0.03:
            flags.append({
                "type": "knee_valgus",
                "severity": "high",
                "message": "Knees caving inward. Push your knees out over your toes.",
            })

    # --- Hip drop during single-leg exercises ---
    if exercise_type == "leg_raise":
        hip_height_diff = abs(left_hip[1] - right_hip[1])
        if hip_height_diff > 0.05:
            flags.append({
                "type": "hip_drop",
                "severity": "medium",
                "message": "Hip dropping on one side. Keep your pelvis level.",
            })

    return flags
