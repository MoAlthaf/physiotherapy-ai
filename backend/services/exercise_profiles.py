"""
Exercise profiles define what joints to track, angle thresholds for rep counting,
and which compensation rules to apply.
"""

EXERCISE_PROFILES = {
    "squat": {
        "display_name": "Squat",
        "primary_joint": "left_knee",  # track this for reps
        "secondary_joint": "right_knee",
        "down_threshold": 110,  # angle below this = "down" phase
        "up_threshold": 160,    # angle above this = "up" phase
        "tracked_joints": ["left_knee", "right_knee", "left_hip", "right_hip"],
        "description": "Stand with feet shoulder-width apart. Lower your hips by bending your knees.",
    },
    "shoulder_abduction": {
        "display_name": "Shoulder Abduction",
        "primary_joint": "left_shoulder",
        "secondary_joint": "right_shoulder",
        "down_threshold": 30,   # arm at side
        "up_threshold": 80,     # arm raised
        "tracked_joints": ["left_shoulder", "right_shoulder"],
        "description": "Raise your arms out to the sides, keeping them straight.",
    },
    "shoulder_flexion": {
        "display_name": "Shoulder Flexion",
        "primary_joint": "left_shoulder",
        "secondary_joint": "right_shoulder",
        "down_threshold": 30,
        "up_threshold": 80,
        "tracked_joints": ["left_shoulder", "right_shoulder"],
        "description": "Raise your arms forward and up, keeping them straight.",
    },
    "leg_raise": {
        "display_name": "Leg Raise",
        "primary_joint": "left_hip",
        "secondary_joint": "right_hip",
        "down_threshold": 160,  # leg down (hip angle large)
        "up_threshold": 120,    # leg raised (hip angle smaller)
        "tracked_joints": ["left_hip", "right_hip"],
        "description": "While standing, raise one leg forward keeping it straight.",
    },
    "knee_flexion": {
        "display_name": "Knee Flexion",
        "primary_joint": "left_knee",
        "secondary_joint": "right_knee",
        "down_threshold": 100,  # knee bent
        "up_threshold": 160,    # knee straight
        "tracked_joints": ["left_knee", "right_knee"],
        "description": "Bend your knee, bringing your heel toward your glutes.",
    },
}


def get_exercise_profile(exercise_type: str) -> dict | None:
    return EXERCISE_PROFILES.get(exercise_type)


def list_exercises() -> list[dict]:
    return [
        {"id": k, "name": v["display_name"], "description": v["description"]}
        for k, v in EXERCISE_PROFILES.items()
    ]
