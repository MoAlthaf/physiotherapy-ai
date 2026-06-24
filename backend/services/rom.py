class ROMTracker:
    """Tracks Range of Motion (max angles) during an exercise session."""

    def __init__(self):
        self.max_angles: dict[str, float] = {}
        self.current_angles: dict[str, float] = {}

    def update(self, angles: dict[str, float]):
        self.current_angles = angles.copy()
        for joint, angle in angles.items():
            if joint not in self.max_angles or angle > self.max_angles[joint]:
                self.max_angles[joint] = angle

    def get_max_rom(self) -> dict[str, float]:
        return self.max_angles.copy()

    def get_current(self) -> dict[str, float]:
        return self.current_angles.copy()

    def reset(self):
        self.max_angles.clear()
        self.current_angles.clear()
