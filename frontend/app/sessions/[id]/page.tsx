"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import WebcamCapture from "@/components/WebcamCapture";
import SkeletonOverlay from "@/components/SkeletonOverlay";
import MetricsPanel from "@/components/MetricsPanel";
import useVoiceCoach from "@/hooks/useVoiceCoach";
import {
  getExerciseDetail,
  startExercise,
  processFrame,
  endExercise,
  getAISummary,
  type ExerciseDetail,
  type ExerciseFrameResponse,
  type LandmarkPoint,
  type JointAngles,
  type SymmetryResult,
  type CompensationFlag,
} from "@/lib/api";
import {
  Play,
  Square,
  ArrowLeft,
  Mic,
  MicOff,
  Volume2,
  Clock,
  Target,
  Dumbbell,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

type PageView = "detail" | "session" | "summary";

export default function ExerciseSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: exerciseId } = use(params);
  const router = useRouter();

  // Detail state
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PageView>("detail");

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [jointAngles, setJointAngles] = useState<JointAngles>({});
  const [maxRom, setMaxRom] = useState<Record<string, number>>({});
  const [symmetry, setSymmetry] = useState<SymmetryResult | null>(null);
  const [compensations, setCompensations] = useState<CompensationFlag[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachLog, setCoachLog] = useState<string[]>([]);
  const processingRef = useRef(false);

  // Summary state
  const [summaryData, setSummaryData] = useState<{
    total_reps: number;
    avg_symmetry: number;
    total_compensations: number;
    max_rom: Record<string, number>;
    exercise_type: string;
    session_id: string;
  } | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState("");
  const sessionStartRef = useRef<Date | null>(null);

  const {
    voiceState,
    voiceEnabled,
    toggleVoice,
    transcript,
    announceCompensation,
  } = useVoiceCoach({
    sessionId,
    isActive,
    onCoachResponse: (text) => {
      setCoachLog((prev) => [...prev.slice(-4), text]);
    },
  });

  useEffect(() => {
    getExerciseDetail(exerciseId)
      .then((data) => {
        setExercise(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Exercise not found");
        setLoading(false);
      });
  }, [exerciseId]);

  const handleStart = async () => {
    if (countdown !== null) return;
    try {
      const { session_id } = await startExercise(exerciseId);
      setSessionId(session_id);
      setSummaryData(null);
      setAiSummary(null);
      setCoachLog([]);
      setReps(0);
      setPhase("idle");
      setMaxRom({});
      setCompensations([]);
      setError(null);
      setView("session");

      setCountdown(3);
      let t = 3;
      const interval = setInterval(() => {
        t -= 1;
        if (t > 0) {
          setCountdown(t);
        } else {
          clearInterval(interval);
          setCountdown(null);
          setIsActive(true);
          sessionStartRef.current = new Date();
        }
      }, 1000);
    } catch (e) {
      setError(`Failed to start: ${e}`);
    }
  };

  const handleStop = async () => {
    setIsActive(false);
    const endTime = new Date();
    if (sessionStartRef.current) {
      const diff = Math.round((endTime.getTime() - sessionStartRef.current.getTime()) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setSessionDuration(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
    }

    if (sessionId) {
      try {
        const result = await endExercise(sessionId);
        setSummaryData(result);
        setView("summary");

        setAiSummaryLoading(true);
        try {
          const { summary } = await getAISummary(sessionId);
          setAiSummary(summary);
        } catch {
          setAiSummary(null);
        } finally {
          setAiSummaryLoading(false);
        }
      } catch {
        // Session may already be ended
      }
    }
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
        setCompensations(data.compensations ?? []);

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

  const voiceStatusLabel: Record<string, string> = {
    idle: "Voice Off",
    listening_wake: "Say 'Hey Coach'",
    wake_detected: "Wake word detected!",
    listening_command: "Listening...",
    processing: "Processing...",
    speaking: "Coach speaking...",
  };

  const voiceStatusColor: Record<string, string> = {
    idle: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    listening_wake: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    wake_detected: "bg-emerald-500 text-white animate-pulse",
    listening_command: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 animate-pulse",
    processing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    speaking: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-500">Exercise not found</p>
      </div>
    );
  }

  // ======================== DETAIL VIEW ========================
  if (view === "detail") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/sessions")}
          className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to exercises
        </button>

        <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* Hero section */}
          <div className="relative h-56 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative text-center text-white">
              <p className="text-7xl mb-3">
                {({
                  squat: "🏋️",
                  shoulder_abduction: "🤸",
                  shoulder_flexion: "💪",
                  leg_raise: "🦵",
                  knee_flexion: "🏃",
                } as Record<string, string>)[exerciseId] || "🏃"}
              </p>
              <h1 className="text-3xl font-bold">{exercise.name}</h1>
              <p className="mt-2 text-blue-100">{exercise.description}</p>
            </div>
          </div>

          <div className="p-8">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                <Target className="h-3.5 w-3.5" /> {exercise.category}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-950/50 dark:text-green-400">
                {exercise.difficulty}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5" /> {exercise.duration_estimate}
              </span>
            </div>

            {/* Muscles */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Target Muscles</h3>
              <div className="flex flex-wrap gap-2">
                {exercise.muscles.map((m) => (
                  <span key={m} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <Dumbbell className="h-3.5 w-3.5 text-blue-500" /> {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Step-by-Step Instructions</h3>
              <div className="space-y-3">
                {exercise.instructions.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                      {i + 1}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            {exercise.tips && (
              <div className="mb-8 flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
                <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">Pro Tip</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">{exercise.tips}</p>
                </div>
              </div>
            )}

            {/* Tracked joints */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Tracking Points</h3>
              <div className="flex flex-wrap gap-2">
                {exercise.tracked_joints.map((j) => (
                  <span key={j} className="rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 capitalize dark:bg-purple-950/50 dark:text-purple-400">
                    {j.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            {/* Media placeholder */}
            <div className="mb-8 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
              <Play className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Exercise demonstration video</p>
              <p className="text-xs text-gray-400 mt-1">Coming soon</p>
            </div>

            {/* Start button */}
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
            >
              <Play className="h-6 w-6" />
              Start Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================== SESSION VIEW ========================
  if (view === "session") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Session header */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950">
              <Dumbbell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{exercise.name}</h1>
              <p className="text-xs text-gray-500">Session in progress</p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
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

            {isActive ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <Square className="h-4 w-4" /> End Session
              </button>
            ) : countdown !== null ? (
              <button disabled className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white opacity-70">
                <Play className="h-4 w-4" /> {countdown}...
              </button>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Voice status bar */}
        {voiceEnabled && (
          <div className={`mb-4 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300 ${voiceStatusColor[voiceState] || ""}`}>
            {voiceState === "listening_command" ? (
              <Mic className="h-4 w-4 animate-pulse" />
            ) : voiceState === "speaking" || voiceState === "wake_detected" ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            <span>{voiceStatusLabel[voiceState] || ""}</span>
            {voiceState === "wake_detected" && (
              <span className="ml-auto text-xs font-bold">Activated</span>
            )}
            {transcript && voiceState === "processing" && (
              <span className="ml-auto text-xs opacity-70">You said: &ldquo;{transcript}&rdquo;</span>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Webcam + Skeleton */}
          <div className="lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
              <WebcamCapture onFrame={handleFrame} isCapturing={isActive} fps={5} />
              <SkeletonOverlay landmarks={landmarks} width={640} height={480} />
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <div className="text-center">
                    <p className="text-9xl font-bold text-white animate-bounce">{countdown}</p>
                    <p className="mt-4 text-xl text-white/80 font-medium">Get into position!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Coach response log */}
            {coachLog.length > 0 && (
              <div className="mt-4 space-y-2">
                {coachLog.map((msg, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-xl bg-purple-50 px-4 py-3 text-sm text-purple-900 dark:bg-purple-950/30 dark:text-purple-200"
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
      </div>
    );
  }

  // ======================== SUMMARY VIEW ========================
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Summary header */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-8 text-center text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Trophy className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">Session Complete!</h1>
            <p className="mt-1 text-emerald-100">{exercise.name}</p>
          </div>
        </div>

        <div className="p-8">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-1">
                <CheckCircle2 className="h-4 w-4" /> Reps
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {(summaryData?.total_reps as number) ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-1">
                <TrendingUp className="h-4 w-4" /> Symmetry
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {(summaryData?.avg_symmetry as number) ?? 0}%
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-1">
                <AlertTriangle className="h-4 w-4" /> Compensations
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {(summaryData?.total_compensations as number) ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-1">
                <Clock className="h-4 w-4" /> Duration
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {sessionDuration || "--"}
              </p>
            </div>
          </div>

          {/* Max ROM */}
          {summaryData?.max_rom && Object.keys(summaryData.max_rom).length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Max Range of Motion</h3>
              <div className="space-y-2">
                {Object.entries(summaryData.max_rom).map(([joint, angle]) => (
                  <div key={joint} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 dark:bg-gray-800">
                    <span className="text-sm font-medium text-gray-700 capitalize dark:text-gray-300">{joint.replace(/_/g, " ")}</span>
                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{angle.toFixed(1)}&deg;</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">AI Coach Report</h3>
            </div>
            {aiSummaryLoading ? (
              <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-6 dark:bg-purple-950/30">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                <p className="text-sm text-purple-700 dark:text-purple-300">Generating your personalized report...</p>
              </div>
            ) : aiSummary ? (
              <div className="rounded-xl bg-purple-50 p-6 dark:bg-purple-950/30">
                <p className="text-sm text-purple-900 dark:text-purple-200 whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 p-6 dark:bg-gray-800">
                <p className="text-sm text-gray-500">AI report unavailable</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => {
                setView("detail");
                setSessionId(null);
                setSummaryData(null);
                setAiSummary(null);
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Play className="h-4 w-4" />
              New Session
            </button>
            <button
              onClick={() => router.push("/sessions")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Exercises
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
