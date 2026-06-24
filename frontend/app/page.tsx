"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Brain,
  Camera,
  Shield,
  Mic,
  BarChart3,
  Sparkles,
} from "lucide-react";

const highlights = [
  {
    icon: Camera,
    title: "Real-Time Pose Tracking",
    desc: "MediaPipe-powered 33-point skeleton detection with live joint angle analysis.",
  },
  {
    icon: Brain,
    title: "AI-Powered Coaching",
    desc: "Fanar AI delivers personalized feedback, form corrections, and session reports.",
  },
  {
    icon: Mic,
    title: "Voice Interaction",
    desc: "Say 'Hey Coach' for hands-free coaching with speech recognition and TTS.",
  },
  {
    icon: Shield,
    title: "Compensation Detection",
    desc: "Automatic detection of torso lean, shoulder hiking, knee valgus, and more.",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    desc: "Track ROM, symmetry, reps, and compensations across sessions.",
  },
  {
    icon: Sparkles,
    title: "Physio-Approved Exercises",
    desc: "Curated exercise library with detailed instructions and real-time guidance.",
  },
];

export default function Home() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-3xl -z-10" />

        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 mb-8">
              <Activity className="h-4 w-4" />
              Powered by Fanar AI
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
              Your AI{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Physiotherapy
              </span>
              <br />
              Assistant
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Real-time pose detection, biomechanics analysis, and intelligent
              voice coaching — all from your browser. No wearables needed.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/sessions"
                className="group flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
              >
                Start a Session
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/coach"
                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Mic className="h-5 w-5" />
                Talk to Coach
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">How It Works</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Three steps to smarter rehabilitation</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Choose Exercise",
                desc: "Browse physiotherapist-recommended exercises with detailed instructions.",
                color: "from-blue-500 to-blue-600",
              },
              {
                step: "02",
                title: "Perform & Track",
                desc: "Your webcam tracks your form in real-time with AI-powered analysis.",
                color: "from-purple-500 to-purple-600",
              },
              {
                step: "03",
                title: "Review & Improve",
                desc: "Get an AI-generated session report with actionable feedback.",
                color: "from-emerald-500 to-emerald-600",
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-8 transition-all hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-lg">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white text-lg font-bold mb-5`}>
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Built for Recovery</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Everything you need for guided rehabilitation</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900"
              >
                <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-12 text-center shadow-2xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtNGgtNHYyaC00di0ySDIwdjRoMnY0aC0ydjRoNHYtMmg0djJoNHYtNGgtMnYtNHptLTR2MmgtNHYtMmg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
              Ready to Start Your Recovery?
            </h2>
            <p className="relative mt-4 text-lg text-blue-100 max-w-xl mx-auto">
              Browse our exercise library and begin your AI-guided physiotherapy session now.
            </p>
            <Link
              href="/sessions"
              className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl"
            >
              Browse Exercises
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
