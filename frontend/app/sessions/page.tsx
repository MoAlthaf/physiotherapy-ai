"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listExercises, type Exercise } from "@/lib/api";
import {
  Dumbbell,
  Clock,
  Target,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";

const categoryColors: Record<string, string> = {
  "Lower Body": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  "Upper Body": "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  General: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
};

const difficultyColors: Record<string, string> = {
  Beginner: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  Intermediate: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
  Advanced: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
};

const exerciseIcons: Record<string, string> = {
  squat: "🏋️",
  shoulder_abduction: "🤸",
  shoulder_flexion: "💪",
  leg_raise: "🦵",
  knee_flexion: "🏃",
};

export default function SessionsPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listExercises()
      .then((data) => {
        setExercises(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load exercises. Is the backend running?");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exercise Sessions</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl">
          Physiotherapist-recommended exercises with AI-powered real-time form
          tracking and voice coaching.
        </p>
      </div>

      {/* Exercise Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {exercises.map((exercise) => (
          <Link
            key={exercise.id}
            href={`/sessions/${exercise.id}`}
            className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:shadow-none overflow-hidden"
          >
            {/* Card Header with Icon */}
            <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 flex items-center justify-center">
              <span className="text-6xl opacity-80 group-hover:scale-110 transition-transform duration-300">
                {exerciseIcons[exercise.id] || "🏃"}
              </span>
              <div className="absolute top-3 right-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${difficultyColors[exercise.difficulty] || difficultyColors.Beginner}`}>
                  {exercise.difficulty}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {exercise.name}
                </h3>
                <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 mt-0.5 shrink-0" />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {exercise.description}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${categoryColors[exercise.category] || categoryColors.General}`}>
                  <Target className="h-3 w-3" />
                  {exercise.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  {exercise.duration_estimate}
                </span>
              </div>

              {/* Muscles */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {exercise.muscles.map((muscle) => (
                  <span
                    key={muscle}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-500"
                  >
                    <Dumbbell className="h-2.5 w-2.5" />
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
