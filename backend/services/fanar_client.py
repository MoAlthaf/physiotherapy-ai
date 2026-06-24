import os
import httpx
import base64
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")
BASE_URL = os.getenv("BASE_URL", "https://api.fanar.qa/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Fanar-C-2-27B")
AGENTIC_MODEL = "Fanar-Sadiq-Agentic"

_client = httpx.AsyncClient(
    base_url=BASE_URL,
    headers={"Authorization": f"Bearer {API_KEY}"},
    timeout=60.0,
)


COACH_SYSTEM_PROMPT = """You are PhysioAI Coach, an AI-powered physiotherapy assistant.
You help patients understand their exercise performance and guide their rehabilitation.

When given session data, you should:
1. Interpret the biomechanics metrics (ROM, symmetry, compensation) in plain language
2. Give encouraging, actionable feedback
3. Highlight improvements and areas that need attention
4. Suggest adjustments to form if compensations are detected
5. Be warm, supportive, and professional

Always speak directly to the patient. Keep responses concise (2-4 sentences for quick feedback,
longer for session summaries). If the patient asks about pain, remind them to consult their
therapist for pain-related concerns.

You can communicate in both English and Arabic based on the patient's language preference."""


async def chat(message: str, session_context: dict | None = None) -> str:
    """Send a chat message to Fanar with optional exercise session context."""
    messages = [{"role": "system", "content": COACH_SYSTEM_PROMPT}]

    if session_context:
        context_msg = f"""Current session data:
- Exercise: {session_context.get('exercise_type', 'unknown')}
- Reps completed: {session_context.get('reps', 0)}
- Max ROM: {session_context.get('max_rom', {})}
- Symmetry score: {session_context.get('symmetry', 'N/A')}
- Compensations detected: {session_context.get('compensations', 0)}"""
        messages.append({"role": "system", "content": context_msg})

    messages.append({"role": "user", "content": message})

    response = await _client.post(
        "/chat/completions",
        json={
            "model": MODEL_NAME,
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.7,
        },
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


async def transcribe_audio(audio_bytes: bytes, language: str = "en") -> str:
    """Transcribe audio using Fanar STT."""
    response = await _client.post(
        "/audio/transcriptions",
        files={"file": ("audio.wav", audio_bytes, "audio/wav")},
        data={"model": "Fanar-Aura-STT-1", "language": language},
    )
    response.raise_for_status()
    data = response.json()
    return data.get("text", "")


async def text_to_speech(text: str) -> bytes:
    """Convert text to speech using Fanar TTS."""
    response = await _client.post(
        "/audio/speech",
        json={
            "input": text,
            "model": "tts-1",  # Will need to verify exact model name
        },
    )
    response.raise_for_status()
    return response.content
