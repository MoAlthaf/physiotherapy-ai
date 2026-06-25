"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { sendChatWithSession, textToSpeech } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SILENCE_TIMEOUT_MS = 3000;
const WAKE_PHRASE = "hey coach";

type VoiceState = "idle" | "listening_wake" | "wake_detected" | "listening_command" | "processing" | "speaking";

interface UseVoiceCoachOptions {
  sessionId: string | null;
  isActive: boolean;
  onCoachResponse?: (text: string) => void;
}

export default function useVoiceCoach({ sessionId, isActive, onCoachResponse }: UseVoiceCoachOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [coachMessage, setCoachMessage] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const announcedCompensationsRef = useRef<Set<string>>(new Set());

  // Use refs for values that callbacks need to avoid stale closures
  const voiceEnabledRef = useRef(voiceEnabled);
  const isActiveRef = useRef(isActive);
  const sessionIdRef = useRef(sessionId);
  const onCoachResponseRef = useRef(onCoachResponse);
  const voiceStateRef = useRef<VoiceState>("idle");

  voiceEnabledRef.current = voiceEnabled;
  isActiveRef.current = isActive;
  sessionIdRef.current = sessionId;
  onCoachResponseRef.current = onCoachResponse;

  const setVoiceStateTracked = useCallback((state: VoiceState) => {
    voiceStateRef.current = state;
    setVoiceState(state);
    console.log("[VoiceCoach] State:", state);
  }, []);

  // --- TTS queue ---
  const playTTS = useCallback(async (text: string) => {
    ttsQueueRef.current.push(text);
    if (isSpeakingRef.current) return;

    while (ttsQueueRef.current.length > 0) {
      const next = ttsQueueRef.current.shift()!;
      isSpeakingRef.current = true;
      try {
        const audioBlob = await textToSpeech(next);
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        await new Promise<void>((resolve) => {
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(resolve);
        });
      } catch (e) {
        console.warn("[VoiceCoach] TTS playback failed:", e);
      }
      isSpeakingRef.current = false;
    }
  }, []);

  // --- Announce new compensations ---
  const announceCompensation = useCallback(
    (compensations: { type: string; message: string }[]) => {
      if (!voiceEnabledRef.current || !isActiveRef.current) return;
      for (const c of compensations) {
        if (!announcedCompensationsRef.current.has(c.type)) {
          announcedCompensationsRef.current.add(c.type);
          playTTS(c.message);
        }
      }
    },
    [playTTS]
  );

  useEffect(() => {
    announcedCompensationsRef.current.clear();
  }, [sessionId]);

  // --- Process voice command: STT → Streaming Chat → Progressive TTS ---
  const processVoiceCommand = useCallback(
    async (audioBlob: Blob) => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      setVoiceStateTracked("processing");

      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.wav");
        const sttRes = await fetch(`${API_BASE}/api/voice/stt`, {
          method: "POST",
          body: formData,
        });
        if (!sttRes.ok) throw new Error(`STT failed: ${sttRes.status}`);
        const { text } = await sttRes.json();

        console.log("[VoiceCoach] STT result:", text);

        if (!text || text.trim().length === 0) {
          startWakeListening();
          return;
        }

        setTranscript(text);
        setVoiceStateTracked("speaking");

        // Stream chat response and play TTS progressively
        const streamRes = await fetch(`${API_BASE}/api/chat/stream/${sid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        if (!streamRes.ok || !streamRes.body) {
          // Fallback to non-streaming
          const { response } = await sendChatWithSession(sid, text);
          setCoachMessage(response);
          onCoachResponseRef.current?.(response);
          await playTTS(response);
          startWakeListening();
          return;
        }

        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.sentence) {
                fullText += (fullText ? " " : "") + data.sentence;
                setCoachMessage(fullText);
                onCoachResponseRef.current?.(fullText);
                console.log("[VoiceCoach] Playing sentence:", data.sentence);
                await playTTS(data.sentence);
              }
              if (data.error) {
                console.warn("[VoiceCoach] Stream error:", data.error);
              }
            } catch {}
          }
        }

        if (!fullText) {
          console.warn("[VoiceCoach] No response from stream");
        }
      } catch (e) {
        console.warn("[VoiceCoach] Pipeline error:", e);
      }

      startWakeListening();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playTTS, setVoiceStateTracked]
  );

  // --- Record command after wake word ---
  const startCommandRecording = useCallback(async () => {
    setVoiceStateTracked("listening_command");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        console.log("[VoiceCoach] Recording stopped, blob size:", blob.size);
        if (blob.size > 1000) {
          processVoiceCommand(blob);
        } else {
          startWakeListening();
        }
      };

      recorder.start();
      console.log("[VoiceCoach] Recording started");

      // Silence timer
      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          console.log("[VoiceCoach] Silence timeout — stopping recording");
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }, SILENCE_TIMEOUT_MS);
      };

      // Use Web Speech API alongside to detect speech activity
      try {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        const silenceRecognition = new SpeechRec();
        silenceRecognition.continuous = true;
        silenceRecognition.interimResults = true;
        silenceRecognition.onresult = () => resetSilenceTimer();
        silenceRecognition.onerror = () => {};
        silenceRecognition.onend = () => {};
        silenceRecognition.start();
      } catch {
        // Fallback: no speech activity detection, just use the timer
      }

      resetSilenceTimer();
    } catch (e) {
      console.warn("[VoiceCoach] Mic access failed:", e);
      startWakeListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processVoiceCommand, setVoiceStateTracked]);

  // --- Start wake word listening ---
  const startWakeListening = useCallback(() => {
    // Don't start if disabled
    if (!voiceEnabledRef.current || !isActiveRef.current) {
      setVoiceStateTracked("idle");
      return;
    }

    // Clean up any existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      console.warn("[VoiceCoach] Web Speech API not supported in this browser");
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let wakeDetected = false;

    recognition.addEventListener("start", () => {
      console.log("[VoiceCoach] Wake word listener started");
    });

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (wakeDetected) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase().trim();
        console.log("[VoiceCoach] Heard:", text);
        if (text.includes(WAKE_PHRASE) || text.includes("hey couch") || text.includes("a]coach")) {
          console.log("[VoiceCoach] Wake word DETECTED!");
          wakeDetected = true;
          recognition.stop();
          recognitionRef.current = null;
          setVoiceStateTracked("wake_detected");
          setTimeout(() => startCommandRecording(), 600);
          return;
        }
      }
    };

    recognition.onend = () => {
      console.log("[VoiceCoach] Wake listener ended, wakeDetected:", wakeDetected);
      if (!wakeDetected && voiceEnabledRef.current && isActiveRef.current) {
        // Chrome stops recognition periodically — restart it
        setTimeout(() => {
          if (voiceEnabledRef.current && isActiveRef.current && voiceStateRef.current === "listening_wake") {
            try {
              console.log("[VoiceCoach] Restarting wake listener");
              recognition.start();
            } catch (e) {
              console.warn("[VoiceCoach] Restart failed:", e);
            }
          }
        }, 100);
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed") {
        console.error("[VoiceCoach] Microphone permission denied! Please allow microphone access.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("[VoiceCoach] Recognition error:", e.error);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVoiceStateTracked("listening_wake");
    } catch (e) {
      console.warn("[VoiceCoach] Failed to start recognition:", e);
    }
  }, [startCommandRecording, setVoiceStateTracked]);

  // --- Toggle ---
  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => !prev);
  }, []);

  // --- Main effect: start/stop based on state ---
  useEffect(() => {
    if (voiceEnabled && isActive) {
      startWakeListening();
    } else {
      // Cleanup
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setVoiceStateTracked("idle");
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [voiceEnabled, isActive, startWakeListening, setVoiceStateTracked]);

  return {
    voiceState,
    voiceEnabled,
    toggleVoice,
    transcript,
    coachMessage,
    announceCompensation,
    playTTS,
  };
}
