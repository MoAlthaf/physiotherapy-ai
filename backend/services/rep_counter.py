class RepCounter:
    """State machine for counting exercise repetitions based on joint angle."""

    def __init__(self, down_threshold: float, up_threshold: float):
        self.down_threshold = down_threshold
        self.up_threshold = up_threshold
        self.reps = 0
        self.phase = "idle"  # "idle", "down", "up"

    def update(self, angle: float) -> str:
        """Update with new angle reading. Returns current phase."""
        if self.down_threshold < self.up_threshold:
            # Exercise where angle increases (e.g., shoulder raise)
            return self._update_increasing(angle)
        else:
            # Exercise where angle decreases (e.g., squat - knee bends)
            return self._update_decreasing(angle)

    def _update_increasing(self, angle: float) -> str:
        """For exercises where going 'up' means increasing angle (shoulder raise)."""
        if self.phase == "idle":
            if angle < self.down_threshold:
                self.phase = "down"
            elif angle > self.up_threshold:
                self.phase = "up"
        elif self.phase == "down":
            if angle > self.up_threshold:
                self.phase = "up"
                self.reps += 1
        elif self.phase == "up":
            if angle < self.down_threshold:
                self.phase = "down"
        return self.phase

    def _update_decreasing(self, angle: float) -> str:
        """For exercises where going 'down' means decreasing angle (squat)."""
        if self.phase == "idle":
            if angle > self.up_threshold:
                self.phase = "up"
            elif angle < self.down_threshold:
                self.phase = "down"
        elif self.phase == "up":
            if angle < self.down_threshold:
                self.phase = "down"
                self.reps += 1
        elif self.phase == "down":
            if angle > self.up_threshold:
                self.phase = "up"
        return self.phase

    def reset(self):
        self.reps = 0
        self.phase = "idle"
