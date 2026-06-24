# PhysioAI - Hackathon Progress Tracker

**Deadline:** Friday 2026-06-26 midnight (before Saturday)
**Team:** 2-3 people
**Stack:** Next.js (frontend) + FastAPI (backend) + MediaPipe (CV) + Fanar API (LLM/TTS/STT)

---

## Fanar API Capabilities (verified)

| Feature | Endpoint | Model |
|---------|----------|-------|
| Chat/LLM | `POST /v1/chat/completions` | Fanar-C-2-27B, Fanar-Sadiq-Agentic |
| TTS | `POST /v1/audio/speech` | (see /v1/audio/voices) |
| STT | `POST /v1/audio/transcriptions` | Fanar-Aura-STT-1, Fanar-Aura-STT-LF-1 |
| Image Gen | `POST /v1/images/generations` | Fanar-Oryx-IG-2 |
| Translation | `POST /v1/translations` | Fanar-Shaheen-MT-1 |
| Moderation | `POST /v1/moderations` | FanarGuard |

**No real-time ASR/WebSocket.** Voice interaction uses batch STT + TTS.

---

## Priority Phases (Hackathon Order)

### PHASE 1 - Skeleton + Pose Detection [DONE - partial]
- [x] MediaPipe Tasks API setup
- [x] Pose landmarker model (`pose_landmarker.task`)
- [x] Basic Streamlit test with camera input
- [ ] Migrate to FastAPI backend endpoint (webcam frame in -> landmarks out)
- [ ] Return structured landmark JSON from API

### PHASE 2 - Biomechanics Engine (CRITICAL - build first)
- [ ] `calculate_joint_angle(a, b, c)` — generic 3-point angle function
- [ ] Joint angle functions: knee, elbow, shoulder, hip
- [ ] Return structured JSON: `{"left_knee": 95, "right_knee": 110, ...}`

### PHASE 3 - ROM (Range of Motion) Tracking
- [ ] Track max angle per joint during a session
- [ ] Store ROM per exercise session
- [ ] ROM output: `{"shoulder_flexion": 115}`

### PHASE 4 - Exercise Detection + Rep Counting
- [ ] Define exercise profiles (squat, shoulder abduction, shoulder flexion, leg raise, knee flexion)
- [ ] Each profile: expected angles, movement pattern, compensation rules
- [ ] Rep counter based on angle state machine (up/down transitions)
- [ ] Session metrics: `{"reps": 12, "rom": 105, "symmetry": 87, "compensation": 2}`

### PHASE 5 - Symmetry Analysis
- [ ] Compare left vs right ROM
- [ ] Speed difference (optional)
- [ ] Symmetry score 0-100

### PHASE 6 - Compensation Detection
- [ ] Rule-based: torso lean, hip hike, etc.
- [ ] Per-exercise compensation rules
- [ ] Flag compensations in session output

### PHASE 7 - Fanar Coach Agent (KEY differentiator for hackathon)
- [ ] Movement Analysis Agent — interprets biomechanics data
- [ ] Coach Agent — patient-facing, gives encouragement + feedback
- [ ] Use Fanar-Sadiq-Agentic model for agentic workflow
- [ ] Chatbot UI with text input
- [ ] Voice interaction: STT (record) -> Fanar chat -> TTS (play back)

### PHASE 8 - Frontend (Next.js)
- [ ] Project setup (Next.js + Tailwind)
- [ ] Webcam capture component (send frames to FastAPI)
- [ ] Live skeleton overlay on video
- [ ] Exercise session page (select exercise, start/stop, see metrics)
- [ ] Dashboard: ROM chart, symmetry score, compensation flags
- [ ] Chat/voice coach interface

### PHASE 9 - Database + Session History
- [ ] SQLite or simple JSON storage for MVP
- [ ] Store sessions, metrics per session
- [ ] Recovery trend (ROM over time chart)

---

## Suggested Work Split (2-3 people)

| Person | Focus |
|--------|-------|
| Person 1 (CV) | Phases 1-6: MediaPipe, biomechanics, ROM, symmetry, compensation |
| Person 2 (Frontend) | Phase 8: Next.js UI, webcam component, dashboard |
| Person 3 / shared | Phase 7: Fanar integration, coach agent, voice |

---

## Day-by-Day Plan

### Wednesday (Today - 2026-06-24)
- Set up FastAPI backend with pose detection endpoint
- Build biomechanics engine (joint angles)
- Set up Next.js frontend project
- Test Fanar API (chat + STT + TTS)

### Thursday (2026-06-25)
- ROM tracking + exercise profiles + rep counting
- Symmetry + compensation detection
- Frontend: webcam + skeleton overlay + exercise page
- Fanar coach agent integration

### Friday (2026-06-26)
- Dashboard with charts (ROM trend, symmetry)
- Voice coach (STT/TTS loop)
- Polish UI, fix bugs
- Test full demo flow end-to-end
- Record demo if needed

---

## Not in Scope for Hackathon (Future)
- Pain estimation (facial expressions, hesitation)
- Injury risk detection (ML-based)
- Recovery prediction
- Digital twin
- Multi-camera setup
- Therapist portal / EMR integration
