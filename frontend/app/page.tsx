"use client";

import Link from "next/link";
import { Dumbbell, BarChart3, MessageCircle, Activity } from "lucide-react";

const features = [
  {
    href: "/exercise",
    icon: Dumbbell,
    title: "Exercise Session",
    description: "Start a guided exercise with real-time pose tracking, rep counting, and form analysis.",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    href: "/dashboard",
    icon: BarChart3,
    title: "Recovery Dashboard",
    description: "View your ROM trends, symmetry scores, and compensation history over time.",
    color: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
  },
  {
    href: "/coach",
    icon: MessageCircle,
    title: "AI Coach",
    description: "Chat with your AI physiotherapy coach powered by Fanar for personalized guidance.",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <div className="rounded-2xl bg-blue-100 p-4 dark:bg-blue-950">
            <Activity className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          PhysioAI
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          AI-powered physiotherapy assistant with real-time pose detection,
          biomechanics analysis, and intelligent coaching.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {features.map(({ href, icon: Icon, title, description, color }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800"
          >
            <div className={`mb-4 inline-flex rounded-xl p-3 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {title}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center text-white">
        <h2 className="text-2xl font-bold">Powered by Fanar AI</h2>
        <p className="mt-2 text-blue-100">
          Intelligent coaching with Arabic and English support, speech recognition, and text-to-speech.
        </p>
      </div>
    </div>
  );
}
