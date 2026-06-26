from pydantic import BaseModel
from typing import Optional


class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class JointAngles(BaseModel):
    left_shoulder: Optional[float] = None
    right_shoulder: Optional[float] = None
    left_elbow: Optional[float] = None
    right_elbow: Optional[float] = None
    left_hip: Optional[float] = None
    right_hip: Optional[float] = None
    left_knee: Optional[float] = None
    right_knee: Optional[float] = None


class SymmetryResult(BaseModel):
    shoulder_score: Optional[float] = None
    elbow_score: Optional[float] = None
    hip_score: Optional[float] = None
    knee_score: Optional[float] = None
    overall_score: float


class CompensationFlag(BaseModel):
    type: str
    severity: str  # "low", "medium", "high"
    message: str


class PoseAnalysisRequest(BaseModel):
    image: str  # base64 encoded image


class PoseAnalysisResponse(BaseModel):
    landmarks: list[list[LandmarkPoint]]
    joint_angles: JointAngles
    symmetry: Optional[SymmetryResult] = None
    compensations: list[CompensationFlag]
    rom: dict[str, float]


class ExerciseSessionRequest(BaseModel):
    exercise_type: str  # "squat", "shoulder_abduction", etc.


class ExerciseFrameResponse(BaseModel):
    landmarks: list[list[LandmarkPoint]]
    joint_angles: JointAngles
    reps: int
    current_rom: dict[str, float]
    max_rom: dict[str, float]
    symmetry: Optional[SymmetryResult] = None
    compensations: list[CompensationFlag]
    phase: str  # "up", "down", "hold"


class ChatRequest(BaseModel):
    message: str
    session_context: Optional[dict] = None
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: Optional[str] = None
    audio_url: Optional[str] = None


class VoiceRequest(BaseModel):
    audio: str  # base64 encoded audio


class SessionSummary(BaseModel):
    session_id: str
    exercise_type: str
    total_reps: int
    max_rom: dict[str, float]
    avg_symmetry: float
    total_compensations: int
    timestamp: str
