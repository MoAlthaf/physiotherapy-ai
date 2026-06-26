# PhysioAI - Hackathon Progress Tracker

**Deadline:** Friday 2026-06-26 midnight (before Saturday)
**Team:** 2-3 people
**Stack:** Next.js (frontend) + FastAPI (backend) + MediaPipe (CV) + Fanar API (LLM/TTS/STT)

---

## Fanar API Capabilities (verified)

| Feature | Endpoint | Model |
|---------|----------|-------|
| Chat/LLM | `POST /v1/chat/completions` | Fanar-C-2-27B |
| TTS | `POST /v1/audio/speech` | Fanar-Aura-TTS-2, voice: Jake (M, American) |
| STT | `POST /v1/audio/transcriptions` | Fanar-Aura-STT-1 |
| Image Gen | `POST /v1/images/generations` | Fanar-Oryx-IG-2 |
| Translation | `POST /v1/translations` | Fanar-Shaheen-MT-1 |
| Moderation | `POST /v1/moderations` | FanarGuard |

**No real-time ASR/WebSocket.** Voice interaction uses batch STT + TTS.

---

## Priority Phases (Hackathon Order)

### PHASE 1 - Skeleton + Pose Detection [DONE]
- [x] MediaPipe Tasks API setup
- [x] Pose landmarker model (`pose_landmarker.task`)
- [x] FastAPI backend endpoint (webcam frame in -> landmarks out)
- [x] Return structured landmark JSON from API
- [x] Live skeleton overlay on webcam feed (frontend)

### PHASE 2 - Biomechanics Engine [DONE]
- [x] `calculate_joint_angle(a, b, c)` — generic 3-point angle function
- [x] Joint angle functions: knee, elbow, shoulder, hip
- [x] Return structured JSON: `{"left_knee": 95, "right_knee": 110, ...}`
- [x] Visibility gating — skip angles when landmarks have low confidence (<0.5)
- [x] Low-visibility warnings returned to frontend

### PHASE 3 - ROM (Range of Motion) Tracking [DONE]
- [x] Track max angle per joint during a session
- [x] Store ROM per exercise session
- [x] ROM output per exercise

### PHASE 4 - Exercise Detection + Rep Counting [DONE]
- [x] Exercise profiles defined (squat, shoulder_abduction, shoulder_flexion, leg_raise, knee_flexion)
- [x] Each profile: expected angles, movement pattern, compensation rules
- [x] Rep counter based on angle state machine (up/down transitions)
- [x] Session metrics: reps, rom, symmetry, compensations
- [x] Skip rep counting when primary joint not visible

### PHASE 5 - Symmetry Analysis [DONE]
- [x] Compare left vs right ROM
- [x] Symmetry score 0-100
- [x] Overall symmetry score in session data

### PHASE 6 - Compensation Detection [DONE]
- [x] Rule-based: torso lean, hip hike, etc.
- [x] Per-exercise compensation rules
- [x] Flag compensations in session output
- [x] Track compensation types in session

### PHASE 7 - Fanar Coach Agent [DONE]
- [x] Coach chatbot with text input (`/coach` page)
- [x] Voice interaction: STT (record) -> Fanar chat -> TTS (play back)
- [x] Live voice coach during exercise sessions (wake word: "hey coach")
- [x] Streaming chat responses with progressive TTS (sentence-by-sentence)
- [x] Separate prompts for chatbot vs live coach
- [x] Session data injected into coach context (reps, ROM, symmetry, compensations)
- [x] Anti-hallucination: conditional data injection, low temperature (0.4)
- [x] Bilingual support (English + Arabic auto-detect)
- [x] No exclamation marks in responses (TTS sounds better)

### PHASE 8 - Frontend (Next.js) [DONE]
- [x] Project setup (Next.js + Tailwind)
- [x] Webcam capture component
- [x] Live skeleton overlay on video
- [x] Exercise session page (select exercise, start/stop, see metrics)
- [x] Real-time metrics display (reps, ROM, symmetry, compensations)
- [x] Low-visibility warning banner
- [x] AI summary at session end
- [x] Chat/voice coach interface
- [x] Navbar with navigation
- [x] Dashboard page with charts (recharts)

### PHASE 9 - Database + Session History [PARTIAL]
- [x] In-memory session storage (sufficient for demo)
- [x] Dashboard fetches past sessions
- [ ] Persistent storage (SQLite/JSON) — NOT needed for hackathon demo

---

## Known Issues / Can Improve Today

### Bugs
- [ ] Home page "Start a Session" and "Talk to Coach" buttons may not navigate (suspected browser cache / hydration issue — code is correct)

### Polish for Demo
- [ ] Test voice coach wake word detection with real users
- [ ] End-to-end demo flow: home -> select exercise -> do reps -> get AI summary -> check dashboard
- [ ] Verify AI summary references real scores (not hallucinated)
- [ ] Test Arabic voice interaction
- [ ] Make sure squat and shoulder exercises work perfectly (hackathon focus)

### Nice-to-Have (if time permits)
- [ ] Dashboard ROM trend chart with real session data
- [ ] Better error states (backend down, camera denied)
- [ ] Landing page hero improvements

---

## Not in Scope for Hackathon (Future)
- Pain estimation (facial expressions, hesitation)
- Injury risk detection (ML-based)
- Recovery prediction
- Digital twin
- Multi-camera setup
- Therapist portal / EMR integration
- Persistent database (SQLite/Postgres)
