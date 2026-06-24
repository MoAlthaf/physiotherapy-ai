from fastapi import APIRouter, HTTPException
from backend.models.schemas import (
    ExerciseSessionRequest, ExerciseFrameResponse, PoseAnalysisRequest,
    LandmarkPoint, CompensationFlag, SessionSummary,
)
from backend.services.pose_service import pose_service
from backend.services.session_manager import start_session, get_active_session, end_active_session
from backend.services.exercise_profiles import list_exercises, get_exercise_detail
from backend.services import fanar_client
from backend.db import storage

router = APIRouter(prefix="/api/exercise", tags=["exercise"])


@router.get("/list")
async def get_exercises():
    return list_exercises()


@router.get("/detail/{exercise_id}")
async def get_exercise(exercise_id: str):
    detail = get_exercise_detail(exercise_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return detail


@router.post("/start")
async def start_exercise(req: ExerciseSessionRequest):
    try:
        session = start_session(req.exercise_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"session_id": session.session_id, "exercise_type": req.exercise_type}


@router.post("/{session_id}/frame")
async def process_frame(session_id: str, req: PoseAnalysisRequest):
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
    summary = end_active_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found or already ended")
    return summary


@router.post("/{session_id}/ai-summary")
async def get_ai_summary(session_id: str):
    session_data = storage.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    prompt = f"""Generate a brief physiotherapy session report for the patient.

Session data:
- Exercise: {session_data['exercise_type'].replace('_', ' ').title()}
- Total reps: {session_data['total_reps']}
- Max ROM: {session_data['max_rom']}
- Average symmetry: {session_data['avg_symmetry']}%
- Total compensations detected: {session_data['total_compensations']}
- Duration: {session_data['started_at']} to {session_data['ended_at']}

Provide:
1. A one-line performance summary
2. What went well (1-2 points)
3. Areas for improvement (1-2 points)
4. Recommendation for next session

Keep it concise and encouraging."""

    try:
        response = await fanar_client.chat(prompt)
        return {"summary": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI summary failed: {e}")


@router.get("/history")
async def get_history(exercise_type: str | None = None):
    return storage.get_session_history(exercise_type)


@router.get("/sessions")
async def get_all_sessions_endpoint():
    return storage.get_all_sessions()


@router.get("/session/{session_id}")
async def get_session_detail(session_id: str):
    session_data = storage.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_data
