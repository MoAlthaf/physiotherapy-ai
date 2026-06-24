"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { sendChatWithSession, textToSpeech } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SILENCE_TIMEOUT_MS = 5000;
const WAKE_PHRASE = "hey coach";

type VoiceState = "idle" | "listening_wake" | "listening_command" | "processing" | "speaking";

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

  // --- TTS queue: plays one at a time ---
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
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.play().catch(resolve);
        });
      } catch {
        // TTS failed, skip
      }
      isSpeakingRef.current = false;
    }
  }, []);

  // --- Announce new compensations via TTS ---
  const announceCompensation = useCallback(
    (compensations: { type: string; message: string }[]) => {
      if (!voiceEnabled || !isActive) return;
      for (const c of compensations) {
        if (!announcedCompensationsRef.current.has(c.type)) {
          announcedCompensationsRef.current.add(c.type);
          playTTS(c.message);
        }
      }
    },
    [voiceEnabled, isActive, playTTS]
  );

  // --- Reset announced compensations when session changes ---
  useEffect(() => {
    announcedCompensationsRef.current.clear();
  }, [sessionId]);

  // --- Send recorded audio to Fanar STT, then chat, then TTS ---
  const processVoiceCommand = useCallback(
    async (audioBlob: Blob) => {
      if (!sessionId) return;
      setVoiceState("processing");

      try {
        // STT
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.wav");
        const sttRes = await fetch(`${API_BASE}/api/voice/stt`, {
          method: "POST",
          body: formData,
        });
        if (!sttRes.ok) throw new Error("STT failed");
        const { text } = await sttRes.json();

        if (!text || text.trim().length === 0) {
          setVoiceState("listening_wake");
          return;
        }

        setTranscript(text);

        // Chat with session context
        const { response } = await sendChatWithSession(sessionId, text);
        setCoachMessage(response);
        onCoachResponse?.(response);

        // TTS response
        setVoiceState("speaking");
        await playTTS(response);
      } catch {
        // Voice pipeline failed
      }

      setVoiceState("listening_wake");
    },
    [sessionId, playTTS, onCoachResponse]
  );

  // --- Start recording actual command via MediaRecorder ---
  const startCommandRecording = useCallback(async () => {
    setVoiceState("listening_command");
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
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        if (blob.size > 1000) {
          processVoiceCommand(blob);
        } else {
          setVoiceState("listening_wake");
        }
      };

      recorder.start();

      // Silence detection: stop after 5s of no new speech
      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }, SILENCE_TIMEOUT_MS);
      };

      // Use Web Speech API to detect when user is speaking to reset the timer
      const silenceRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      silenceRecognition.continuous = true;
      silenceRecognition.interimResults = true;
      silenceRecognition.onresult = () => resetSilenceTimer();
      silenceRecognition.onend = () => {
        // If recorder is still going, speech ended -> let silence timer finish it
      };
      silenceRecognition.start();

      // Start the initial silence timer
      resetSilenceTimer();
    } catch {
      setVoiceState("listening_wake");
    }
  }, [processVoiceCommand]);

  // --- Web Speech API wake word listener ---
  const startWakeWordListener = useCallback(() => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      console.warn("Web Speech API not supported");
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase().trim();
        if (text.includes(WAKE_PHRASE)) {
          recognition.stop();
          startCommandRecording();
          return;
        }
      }
    };

    recognition.onend = () => {
      // Restart if still in wake listening mode
      if (voiceEnabled && isActive) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("Wake word recognition error:", e.error);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setVoiceState("listening_wake");
  }, [voiceEnabled, isActive, startCommandRecording]);

  // --- Toggle voice on/off ---
  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => !prev);
  }, []);

  // --- Start/stop wake word listener based on state ---
  useEffect(() => {
    if (voiceEnabled && isActive) {
      startWakeWordListener();
    } else {
      // Cleanup
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setVoiceState("idle");
    }

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [voiceEnabled, isActive, startWakeWordListener]);

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
