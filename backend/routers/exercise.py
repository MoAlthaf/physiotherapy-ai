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

    rom_data = session_data['max_rom']
    rom_str = ", ".join(f"{k}: {v}°" for k, v in rom_data.items()) if isinstance(rom_data, dict) and rom_data else "no ROM recorded"

    prompt = f"""Write a physiotherapy session report based ONLY on the data below. Do not invent numbers. Never use exclamation marks.

Exercise: {session_data['exercise_type'].replace('_', ' ').title()}
Reps completed: {session_data['total_reps']}
Max ROM by joint: {rom_str}
Average symmetry score: {session_data['avg_symmetry']}%
Compensations detected: {session_data['total_compensations']}

Evaluate the session:
- Symmetry above 85% is good, 70-85% is fair, below 70% needs work.
- For squats, knee ROM of 90-120° is a good range. Below 70° means shallow squats.
- For shoulder exercises, ROM above 150° is good, below 90° is limited.
- Compensations above 5 indicate form issues.

Write exactly:
1. One-line performance summary with the actual numbers.
2. What the data shows went well (cite the numbers).
3. What needs improvement (cite the numbers).
4. One specific recommendation for next session.

Keep it to 4-6 sentences total. Use periods only, never exclamation marks."""

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
