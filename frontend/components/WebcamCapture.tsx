"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

interface WebcamCaptureProps {
  onFrame: (imageBase64: string) => void;
  isCapturing: boolean;
  fps?: number;
  showPreview?: boolean;
}

export default function WebcamCapture({
  onFrame,
  isCapturing,
  fps = 5,
  showPreview = true,
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
          setError(null);
        }
      } catch {
        setError("Camera access denied. Please allow camera permissions.");
        setHasCamera(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const base64 = dataUrl.split(",")[1];
    onFrame(base64);
  }, [onFrame]);

  useEffect(() => {
    if (isCapturing && hasCamera) {
      intervalRef.current = setInterval(captureFrame, 1000 / fps);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCapturing, hasCamera, captureFrame, fps]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      {error ? (
        <div className="flex h-[480px] items-center justify-center text-center">
          <div>
            <CameraOff className="mx-auto mb-3 h-12 w-12 text-gray-500" />
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full ${showPreview ? "" : "hidden"}`}
            style={{ transform: "scaleX(-1)" }}
          />
          {!hasCamera && (
            <div className="flex h-[480px] items-center justify-center">
              <Camera className="h-12 w-12 animate-pulse text-gray-500" />
            </div>
          )}
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
      {isCapturing && hasCamera && (
        <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          LIVE
        </div>
      )}
    </div>
  );
}
