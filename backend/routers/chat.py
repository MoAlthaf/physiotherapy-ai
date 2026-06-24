from fastapi import APIRouter, HTTPException
from backend.models.schemas import ChatRequest, ChatResponse
from backend.services import fanar_client
from backend.services.session_manager import get_active_session

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
