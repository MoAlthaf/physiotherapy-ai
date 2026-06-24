import uuid
from backend.services.rom import ROMTracker
from backend.services.rep_counter import RepCounter
from backend.services.exercise_profiles import get_exercise_profile
from backend.services.biomechanics import calculate_all_angles
from backend.services.symmetry import calculate_symmetry
from backend.services.compensation import detect_compensations
from backend.db import storage


class ExerciseSession:
    def __init__(self, exercise_type: str):
        profile = get_exercise_profile(exercise_type)
        if not profile:
            raise ValueError(f"Unknown exercise: {exercise_type}")

        self.session_id = str(uuid.uuid4())
        self.exercise_type = exercise_type
        self.profile = profile
        self.rom_tracker = ROMTracker()
        self.rep_counter = RepCounter(
            down_threshold=profile["down_threshold"],
            up_threshold=profile["up_threshold"],
        )
        self.frame_count = 0
        self.symmetry_scores: list[float] = []
        self.total_compensations = 0

        storage.create_session(self.session_id, exercise_type)

    def process_frame(self, landmarks: list[dict]) -> dict:
        """Process a single frame's landmarks and return analysis."""
        self.frame_count += 1

        angles = calculate_all_angles(landmarks)
        self.rom_tracker.update(angles)

        # Rep counting on primary joint
        primary_angle = angles.get(self.profile["primary_joint"], 0)
        phase = self.rep_counter.update(primary_angle)

        symmetry = calculate_symmetry(angles)
        self.symmetry_scores.append(symmetry["overall_score"])

        compensations = detect_compensations(landmarks, self.exercise_type)
        self.total_compensations += len(compensations)

        # Save frame data periodically (every 5th frame to avoid DB bloat)
        if self.frame_count % 5 == 0:
            storage.save_frame(
                self.session_id, self.frame_count, angles,
                symmetry["overall_score"], compensations,
            )

        # Update session in DB
        avg_sym = sum(self.symmetry_scores) / len(self.symmetry_scores) if self.symmetry_scores else 100
        storage.update_session(
            self.session_id, self.rep_counter.reps,
            self.rom_tracker.get_max_rom(), round(avg_sym, 1),
            self.total_compensations,
        )

        return {
            "joint_angles": angles,
            "reps": self.rep_counter.reps,
            "phase": phase,
            "current_rom": self.rom_tracker.get_current(),
            "max_rom": self.rom_tracker.get_max_rom(),
            "symmetry": symmetry,
            "compensations": compensations,
        }

    def end(self) -> dict:
        storage.end_session(self.session_id)
        avg_sym = sum(self.symmetry_scores) / len(self.symmetry_scores) if self.symmetry_scores else 100
        return {
            "session_id": self.session_id,
            "exercise_type": self.exercise_type,
            "total_reps": self.rep_counter.reps,
            "max_rom": self.rom_tracker.get_max_rom(),
            "avg_symmetry": round(avg_sym, 1),
            "total_compensations": self.total_compensations,
        }


# Active sessions store
_active_sessions: dict[str, ExerciseSession] = {}


def start_session(exercise_type: str) -> ExerciseSession:
    session = ExerciseSession(exercise_type)
    _active_sessions[session.session_id] = session
    return session


def get_active_session(session_id: str) -> ExerciseSession | None:
    return _active_sessions.get(session_id)


def end_active_session(session_id: str) -> dict | None:
    session = _active_sessions.pop(session_id, None)
    if session:
        return session.end()
    return None
