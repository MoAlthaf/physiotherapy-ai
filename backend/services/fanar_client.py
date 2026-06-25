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


COACH_SYSTEM_PROMPT = """You are PhysioAI Coach. Reply in 1-2 short sentences MAX. Be direct.
Rules:
- Reply ONLY in the language the user speaks. If they speak Arabic, reply in Arabic. If English, reply in English.
- Never mix languages.
- No greetings, no filler, no disclaimers.
- For pain questions: say "consult your therapist" and nothing else.
- Use session data to give specific, actionable form feedback."""

LIVE_COACH_PROMPT = """You are a live exercise coach watching the user work out RIGHT NOW. Talk like a gym bro coach — short, hype, direct.
Rules:
- 1 sentence MAX. Keep it under 15 words.
- Reply ONLY in the language the user speaks.
- Reference their ACTUAL numbers: reps, ROM angles, symmetry %, compensations.
- If they ask about form: give ONE specific cue based on the data.
- If symmetry < 70%: call it out. If compensations > 0: tell them what to fix.
- No greetings, no "great question", no filler. Just coach."""


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
            "max_tokens": 150,
            "temperature": 0.7,
        },
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


async def chat_stream(message: str, session_context: dict | None = None):
    """Stream live coach response sentence by sentence."""
    messages = [{"role": "system", "content": LIVE_COACH_PROMPT}]

    if session_context:
        sym = session_context.get('symmetry')
        sym_str = f"{sym.get('overall_score', 'N/A')}%" if isinstance(sym, dict) else str(sym)
        rom = session_context.get('max_rom', {})
        rom_str = ", ".join(f"{k}: {v:.0f}°" for k, v in rom.items()) if rom else "none yet"
        comp = session_context.get('compensations', 0)
        comp_types = session_context.get('compensation_types', [])
        comp_str = f"{comp} ({', '.join(comp_types)})" if comp_types else str(comp)
        context_msg = f"LIVE DATA — exercise: {session_context.get('exercise_type', 'unknown')}, reps: {session_context.get('reps', 0)}, ROM: [{rom_str}], symmetry: {sym_str}, compensations: {comp_str}"
        messages.append({"role": "system", "content": context_msg})

    messages.append({"role": "user", "content": message})

    async with _client.stream(
        "POST",
        "/chat/completions",
        json={
            "model": MODEL_NAME,
            "messages": messages,
            "max_tokens": 150,
            "temperature": 0.7,
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
                    yield buffer.strip()
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
            for sep in [".", "!", "?", "。", "؟"]:
                if sep in buffer:
                    parts = buffer.split(sep, 1)
                    sentence = parts[0] + sep
                    buffer = parts[1]
                    if sentence.strip():
                        yield sentence.strip()


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
