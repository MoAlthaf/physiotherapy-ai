from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import pose, exercise, chat, voice

app = FastAPI(
    title="PhysioAI",
    description="AI-powered physiotherapy assistant with pose detection and coaching",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pose.router)
app.include_router(exercise.router)
app.include_router(chat.router)
app.include_router(voice.router)


@app.get("/")
async def root():
    return {"message": "PhysioAI API", "version": "0.1.0"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
