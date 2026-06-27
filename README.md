# Kinetra — AI-Powered Home Physiotherapy Platform

> Built for the Fanar AI Hackathon · June 2026

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Solution Architecture](#3-solution-architecture)
4. [Agentic Workflow Design](#4-agentic-workflow-design)
5. [Use of Fanar and External Tools](#5-use-of-fanar-and-external-tools)
6. [Recommendations for Future Fanar Improvements](#6-recommendations-for-future-fanar-improvements)
7. [Getting Started](#7-getting-started)

---

## 1. Problem Statement

Home-based physiotherapy suffers from a fundamental supervision gap. Once patients leave the clinic, they are handed a sheet of exercises and left to manage their own recovery. This creates several compounding problems:

- **No form feedback.** Patients cannot tell if they are executing exercises correctly. Compensatory movement patterns — torso lean, shoulder hiking, knee valgus — develop silently and reinforce injury rather than healing it.
- **No personalisation.** Standardised exercise programmes do not adapt to a patient's current range of motion, strength, or pain level. A programme prescribed on day one may be too aggressive or too passive by week three.
- **No engagement.** Without accountability or interactive feedback, adherence drops sharply. Patients skip sessions, reduce effort, or stop altogether.
- **No progress visibility.** Without measurement, neither the patient nor the therapist can see whether range of motion is improving, whether compensations are diminishing, or whether the programme needs adjustment.

The result is slower recovery, higher re-injury rates, and a costly return to in-clinic care — all of which could be prevented with continuous, personalised supervision.

---

## 2. Solution Overview

**Kinetra** is an AI-powered home physiotherapy platform that brings real-time clinical supervision into the living room. It combines computer-vision pose tracking with a conversational AI coach to give patients the guidance of a physiotherapist during every repetition.

The platform operates through two tightly integrated modules:

| Module | Function |
|--------|----------|
| **Exercise Monitor** | Webcam-based body tracking; measures joint angles, ROM, rep count, symmetry, and compensation patterns in real time. |
| **AI Coach** | Bilingual conversational agent (English + Arabic) that interprets movement data, answers patient questions, gives spoken cues, and generates session summaries. |

A patient's typical session:

1. Open Kinetra, select a workout package (Arms & Shoulders, Torso & Core, or Legs & Hips).
2. Review the exercise instructions and set target reps and sets.
3. Step in front of the webcam and begin. Kinetra tracks every movement, overlays the detected skeleton on-screen, and counts reps automatically.
4. If the Voice Coach is on, Kinetra listens for **"Hey Coach"** — the patient can ask questions or request feedback hands-free at any moment.
5. After each set, the coach speaks a personalised comment citing the actual performance numbers (reps completed, symmetry %, compensations detected).
6. After all exercises, the platform generates a written AI session report and a per-exercise breakdown.

---

## 3. Solution Architecture

### 3.1 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) · Tailwind CSS · Recharts |
| Backend | FastAPI (Python 3.11) · Uvicorn |
| Computer Vision | Google MediaPipe Tasks (Pose Landmarker) |
| AI / LLM | Fanar API (LLM · TTS · STT) |
| Storage | In-memory session store (demo scope) |
| Browser APIs | Web Speech API (wake-word), Web Audio API (silence detection), MediaStream |

### 3.2 Backend Service Layer

```
backend/
├── main.py                     FastAPI app, CORS, router registration
├── routers/
│   ├── pose.py                 Raw pose detection endpoint
│   ├── exercise.py             Session lifecycle + AI summary
│   ├── chat.py                 Coach chat (batch + streaming SSE)
│   └── voice.py                STT upload + TTS playback endpoints
├── services/
│   ├── biomechanics.py         Joint-angle calculation (8 joints + torso)
│   ├── compensation.py         Rule-based form-fault detection
│   ├── rep_counter.py          Angle-state-machine rep counting
│   ├── rom.py                  Per-joint range-of-motion tracking
│   ├── symmetry.py             Exercise-aware bilateral symmetry scoring
│   ├── session_manager.py      ExerciseSession orchestration
│   ├── exercise_profiles.py    Exercise + package definitions
│   └── fanar_client.py         Fanar LLM / TTS / STT client
└── db/
    └── storage.py              In-memory session + frame store
```

### 3.3 Computer Vision Pipeline

Each video frame captured by the browser is JPEG-encoded and sent as Base64 to `POST /api/exercise/{session_id}/frame`. The backend runs the following pipeline synchronously per frame:

```
Raw frame (Base64)
    │
    ▼
MediaPipe Pose Landmarker
    │   Returns 33 body landmarks (x, y, z, visibility) per person
    ▼
Visibility Gating
    │   Landmarks below 0.5 confidence are excluded from all calculations
    ▼
Biomechanics Engine  ──────────────────────────────────────────────────────
    │  calculate_all_angles()                                              │
    │  ├─ 8 standard joint angles (shoulders, elbows, hips, knees)        │
    │  └─ 2 torso angles                                                   │
    │      ├─ torso_lateral  (trunk side-bend from vertical, image-plane) │
    │      └─ torso_rotation (shoulder-depth asymmetry proxy)             │
    ▼                                                                      │
ROM Tracker          updates per-joint max and current range of motion     │
    │                                                                      │
    ▼                                                                      │
Rep Counter          angle state machine: up_threshold → down_threshold   │
    │                counts one rep per full cycle                         │
    ▼                                                                      │
Symmetry Scorer      exercise-aware: only scores the joint pairs           │
    │                relevant to the current exercise (e.g. knees for     │
    │                squat, shoulders for abduction). Tolerance-banded     │
    │                scoring gives small natural L/R differences ~100%.    │
    │                Also checks shoulder and hip levelness.              │
    ▼                                                                      │
Compensation Detector  rule-based checks                                   │
    │  ├─ torso_lateral_lean   (mid-shoulder vs mid-hip x-offset)        │
    │  ├─ torso_forward_lean   (depth asymmetry)                          │
    │  ├─ shoulder_hiking      (shoulder exercises only)                  │
    │  ├─ knee_valgus          (squat / knee exercises)                   │
    │  └─ hip_drop             (single-leg exercises)                     │
    ▼
JSON response → frontend renders skeleton overlay + metrics panel
```

### 3.4 Exercise Profiles

Kinetra ships with **9 clinically relevant exercises** grouped into **3 workout packages**:

| Package | Exercises |
|---------|-----------|
| **Arms & Shoulders** | Shoulder Abduction · Shoulder Flexion · Elbow Flexion |
| **Torso & Core** | Standing Side Bend · Standing Trunk Rotation · Standing Knee Raise |
| **Legs & Hips** | Squat · Knee Flexion · Straight Leg Raise |

Each profile specifies the primary tracked joint, angle thresholds for rep detection (up/down), which joint pairs are scored for symmetry, per-exercise compensation rules, difficulty, muscles targeted, step-by-step instructions, and form tips.

### 3.5 Session Lifecycle

```
POST /api/exercise/start          → creates ExerciseSession (UUID), registers in store
POST /api/exercise/{id}/frame     → per-frame analysis, updates DB on every 5th frame
POST /api/exercise/{id}/end       → finalises session, returns summary metrics
POST /api/exercise/{id}/ai-summary → calls Fanar LLM with session data → written report
POST /api/exercise/{id}/coach-comment → short spoken cue for TTS after each set/exercise
```

### 3.6 Frontend Flow

```
/sessions         Exercise catalogue + package grid
    │
    ▼
/sessions/[id]    Single exercise
/sessions/package/[id]  Package (sequences exercises)
    │
    ▼
PackageRunner     owns voice coach, set/rest transitions, inter-exercise TTS
    └─ ExerciseRunner (per exercise)
           ├─ ReadyScreen   instructions + rep/set sliders + 3-2-1 countdown
           ├─ ActiveSession webcam + skeleton overlay + MetricsPanel
           └─ RestScreen    60s countdown + Skip button between sets
```

---

## 4. Agentic Workflow Design

Kinetra's AI Coach is an agentic system that continuously monitors context, decides when and what to say, routes between input modes, and enforces its own safety constraints — without requiring the user to explicitly request feedback.

### 4.1 The Coach Agent

The coach has two distinct operational modes, each with its own system prompt:

**Chatbot mode** (`COACH_SYSTEM_PROMPT`): used on the `/coach` page and for direct queries. The agent replies in 2–4 sentences, language-matches the user (English or Arabic), cites exact session numbers when context is present, and refers pain questions to the therapist without elaborating.

**Live exercise mode** (`LIVE_COACH_PROMPT`): used during sessions. The agent receives a structured data packet prepended to every message — `[SESSION DATA: exercise | reps | ROM | symmetry | compensation_types]` — and is instructed to quote those exact numbers. It never invents figures. If no data has accumulated yet, it signals `[I am doing X. I just started]` so the agent knows to give general cues only.

### 4.2 Input Safety Classification

Before any user message reaches the language model, it passes through a content safety layer powered by **FanarGuard** (Fanar Moderation API). The classifier evaluates the prompt against predefined risk labels:

- Non-health-related content
- Harmful medical advice
- Offensive or unsafe content
- Prompt injection attempts
- Dangerous or out-of-scope instructions

Each label carries its own confidence threshold. If any score exceeds its threshold, the LLM is informed which rule was violated and responds with a polite refusal. Prompts that pass all checks proceed to the language model with the injected session context.

### 4.3 Voice Interaction Pipeline

```
Browser (always listening at low cost)
    │
    │  Web Speech API — continuous wake-word detector
    │  Listens for: "Hey Coach"
    │  Uses a fresh SpeechRecognition instance per detection cycle
    │  (previous approach: a second parallel recogniser caused interference)
    ▼
Wake word detected → UI shows "Listening…"
    │
    │  Browser MediaRecorder records user's command (≤8s)
    │  Silence detected via Web Audio AnalyserNode on the same stream
    │  (single mic consumer — no fighting between recognisers)
    ▼
Audio blob POSTed to POST /api/voice/stt
    │
    │  Fanar Aura-STT-1 transcribes audio → plain text
    ▼
Transcript + live session context → POST /api/chat/stream/{session_id}
    │
    │  Fanar-C-2-27B generates response with streaming enabled
    │  Response streamed as SSE (Server-Sent Events)
    │  Backend yields each sentence as a separate SSE event
    │  (splits on: . ? 。 ؟)
    ▼
Per-sentence loop:
    │  Sentence arrives → POST /api/voice/tts → Fanar Aura-TTS-2
    │  Audio plays immediately while next sentence is still generating
    │  (progressive TTS — no waiting for the full response)
    ▼
Coach re-arms wake-word listener → back to listening state
```

This pipeline gives near-real-time voice interaction despite the API being batch-based (no WebSocket ASR). The sentence-boundary streaming means the user hears the first sentence within ~1–2 seconds of asking.

### 4.4 Proactive Coaching (Compensation Persistence)

The coach also speaks without being asked. During a set, Kinetra tracks every detected compensation (torso lean, shoulder hike, knee valgus, hip drop) across frames. A compensation is only spoken aloud when:

1. The same fault has been continuously detected for **≥ 4 seconds** (configurable via `COMPENSATION_PERSIST_MS`).
2. Gaps shorter than 1.5 seconds do not reset the streak (accommodating low-fps pose detection).
3. Each fault type is spoken only once per streak — no repetitive nagging.
4. Voice must be enabled by the user.

This mirrors what a physiotherapist does: wait to see if the patient self-corrects before intervening, then give one clear cue.

### 4.5 Post-Set and Post-Exercise Coaching

After each set and after each exercise, the coach generates a personalised spoken comment:

```
Set/exercise ends
    │
    ▼
POST /api/exercise/{session_id}/coach-comment
    │   Reads accumulated session metrics (reps, ROM, symmetry, compensations)
    │   Sends a structured prompt to Fanar-C-2-27B:
    │     "Say one or two short sentences citing a real number and one cue."
    ▼
Response spoken via TTS
    │   Fallback: if the LLM endpoint fails, a static spoken line plays
    │   (the coach is never silently absent)
    ▼
Next set's rest timer begins / next exercise loads
```

Coach text is never displayed on screen — only the user's own spoken transcript is shown. The coach communicates exclusively through voice.

### 4.6 Conversation Memory

The chat agent maintains rolling conversation history (up to 20 turns) keyed by a `conversation_id`, implemented in `fanar_client.py`. For voice sessions, the session ID doubles as the conversation ID so that context persists across multiple "Hey Coach" interactions within the same exercise.

---

## 5. Use of Fanar and External Tools

### 5.1 Fanar API Services Used

| Service | Model | How Used |
|---------|-------|----------|
| **Chat / LLM** | `Fanar-C-2-27B` | Coach responses (text and voice), AI session summaries, between-set comments. Temperature set to 0.4 for consistent, grounded output. |
| **Text-to-Speech** | `Fanar-Aura-TTS-2` (voice: Jake) | Converts every coach response to spoken audio. All text is cleaned through `_clean_for_tts()` before sending — strips `!` and `！` to prevent emphatic TTS artifacts. |
| **Speech-to-Text** | `Fanar-Aura-STT-1` | Transcribes the user's recorded voice commands (WAV) to text. Supports bilingual input: Arabic and English auto-detected. |
| **Content Moderation** | `FanarGuard` | Pre-LLM safety classifier. Evaluates every user message for harmful intent, off-topic requests, and prompt injection before it reaches the language model. |
| **Agentic Model** | `Fanar-Sadiq-Agentic` | Referenced in the client for advanced task-routing scenarios. |

### 5.2 Anti-Hallucination Design

A deliberate choice was made to prevent the LLM from generating plausible-sounding but fabricated health numbers:

- **Conditional data injection.** Session data is only injected into the system context when at least one rep has been completed or ROM data exists. If the session has just started, the prompt says `[I just started, no scores yet]` and the agent defaults to general form tips.
- **Explicit grounding instructions.** Every LLM prompt that receives session data ends with "Use ONLY the numbers below. Do not invent or assume any numbers." The live-coach prompt reinforces this with examples.
- **Low temperature (0.4).** Reduces creative variation in numerical claims.
- **Evaluation ranges baked in.** The AI summary prompt tells the model what "good" and "needs work" means for each metric (e.g. symmetry above 85% is good; knee ROM below 70° means shallow squats). The model evaluates against these ranges rather than guessing.

### 5.3 External Tools and Libraries

| Tool | Purpose |
|------|---------|
| **Google MediaPipe Tasks** (`@mediapipe/tasks-vision`) | Body landmark detection. The Pose Landmarker model returns 33 landmarks (x, y, z + visibility) per frame at ~5 fps from a compressed JPEG stream. |
| **NumPy** | 3D joint angle calculation using dot-product cosine formula; torso angle geometry. |
| **Web Speech API** | Browser-native wake-word detection for "Hey Coach". Runs continuously in the background when Voice Coach is enabled. |
| **Web Audio API (AnalyserNode)** | Silence detection during command recording. Uses the same mic stream as the recorder — single consumer avoids device-conflict bugs. |
| **Next.js 14 App Router** | Frontend framework. Server Components used for static pages (zero client hydration surface); `"use client"` used only where interactivity is required. |
| **Recharts** | Dashboard ROM trend charts and session-history visualisation. |
| **Tailwind CSS** | UI styling, dark mode, responsive layout. |
| **httpx (async)** | FastAPI backend HTTP client for all Fanar API calls; single shared `AsyncClient` instance with 60s timeout and Bearer auth. |

---

## 6. Recommendations for Future Fanar Improvements

Through building and iterating on Kinetra, we identified several areas where Fanar API enhancements would meaningfully improve real-time physiotherapy applications — and likely many other conversational AI products.

### 6.1 Real-Time Streaming ASR (WebSocket)

**Current limitation:** Fanar-Aura-STT-1 is a batch API — the entire audio clip must be recorded and uploaded before transcription begins. For a physiotherapy coach, this introduces a 1–3 second silence-detection delay before the user's words are even sent.

**Recommendation:** Expose a WebSocket-based streaming ASR endpoint that transcribes as the user speaks (partial transcripts). This would cut perceived latency in half, enable interrupt-based interactions ("Hey Coach, stop"), and allow the system to act on shorter utterances without requiring silence detection.

### 6.2 Streaming TTS (Chunked Audio)

**Current limitation:** Fanar-Aura-TTS-2 returns a complete MP3 after synthesising the full input text. We work around this by splitting the LLM's response into sentences and making one TTS request per sentence. This works, but each sentence incurs a full round-trip (LLM token → SSE → client → TTS request → audio playback), adding 0.5–1.5 seconds between sentences.

**Recommendation:** Support a streaming TTS endpoint that accepts text incrementally and emits audio chunks (e.g. chunked MP3 or PCM over WebSocket) as synthesis proceeds. This would eliminate the sentence-splitting workaround and allow seamless, natural-sounding speech with no audible gaps between sentences.

### 6.3 Bilingual TTS Voice Selection

**Current limitation:** The Jake voice is an American English voice. When the coach speaks Arabic (which Kinetra supports, since Fanar-C-2-27B can respond in Arabic), the voice sounds unnatural — prosody, emphasis, and phonology are mismatched.

**Recommendation:** Expose an Arabic-native voice option in Fanar-Aura-TTS-2. A Gulf-dialect Arabic voice would dramatically improve the Arabic experience and is well within Fanar's regional focus. Ideally, expose both a male and female option so applications can match the voice to the user's preference.

### 6.4 Domain-Specific Fine-Tuning for Healthcare

**Current limitation:** General-purpose LLMs occasionally drift toward overly cautious medical disclaimers ("consult a doctor") even for benign physiotherapy questions like "how high should I raise my arm?". We address this through system-prompt engineering, but it is a constant tension.

**Recommendation:** Offer a Fanar-Healthcare model variant fine-tuned on physiotherapy, sports medicine, and rehabilitation literature. This would reduce the need for elaborate system prompts to keep the model in scope, improve accuracy of exercise-specific guidance, and give healthcare-adjacent applications a trustworthy foundation without requiring each team to engineer around generic caution.

### 6.5 Moderation API — Finer Label Granularity

**Current limitation:** FanarGuard provides safety classification, but the label schema is relatively coarse. For physiotherapy applications, the most useful distinction is between "safe rehabilitation question" and "medical diagnosis request" — a nuance that generic safety labels do not capture well.

**Recommendation:** Allow applications to define custom intent labels (or provide domain-specific moderation profiles). A healthcare profile that distinguishes "safe exercise guidance", "symptom diagnosis request", "emergency", and "off-topic" would let applications enforce appropriate scope without writing increasingly complex system prompts.

### 6.6 Reduced Cold-Start Latency

**Current limitation:** First requests to Fanar endpoints after periods of inactivity exhibit noticeably higher latency than subsequent requests. In a live exercise session where the coach should respond within 2 seconds of "Hey Coach", cold-start delays are user-visible.

**Recommendation:** Provide a "keepalive" or "warm" flag on API requests, or expose a lightweight `/ping` endpoint that applications can call between user interactions to keep the inference infrastructure warm. Alternatively, offer session-affinity connections so that a conversation ID routes to a pre-warmed instance.

---

## 7. Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Fanar API key (set in `.env`)

### Backend

```bash
cd backend
pip install -r requirements.txt

# Create a .env file:
echo "API_KEY=your_fanar_key_here" > .env

# Start the server
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:3000
```

### MediaPipe Model

Download the pose landmarker model and place it at:

```
backend/models/pose_landmarker.task
```

Available from the [MediaPipe Models page](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker).

---

## Project Structure

```
physiotherapy-ai/
├── backend/           FastAPI backend (Python)
├── frontend/          Next.js frontend (TypeScript)
│   ├── app/           Pages (App Router)
│   ├── components/    UI components (ExerciseRunner, PackageRunner, WebcamCapture…)
│   ├── hooks/         useVoiceCoach
│   └── lib/           API client (api.ts)
└── README.md
```

---

*Kinetra — bringing clinical supervision home, one rep at a time.*
