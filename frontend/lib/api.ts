const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  return res.json();
}

// Pose
export async function analyzePose(imageBase64: string) {
  return fetchAPI<PoseAnalysisResponse>("/api/pose/analyze", {
    method: "POST",
    body: JSON.stringify({ image: imageBase64 }),
  });
}

// Exercise
export async function listExercises() {
  return fetchAPI<Exercise[]>("/api/exercise/list");
}

export async function getExerciseDetail(exerciseId: string) {
  return fetchAPI<ExerciseDetail>(`/api/exercise/detail/${exerciseId}`);
}

export async function startExercise(exerciseType: string) {
  return fetchAPI<{ session_id: string; exercise_type: string }>(
    "/api/exercise/start",
    {
      method: "POST",
      body: JSON.stringify({ exercise_type: exerciseType }),
    }
  );
}

export async function processFrame(sessionId: string, imageBase64: string) {
  return fetchAPI<ExerciseFrameResponse>(
    `/api/exercise/${sessionId}/frame`,
    {
      method: "POST",
      body: JSON.stringify({ image: imageBase64 }),
    }
  );
}

export async function endExercise(sessionId: string) {
  return fetchAPI<SessionSummary>(`/api/exercise/${sessionId}/end`, {
    method: "POST",
  });
}

export async function getAISummary(sessionId: string) {
  return fetchAPI<{ summary: string }>(`/api/exercise/${sessionId}/ai-summary`, {
    method: "POST",
  });
}

export async function getSessionDetail(sessionId: string) {
  return fetchAPI<SessionRecord>(`/api/exercise/session/${sessionId}`);
}

export async function getSessionHistory(exerciseType?: string) {
  const query = exerciseType ? `?exercise_type=${exerciseType}` : "";
  return fetchAPI<SessionRecord[]>(`/api/exercise/history${query}`);
}

export async function getAllSessions() {
  return fetchAPI<SessionRecord[]>("/api/exercise/sessions");
}

// Chat
export async function sendChatMessage(message: string, sessionContext?: Record<string, unknown>) {
  return fetchAPI<{ response: string }>("/api/chat/", {
    method: "POST",
    body: JSON.stringify({ message, session_context: sessionContext }),
  });
}

export async function sendChatWithSession(sessionId: string, message: string) {
  return fetchAPI<{ response: string }>(`/api/chat/with-session/${sessionId}`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// Voice
export async function speechToText(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");
  const res = await fetch(`${API_BASE}/api/voice/stt`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("STT failed");
  const data = await res.json();
  return data.text;
}

export async function textToSpeech(text: string, voice: string = "Amelia"): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error("TTS failed");
  return res.blob();
}

// Types
export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface JointAngles {
  left_shoulder?: number;
  right_shoulder?: number;
  left_elbow?: number;
  right_elbow?: number;
  left_hip?: number;
  right_hip?: number;
  left_knee?: number;
  right_knee?: number;
}

export interface SymmetryResult {
  shoulder_score?: number;
  elbow_score?: number;
  hip_score?: number;
  knee_score?: number;
  overall_score: number;
}

export interface CompensationFlag {
  type: string;
  severity: string;
  message: string;
}

export interface PoseAnalysisResponse {
  landmarks: LandmarkPoint[][];
  joint_angles: JointAngles;
  symmetry: SymmetryResult | null;
  compensations: CompensationFlag[];
  rom: Record<string, number>;
}

export interface ExerciseFrameResponse {
  landmarks: LandmarkPoint[][];
  joint_angles: JointAngles;
  reps: number;
  current_rom: Record<string, number>;
  max_rom: Record<string, number>;
  symmetry: SymmetryResult | null;
  compensations: CompensationFlag[];
  phase: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  muscles: string[];
  duration_estimate: string;
}

export interface ExerciseDetail extends Exercise {
  instructions: string[];
  tips: string;
  tracked_joints: string[];
}

export interface SessionSummary {
  session_id: string;
  exercise_type: string;
  total_reps: number;
  max_rom: Record<string, number>;
  avg_symmetry: number;
  total_compensations: number;
}

export interface SessionRecord {
  id: string;
  exercise_type: string;
  total_reps: number;
  max_rom: Record<string, number>;
  avg_symmetry: number;
  total_compensations: number;
  started_at: string;
  ended_at: string | null;
}
