# PhysioAI - System Architecture

## Overview

```
[Next.js Frontend]  <-->  [FastAPI Backend]  <-->  [Fanar API]
       |                        |
   Webcam Feed            MediaPipe Pose
   Dashboard              Biomechanics Engine
   Chat/Voice UI          Exercise Profiles
                          Session Storage
```

## Backend (FastAPI)

```
backend/
  main.py                  # FastAPI app, CORS, routes
  routers/
    pose.py                # POST /api/pose — frame in, landmarks + angles out
    exercise.py            # POST /api/exercise/start, /stop, /status
    chat.py                # POST /api/chat — Fanar coach chatbot
    voice.py               # POST /api/voice/stt, /api/voice/tts
  services/
    pose_service.py        # MediaPipe landmarker wrapper
    biomechanics.py        # Joint angle calculations
    rom.py                 # ROM tracking per session
    symmetry.py            # Left/right comparison
    compensation.py        # Rule-based compensation detection
    exercise_profiles.py   # Exercise definitions (squat, shoulder flex, etc.)
    rep_counter.py         # State machine for rep counting
    fanar_client.py        # Fanar API wrapper (chat, STT, TTS)
  models/
    schemas.py             # Pydantic models for request/response
  db/
    storage.py             # Simple session storage (SQLite/JSON)
```

## Frontend (Next.js)

```
frontend/
  app/
    page.tsx               # Landing / exercise selection
    exercise/
      page.tsx             # Live exercise session (webcam + metrics)
    dashboard/
      page.tsx             # ROM trends, symmetry charts
    coach/
      page.tsx             # Chat + voice coach interface
  components/
    WebcamCapture.tsx      # Webcam stream, sends frames to backend
    SkeletonOverlay.tsx    # Draw landmarks on canvas over video
    MetricsPanel.tsx       # Live ROM, reps, symmetry display
    ChatInterface.tsx      # Text chat with Fanar coach
    VoiceButton.tsx        # Push-to-talk for STT/TTS
  lib/
    api.ts                 # Fetch wrappers for backend endpoints
```

## Data Flow

### Exercise Session
1. Frontend captures webcam frame (base64/blob)
2. Sends to `POST /api/pose`
3. Backend runs MediaPipe -> landmarks
4. Biomechanics engine calculates joint angles
5. ROM tracker updates max angles
6. Rep counter checks state transitions
7. Symmetry + compensation checked
8. Returns JSON: landmarks, angles, reps, ROM, symmetry, compensations
9. Frontend renders skeleton overlay + live metrics

### Coach Interaction
1. User types or speaks (STT via Fanar)
2. Message + current session metrics sent to `POST /api/chat`
3. Backend builds prompt with biomechanics context
4. Fanar-Sadiq-Agentic generates coaching response
5. Response returned as text (+ optionally TTS audio)

## Key Design Decisions
- MediaPipe runs server-side (FastAPI) not in browser — simpler, one dependency
- Batch STT/TTS (no WebSocket) — Fanar doesn't support real-time ASR
- SQLite for MVP storage — no external DB dependency
- Exercise profiles are config-driven — easy to add new exercises
