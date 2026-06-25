from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.models.schemas import ChatRequest, ChatResponse
from backend.services import fanar_client
from backend.services.session_manager import get_active_session
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a message to the PhysioAI coach."""
    try:
        response = await fanar_client.chat(req.message, req.session_context)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")


@router.post("/with-session/{session_id}", response_model=ChatResponse)
async def chat_with_session(session_id: str, req: ChatRequest):
    """Chat with automatic session context injection."""
    session = get_active_session(session_id)
    context = None
    if session:
        context = {
            "exercise_type": session.exercise_type,
            "reps": session.rep_counter.reps,
            "max_rom": session.rom_tracker.get_max_rom(),
            "symmetry": session.symmetry_scores[-1] if session.symmetry_scores else None,
            "compensations": session.total_compensations,
        }

    try:
        response = await fanar_client.chat(req.message, context)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")


@router.post("/stream/{session_id}")
async def chat_stream(session_id: str, req: ChatRequest):
    """Stream chat response as SSE for progressive TTS."""
    session = get_active_session(session_id)
    context = None
    if session:
        avg_sym = sum(session.symmetry_scores) / len(session.symmetry_scores) if session.symmetry_scores else None
        context = {
            "exercise_type": session.exercise_type,
            "reps": session.rep_counter.reps,
            "max_rom": session.rom_tracker.get_max_rom(),
            "symmetry": {"overall_score": round(avg_sym, 1)} if avg_sym else None,
            "compensations": session.total_compensations,
            "compensation_types": list(session.recent_compensation_types),
        }

    async def event_generator():
        full_text = ""
        try:
            async for sentence in fanar_client.chat_stream(req.message, context):
                full_text += (" " + sentence) if full_text else sentence
                yield f"data: {json.dumps({'sentence': sentence})}\n\n"
            yield f"data: {json.dumps({'done': True, 'full_text': full_text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
