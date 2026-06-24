"use client";

import { useRef, useEffect } from "react";
import type { LandmarkPoint } from "@/lib/api";

// MediaPipe pose connections (pairs of landmark indices)
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // arms
  [11, 23], [12, 24], [23, 24], // torso
  [23, 25], [25, 27], [24, 26], [26, 28], // legs
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], // face
  [9, 10], // mouth
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22], // hands
  [27, 29], [27, 31], [28, 30], [28, 32], // feet
];

interface SkeletonOverlayProps {
  landmarks: LandmarkPoint[] | null;
  width: number;
  height: number;
}

export default function SkeletonOverlay({ landmarks, width, height }: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // Mirror the x-coordinates since webcam is mirrored
    const mirror = (x: number) => width - x * width;
    const toY = (y: number) => y * height;

    // Draw connections
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    for (const [i, j] of POSE_CONNECTIONS) {
      if (i >= landmarks.length || j >= landmarks.length) continue;
      const a = landmarks[i];
      const b = landmarks[j];
      if (a.visibility < 0.5 || b.visibility < 0.5) continue;

      ctx.beginPath();
      ctx.moveTo(mirror(a.x), toY(a.y));
      ctx.lineTo(mirror(b.x), toY(b.y));
      ctx.stroke();
    }

    // Draw joints
    for (const lm of landmarks) {
      if (lm.visibility < 0.5) continue;
      ctx.beginPath();
      ctx.arc(mirror(lm.x), toY(lm.y), 5, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [landmarks, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
