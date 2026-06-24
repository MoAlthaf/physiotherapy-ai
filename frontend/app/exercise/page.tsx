"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import WebcamCapture from "@/components/WebcamCapture";
import SkeletonOverlay from "@/components/SkeletonOverlay";
import MetricsPanel from "@/components/MetricsPanel";
import useVoiceCoach from "@/hooks/useVoiceCoach";
import {
  listExercises,
  startExercise,
  processFrame,
  endExercise,
  type Exercise,
  type ExerciseFrameResponse,
  type LandmarkPoint,
  type JointAngles,
  type SymmetryResult,
  type CompensationFlag,
} from "@/lib/api";
import { Play, Square, ChevronDown, Mic, MicOff, Volume2 } from "lucide-react";

export default function ExercisePage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [jointAngles, setJointAngles] = useState<JointAngles>({});
  const [maxRom, setMaxRom] = useState<Record<string, number>>({});
  const [symmetry, setSymmetry] = useState<SymmetryResult | null>(null);
  const [compensations, setCompensations] = useState<CompensationFlag[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachLog, setCoachLog] = useState<string[]>([]);
  const processingRef = useRef(false);

  const {
    voiceState,
    voiceEnabled,
    toggleVoice,
    transcript,
    coachMessage,
    announceCompensation,
  } = useVoiceCoach({
    sessionId,
    isActive,
    onCoachResponse: (text) => {
      setCoachLog((prev) => [...prev.slice(-4), text]);
    },
  });

  useEffect(() => {
    listExercises()
      .then((data) => {
        setExercises(data);
        if (data.length > 0) setSelectedExercise(data[0].id);
      })
      .catch(() => setError("Failed to load exercises. Is the backend running?"));
  }, []);

  const handleStart = async () => {
    if (!selectedExercise) return;
    try {
      const { session_id } = await startExercise(selectedExercise);
      setSessionId(session_id);
      setIsActive(true);
      setSummary(null);
      setCoachLog([]);
      setReps(0);
      setPhase("idle");
      setMaxRom({});
      setCompensations([]);
      setError(null);
    } catch (e) {
      setError(`Failed to start: ${e}`);
    }
  };

  const handleStop = async () => {
    setIsActive(false);
    if (sessionId) {
      try {
        const result = await endExercise(sessionId);
        setSummary(result as unknown as Record<string, unknown>);
      } catch {
        // Session may already be ended
      }
    }
    setSessionId(null);
    setLandmarks(null);
  };

  const handleFrame = useCallback(
    async (imageBase64: string) => {
      if (!sessionId || processingRef.current) return;
      processingRef.current = true;

      try {
        const data: ExerciseFrameResponse = await processFrame(sessionId, imageBase64);
        if (data.landmarks && data.landmarks[0]) {
          setLandmarks(data.landmarks[0]);
        }
        setReps(data.reps);
        setPhase(data.phase);
        setJointAngles(data.joint_angles);
        setMaxRom(data.max_rom);
        setSymmetry(data.symmetry);
        setCompensations(data.compensations);

        // Announce new compensations via TTS
        if (data.compensations && data.compensations.length > 0) {
          announceCompensation(data.compensations);
        }
      } catch {
        // Skip frame errors silently
      } finally {
        processingRef.current = false;
      }
    },
    [sessionId, announceCompensation]
  );

  const voiceStatusLabel = {
    idle: "Voice Off",
    listening_wake: "Say 'Hey Coach'",
    listening_command: "Listening...",
    processing: "Processing...",
    speaking: "Coach speaking...",
  }[voiceState];

  const voiceStatusColor = {
    idle: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    listening_wake: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    listening_command: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 animate-pulse",
    processing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    speaking: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  }[voiceState];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">Exercise Session</h1>
        <div className="flex items-center gap-2 ml-auto">
          {/* Voice toggle */}
          {isActive && (
            <button
              onClick={toggleVoice}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                voiceEnabled
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span className="hidden sm:inline">Voice Coach</span>
            </button>
          )}

          <div className="relative">
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              disabled={isActive}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium dark:border-gray-700 dark:bg-gray-900 disabled:opacity-50"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {!isActive ? (
            <button
              onClick={handleStart}
              disabled={!selectedExercise}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> Start
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Voice status bar */}
      {isActive && voiceEnabled && (
        <div className={`mb-4 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ${voiceStatusColor}`}>
          {voiceState === "listening_command" ? (
            <Mic className="h-4 w-4 animate-pulse" />
          ) : voiceState === "speaking" ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          <span>{voiceStatusLabel}</span>
          {transcript && voiceState === "processing" && (
            <span className="ml-auto text-xs opacity-70">You said: &ldquo;{transcript}&rdquo;</span>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Webcam + Skeleton */}
        <div className="lg:col-span-2">
          <div className="relative">
            <WebcamCapture
              onFrame={handleFrame}
              isCapturing={isActive}
              fps={5}
            />
            <SkeletonOverlay
              landmarks={landmarks}
              width={640}
              height={480}
            />
          </div>
          {selectedExercise && !isActive && (
            <p className="mt-3 text-sm text-gray-500">
              {exercises.find((e) => e.id === selectedExercise)?.description}
            </p>
          )}

          {/* Coach response log */}
          {coachLog.length > 0 && (
            <div className="mt-4 space-y-2">
              {coachLog.map((msg, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-900 dark:bg-purple-950/30 dark:text-purple-200"
                >
                  <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                  <p>{msg}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div>
          <MetricsPanel
            reps={reps}
            phase={phase}
            jointAngles={jointAngles}
            maxRom={maxRom}
            symmetry={symmetry}
            compensations={compensations}
          />
        </div>
      </div>

      {/* Session Summary */}
      {summary && (
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <h2 className="text-lg font-bold mb-4">Session Summary</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Total Reps</p>
              <p className="text-2xl font-bold">{summary.total_reps as number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Symmetry</p>
              <p className="text-2xl font-bold">{summary.avg_symmetry as number}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Compensations</p>
              <p className="text-2xl font-bold">{summary.total_compensations as number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Exercise</p>
              <p className="text-lg font-semibold capitalize">
                {(summary.exercise_type as string)?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
