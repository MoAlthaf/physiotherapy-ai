"use client";

import type { JointAngles, SymmetryResult, CompensationFlag } from "@/lib/api";
import { AlertTriangle, TrendingUp, RotateCcw, Target } from "lucide-react";

interface MetricsPanelProps {
  reps: number;
  phase: string;
  jointAngles: JointAngles;
  maxRom: Record<string, number>;
  symmetry: SymmetryResult | null;
  compensations: CompensationFlag[];
}

export default function MetricsPanel({
  reps,
  phase,
  jointAngles,
  maxRom,
  symmetry,
  compensations,
}: MetricsPanelProps) {
  const symmetryColor = !symmetry
    ? "text-gray-400"
    : symmetry.overall_score >= 85
    ? "text-green-500"
    : symmetry.overall_score >= 70
    ? "text-yellow-500"
    : "text-red-500";

  return (
    <div className="space-y-4">
      {/* Reps & Phase */}
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Reps</p>
            <p className="text-4xl font-bold">{reps}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Phase</p>
            <p className="text-lg font-semibold capitalize">{phase}</p>
          </div>
        </div>
      </div>

      {/* Symmetry Score */}
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-500">Symmetry</p>
        </div>
        <p className={`text-3xl font-bold ${symmetryColor}`}>
          {symmetry ? `${symmetry.overall_score}%` : "--"}
        </p>
        {symmetry && (
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
            {symmetry.shoulder_score != null && <span>Shoulder: {symmetry.shoulder_score}%</span>}
            {symmetry.elbow_score != null && <span>Elbow: {symmetry.elbow_score}%</span>}
            {symmetry.hip_score != null && <span>Hip: {symmetry.hip_score}%</span>}
            {symmetry.knee_score != null && <span>Knee: {symmetry.knee_score}%</span>}
          </div>
        )}
      </div>

      {/* Max ROM */}
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-500">Max ROM</p>
        </div>
        <div className="space-y-1 text-sm">
          {Object.entries(maxRom ?? {}).map(([joint, angle]) => (
            <div key={joint} className="flex justify-between">
              <span className="text-gray-600 capitalize">{joint.replace(/_/g, " ")}</span>
              <span className="font-mono font-medium">{angle.toFixed(1)}&deg;</span>
            </div>
          ))}
          {Object.keys(maxRom ?? {}).length === 0 && (
            <p className="text-gray-400">No data yet</p>
          )}
        </div>
      </div>

      {/* Compensations */}
      {compensations.length > 0 && (
        <div className="rounded-xl bg-red-50 p-4 shadow-sm dark:bg-red-950/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Compensations</p>
          </div>
          <div className="space-y-2">
            {compensations.map((c, i) => (
              <div key={i} className="text-sm">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium mr-1 ${
                  c.severity === "high"
                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                }`}>
                  {c.severity}
                </span>
                {c.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Angles */}
      <details className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-500">
          <RotateCcw className="h-4 w-4" />
          Live Joint Angles
        </summary>
        <div className="mt-2 space-y-1 text-sm">
          {Object.entries(jointAngles ?? {}).map(([joint, angle]) =>
            angle != null ? (
              <div key={joint} className="flex justify-between">
                <span className="text-gray-600 capitalize">{joint.replace(/_/g, " ")}</span>
                <span className="font-mono">{angle.toFixed(1)}&deg;</span>
              </div>
            ) : null
          )}
        </div>
      </details>
    </div>
  );
}
