from fastapi import APIRouter, HTTPException
from backend.models.schemas import (
    ExerciseSessionRequest, ExerciseFrameResponse, PoseAnalysisRequest,
    LandmarkPoint, CompensationFlag, SessionSummary,
)
from backend.services.pose_service import pose_service
from backend.services.session_manager import start_session, get_active_session, end_active_session
from backend.services.exercise_profiles import list_exercises
from backend.db import storage

router = APIRouter(prefix="/api/exercise", tags=["exercise"])


@router.get("/list")
async def get_exercises():
    """List all supported exercises."""
    return list_exercises()


@router.post("/start")
async def start_exercise(req: ExerciseSessionRequest):
    """Start a new exercise session."""
    try:
        session = start_session(req.exercise_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"session_id": session.session_id, "exercise_type": req.exercise_type}


@router.post("/{session_id}/frame")
async def process_frame(session_id: str, req: PoseAnalysisRequest):
    """Process a single frame during an active exercise session."""
    session = get_active_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already ended")

    try:
        result = pose_service.detect_from_base64(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {e}")

    if not result.pose_landmarks:
        return {"error": "no_pose", "message": "No pose detected"}

    landmarks_data = pose_service.landmarks_to_dict(result)
    analysis = session.process_frame(landmarks_data[0])

    landmarks_response = [
        [LandmarkPoint(**lm) for lm in pose]
        for pose in landmarks_data
    ]

    return ExerciseFrameResponse(
        landmarks=landmarks_response,
        joint_angles=analysis["joint_angles"],
        reps=analysis["reps"],
        current_rom=analysis["current_rom"],
        max_rom=analysis["max_rom"],
        symmetry=analysis["symmetry"],
        compensations=[CompensationFlag(**c) for c in analysis["compensations"]],
        phase=analysis["phase"],
    )


@router.post("/{session_id}/end")
async def end_exercise(session_id: str):
    """End an exercise session and get summary."""
    summary = end_active_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found or already ended")
    return summary


@router.get("/history")
async def get_history(exercise_type: str | None = None):
    """Get past session history."""
    return storage.get_session_history(exercise_type)


@router.get("/sessions")
async def get_all_sessions_endpoint():
    """Get all sessions."""
    return storage.get_all_sessions()
