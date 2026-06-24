import base64
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from backend.services import fanar_client
import io

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """Transcribe uploaded audio to text using Fanar STT."""
    try:
        audio_bytes = await file.read()
        text = await fanar_client.transcribe_audio(audio_bytes)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {e}")


@router.post("/tts")
async def text_to_speech(text: str):
    """Convert text to speech audio using Fanar TTS."""
    try:
        audio_bytes = await fanar_client.text_to_speech(text)
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")
