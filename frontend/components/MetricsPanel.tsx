"use client";

import type { JointAngles, SymmetryResult, CompensationFlag } from "@/lib/api";
import { AlertTriangle, TrendingUp, RotateCcw, Target, Repeat } from "lucide-react";

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
  const symmetryScore = symmetry?.overall_score ?? 0;
  const symmetryColor = !symmetry
    ? "text-gray-400"
    : symmetryScore >= 85
    ? "text-emerald-500"
    : symmetryScore >= 70
    ? "text-yellow-500"
    : "text-red-500";

  const phaseColor = {
    up: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    down: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    hold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    idle: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  }[phase] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <div className="space-y-4">
      {/* Reps & Phase */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Repeat className="h-3.5 w-3.5" /> Repetitions
            </div>
            <p className="text-5xl font-bold text-gray-900 dark:text-white">{reps}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1.5">Phase</p>
            <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${phaseColor}`}>
              {phase}
            </span>
          </div>
        </div>
      </div>

      {/* Symmetry Score */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Symmetry</p>
        </div>
        <p className={`text-4xl font-bold ${symmetryColor}`}>
          {symmetry ? `${symmetryScore}%` : "--"}
        </p>
        {symmetry && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {symmetry.shoulder_score != null && (
              <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs dark:bg-gray-800">
                <span className="text-gray-500">Shoulder</span>
                <span className="float-right font-mono font-medium text-gray-700 dark:text-gray-300">{symmetry.shoulder_score}%</span>
              </div>
            )}
            {symmetry.elbow_score != null && (
              <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs dark:bg-gray-800">
                <span className="text-gray-500">Elbow</span>
                <span className="float-right font-mono font-medium text-gray-700 dark:text-gray-300">{symmetry.elbow_score}%</span>
              </div>
            )}
            {symmetry.hip_score != null && (
              <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs dark:bg-gray-800">
                <span className="text-gray-500">Hip</span>
                <span className="float-right font-mono font-medium text-gray-700 dark:text-gray-300">{symmetry.hip_score}%</span>
              </div>
            )}
            {symmetry.knee_score != null && (
              <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs dark:bg-gray-800">
                <span className="text-gray-500">Knee</span>
                <span className="float-right font-mono font-medium text-gray-700 dark:text-gray-300">{symmetry.knee_score}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Max ROM */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Max ROM</p>
        </div>
        <div className="space-y-1.5">
          {Object.entries(maxRom ?? {}).map(([joint, angle]) => (
            <div key={joint} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <span className="text-sm text-gray-600 capitalize dark:text-gray-400">{joint.replace(/_/g, " ")}</span>
              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{angle.toFixed(1)}&deg;</span>
            </div>
          ))}
          {Object.keys(maxRom ?? {}).length === 0 && (
            <p className="text-sm text-gray-400 py-2">No data yet</p>
          )}
        </div>
      </div>

      {/* Compensations */}
      {(compensations ?? []).length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider dark:text-red-400">Compensations</p>
          </div>
          <div className="space-y-2">
            {compensations.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs font-bold ${
                  c.severity === "high"
                    ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                    : "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                }`}>
                  {c.severity.toUpperCase()}
                </span>
                <span className="text-red-800 dark:text-red-300">{c.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Angles */}
      <details className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <RotateCcw className="h-4 w-4" />
          Live Joint Angles
        </summary>
        <div className="mt-3 space-y-1.5">
          {Object.entries(jointAngles ?? {}).map(([joint, angle]) =>
            angle != null ? (
              <div key={joint} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="text-sm text-gray-600 capitalize dark:text-gray-400">{joint.replace(/_/g, " ")}</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{angle.toFixed(1)}&deg;</span>
              </div>
            ) : null
          )}
        </div>
      </details>
    </div>
  );
}
