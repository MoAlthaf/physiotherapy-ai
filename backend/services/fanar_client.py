import os
import httpx
import base64
import uuid
from collections import defaultdict
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


MAX_HISTORY = 20

_conversations: dict[str, list[dict]] = {}


def get_or_create_conversation(conversation_id: str | None) -> tuple[str, list[dict]]:
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
    if conversation_id not in _conversations:
        _conversations[conversation_id] = []
    return conversation_id, _conversations[conversation_id]


COACH_SYSTEM_PROMPT = """You are PhysioAI Coach, an AI physiotherapy assistant. Reply in 2-4 sentences. Be helpful and specific.
Rules:
- Reply ONLY in the language the user speaks. If Arabic, reply in Arabic. If English, reply in English.
- NEVER use exclamation marks. Use periods only.
- No greetings, no filler, no disclaimers.
- For pain questions: say "consult your therapist" and nothing else.
- When session data is provided, reference specific numbers (ROM, symmetry %, reps) in your feedback.
- Give actionable form corrections based on the data."""

LIVE_COACH_PROMPT = """You are a real-time exercise coach. The user's message starts with [SESSION DATA: ...] or [I am doing ...].
You MUST follow these rules strictly:

1. Reply in 2-3 sentences. Never use exclamation marks, only periods.
2. Reply ONLY in the language the user writes in after the brackets.
3. If SESSION DATA is provided, you MUST quote the exact numbers from it. Example: "Your left knee ROM is 95 degrees" or "You have done 5 reps so far with 82% symmetry."
4. Do NOT invent or assume any numbers. If the data says 0 reps, say 0 reps. If symmetry is 100%, say symmetry is excellent.
5. If no scores are available yet, give general form tips for that exercise only.
6. If compensations are listed, name them and give a correction cue.
7. No greetings, no filler, no "great job" without reason."""


async def chat(message: str, session_context: dict | None = None, conversation_id: str | None = None) -> tuple[str, str]:
    """Send a chat message to Fanar with conversation history. Returns (response, conversation_id)."""
    conversation_id, history = get_or_create_conversation(conversation_id)

    messages = [{"role": "system", "content": COACH_SYSTEM_PROMPT}]

    if session_context:
        parts = [f"Exercise: {session_context.get('exercise_type', 'unknown')}"]
        parts.append(f"Reps: {session_context.get('reps', 0)}")
        rom = session_context.get('max_rom', {})
        if rom:
            parts.append(f"Max ROM: {', '.join(f'{k}: {v}°' for k, v in rom.items())}")
        sym = session_context.get('symmetry')
        if sym is not None:
            parts.append(f"Symmetry: {sym}%")
        comp = session_context.get('compensations', 0)
        if comp > 0:
            parts.append(f"Compensations: {comp}")
        context_msg = "Session data:\n" + "\n".join(parts) + "\nOnly reference these exact numbers."
        messages.append({"role": "system", "content": context_msg})

    messages.extend(history[-MAX_HISTORY:])
    messages.append({"role": "user", "content": message})

    response = await _client.post(
        "/chat/completions",
        json={
            "model": MODEL_NAME,
            "messages": messages,
            "max_tokens": 250,
            "temperature": 0.4,
        },
    )
    response.raise_for_status()
    data = response.json()
    reply = data["choices"][0]["message"]["content"].replace("!", ".")

    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": reply})

    return reply, conversation_id


async def chat_stream(message: str, session_context: dict | None = None, conversation_id: str | None = None):
    """Stream live coach response sentence by sentence. Returns sentences, then stores history."""
    conversation_id, history = get_or_create_conversation(conversation_id)

    messages = [{"role": "system", "content": LIVE_COACH_PROMPT}]

    if session_context:
        exercise = session_context.get('exercise_type', 'unknown')
        reps = session_context.get('reps', 0)
        rom = session_context.get('max_rom', {})
        sym = session_context.get('symmetry')
        comp = session_context.get('compensations', 0)
        comp_types = session_context.get('compensation_types', [])

        has_data = reps > 0 or bool(rom)

        if has_data:
            data_lines = [f"Exercise: {exercise}", f"Reps completed: {reps}"]
            if rom:
                data_lines.append("Max ROM: " + ", ".join(f"{k.replace('_', ' ')}: {v:.0f}°" for k, v in rom.items()))
            if isinstance(sym, dict) and sym.get('overall_score') is not None:
                data_lines.append(f"Symmetry score: {sym['overall_score']}%")
            if comp > 0:
                data_lines.append(f"Compensations: {comp}" + (f" ({', '.join(comp_types)})" if comp_types else ""))
            message = "[SESSION DATA: " + " | ".join(data_lines) + "]\n" + message
        else:
            message = f"[I am doing {exercise}. I just started, no scores yet.]\n" + message

    messages.extend(history[-MAX_HISTORY:])
    messages.append({"role": "user", "content": message})

    async with _client.stream(
        "POST",
        "/chat/completions",
        json={
            "model": MODEL_NAME,
            "messages": messages,
            "max_tokens": 250,
            "temperature": 0.4,
            "stream": True,
        },
    ) as response:
        response.raise_for_status()
        buffer = ""
        async for line in response.aiter_lines():
            if not line.startswith("data: "):
                continue
            data = line[6:]
            if data == "[DONE]":
                if buffer.strip():
                    yield buffer.replace("!", ".").strip()
                return
            import json as _json
            try:
                chunk = _json.loads(data)
            except Exception:
                continue
            delta = chunk.get("choices", [{}])[0].get("delta", {})
            token = delta.get("content", "")
            if not token:
                continue
            buffer += token
            # Yield on sentence boundaries for progressive TTS
            for sep in [".", "?", "。", "؟"]:
                if sep in buffer:
                    parts = buffer.split(sep, 1)
                    sentence = (parts[0] + sep).replace("!", ".").strip()
                    buffer = parts[1]
                    if sentence:
                        yield sentence


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


async def text_to_speech(text: str, voice: str = "Jake") -> bytes:
    """Convert text to speech using Fanar TTS."""
    response = await _client.post(
        "/audio/speech",
        json={
            "input": text,
            "model": "Fanar-Aura-TTS-2",
            "voice": voice,
            "response_format": "mp3",
        },
    )
    response.raise_for_status()
    return response.content
