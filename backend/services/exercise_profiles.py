"""
Exercise profiles define what joints to track, angle thresholds for rep counting,
and which compensation rules to apply.
"""

EXERCISE_PROFILES = {
    "squat": {
        "display_name": "Squat",
        "primary_joint": "left_knee",
        "secondary_joint": "right_knee",
        "down_threshold": 110,
        "up_threshold": 160,
        "tracked_joints": ["left_knee", "right_knee", "left_hip", "right_hip"],
        "description": "Stand with feet shoulder-width apart. Lower your hips by bending your knees.",
        "category": "Lower Body",
        "difficulty": "Beginner",
        "muscles": ["Quadriceps", "Glutes", "Hamstrings"],
        "duration_estimate": "5-10 min",
        "instructions": [
            "Stand with feet shoulder-width apart, toes slightly outward",
            "Keep your chest up and core engaged",
            "Lower your hips by bending knees as if sitting in a chair",
            "Keep knees tracking over toes — avoid caving inward",
            "Push through heels to return to standing",
        ],
        "tips": "Focus on depth control. Don't let knees go past toes.",
    },
    "shoulder_abduction": {
        "display_name": "Shoulder Abduction",
        "primary_joint": "left_shoulder",
        "secondary_joint": "right_shoulder",
        "down_threshold": 30,
        "up_threshold": 80,
        "tracked_joints": ["left_shoulder", "right_shoulder"],
        "description": "Raise your arms out to the sides, keeping them straight.",
        "category": "Upper Body",
        "difficulty": "Beginner",
        "muscles": ["Deltoids", "Supraspinatus", "Trapezius"],
        "duration_estimate": "3-5 min",
        "instructions": [
            "Stand tall with arms at your sides, palms facing inward",
            "Slowly raise both arms out to the sides",
            "Keep arms straight but don't lock elbows",
            "Raise until arms are parallel to the floor (or as tolerated)",
            "Slowly lower arms back to starting position",
        ],
        "tips": "Avoid shrugging your shoulders — keep them relaxed and down.",
    },
    "shoulder_flexion": {
        "display_name": "Shoulder Flexion",
        "primary_joint": "left_shoulder",
        "secondary_joint": "right_shoulder",
        "down_threshold": 30,
        "up_threshold": 80,
        "tracked_joints": ["left_shoulder", "right_shoulder"],
        "description": "Raise your arms forward and up, keeping them straight.",
        "category": "Upper Body",
        "difficulty": "Beginner",
        "muscles": ["Anterior Deltoid", "Pectoralis Major", "Biceps"],
        "duration_estimate": "3-5 min",
        "instructions": [
            "Stand tall with arms at your sides, palms facing your thighs",
            "Slowly raise both arms forward and upward",
            "Keep arms straight throughout the movement",
            "Raise until arms are overhead (or as tolerated)",
            "Slowly lower arms back to starting position",
        ],
        "tips": "Don't arch your lower back — keep your core tight.",
    },
    "leg_raise": {
        "display_name": "Leg Raise",
        "primary_joint": "left_hip",
        "secondary_joint": "right_hip",
        "down_threshold": 160,
        "up_threshold": 120,
        "tracked_joints": ["left_hip", "right_hip"],
        "description": "While standing, raise one leg forward keeping it straight.",
        "category": "Lower Body",
        "difficulty": "Intermediate",
        "muscles": ["Hip Flexors", "Quadriceps", "Core"],
        "duration_estimate": "5-8 min",
        "instructions": [
            "Stand tall holding onto a wall or chair for balance",
            "Keep your standing leg slightly bent",
            "Slowly raise one leg forward, keeping it straight",
            "Lift to a comfortable height without leaning back",
            "Hold briefly, then slowly lower back down",
        ],
        "tips": "Use support for balance. Keep your torso upright throughout.",
    },
    "knee_flexion": {
        "display_name": "Knee Flexion",
        "primary_joint": "left_knee",
        "secondary_joint": "right_knee",
        "down_threshold": 100,
        "up_threshold": 160,
        "tracked_joints": ["left_knee", "right_knee"],
        "description": "Bend your knee, bringing your heel toward your glutes.",
        "category": "Lower Body",
        "difficulty": "Beginner",
        "muscles": ["Hamstrings", "Gastrocnemius"],
        "duration_estimate": "3-5 min",
        "instructions": [
            "Stand tall holding onto a wall or chair for support",
            "Slowly bend one knee, bringing your heel toward your glutes",
            "Keep your thighs parallel — don't let the knee drift forward",
            "Hold briefly at the top of the curl",
            "Slowly straighten your leg back to standing",
        ],
        "tips": "Control the movement — don't swing your leg.",
    },
}


def get_exercise_profile(exercise_type: str) -> dict | None:
    return EXERCISE_PROFILES.get(exercise_type)


def list_exercises() -> list[dict]:
    return [
        {
            "id": k,
            "name": v["display_name"],
            "description": v["description"],
            "category": v.get("category", "General"),
            "difficulty": v.get("difficulty", "Beginner"),
            "muscles": v.get("muscles", []),
            "duration_estimate": v.get("duration_estimate", "5 min"),
        }
        for k, v in EXERCISE_PROFILES.items()
    ]


def get_exercise_detail(exercise_id: str) -> dict | None:
    profile = EXERCISE_PROFILES.get(exercise_id)
    if not profile:
        return None
    return {
        "id": exercise_id,
        "name": profile["display_name"],
        "description": profile["description"],
        "category": profile.get("category", "General"),
        "difficulty": profile.get("difficulty", "Beginner"),
        "muscles": profile.get("muscles", []),
        "duration_estimate": profile.get("duration_estimate", "5 min"),
        "instructions": profile.get("instructions", []),
        "tips": profile.get("tips", ""),
        "tracked_joints": profile.get("tracked_joints", []),
    }
