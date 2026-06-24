def calculate_symmetry(angles: dict[str, float]) -> dict:
    """Compare left vs right joint angles and return symmetry scores (0-100)."""
    pairs = [
        ("shoulder", "left_shoulder", "right_shoulder"),
        ("elbow", "left_elbow", "right_elbow"),
        ("hip", "left_hip", "right_hip"),
        ("knee", "left_knee", "right_knee"),
    ]

    scores = {}
    valid_scores = []

    for name, left_key, right_key in pairs:
        left = angles.get(left_key)
        right = angles.get(right_key)
        if left is not None and right is not None:
            max_val = max(abs(left), abs(right), 1)
            diff_ratio = abs(left - right) / max_val
            score = round(max(0, (1 - diff_ratio)) * 100, 1)
            scores[f"{name}_score"] = score
            valid_scores.append(score)

    overall = round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else 100.0
    scores["overall_score"] = overall
    return scores
