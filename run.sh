#!/bin/bash
# Run both backend and frontend in parallel

echo "Starting PhysioAI..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""

# Start backend
cd "$(dirname "$0")"
.venv/Scripts/python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "Press Ctrl+C to stop both servers"
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
