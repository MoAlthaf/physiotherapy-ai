"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllSessions, type SessionRecord } from "@/lib/api";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Trophy,
  Target,
  Loader2,
  Dumbbell,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllSessions()
      .then((data) => {
        setSessions(data.filter((s) => s.ended_at));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load sessions. Is the backend running?");
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

  const symmetryData = sessions.map((s, i) => ({
    session: i + 1,
    date: new Date(s.started_at).toLocaleDateString(),
    symmetry: s.avg_symmetry,
    reps: s.total_reps,
    compensations: s.total_compensations,
  }));

  const totalReps = sessions.reduce((sum, s) => sum + s.total_reps, 0);
  const avgSymmetry = sessions.length
    ? (sessions.reduce((sum, s) => sum + s.avg_symmetry, 0) / sessions.length).toFixed(1)
    : "--";
  const totalCompensations = sessions.reduce((sum, s) => sum + s.total_compensations, 0);

  const symmetryColor =
    avgSymmetry === "--" ? "text-gray-400" :
    Number(avgSymmetry) >= 85 ? "text-emerald-600 dark:text-emerald-400" :
    Number(avgSymmetry) >= 70 ? "text-yellow-600 dark:text-yellow-400" :
    "text-red-600 dark:text-red-400";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recovery Dashboard</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Track your progress across all exercise sessions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Calendar className="h-4 w-4" /> Total Sessions
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{sessions.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Trophy className="h-4 w-4" /> Total Reps
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{totalReps}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Target className="h-4 w-4" /> Avg Symmetry
          </div>
          <p className={`text-4xl font-bold ${symmetryColor}`}>{avgSymmetry}%</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <AlertTriangle className="h-4 w-4" /> Compensations
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{totalCompensations}</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Dumbbell className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No sessions yet</h3>
          <p className="text-gray-500 mb-6">Complete your first exercise session to see your progress here.</p>
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Start a Session <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Symmetry Trend */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Symmetry Trend</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={symmetryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="session" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line type="monotone" dataKey="symmetry" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Reps per Session */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reps per Session</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={symmetryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="session" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="reps" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Session History Table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Session History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="py-3 pr-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 pr-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Exercise</th>
                    <th className="py-3 pr-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Reps</th>
                    <th className="py-3 pr-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Symmetry</th>
                    <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Compensations</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {new Date(s.started_at).toLocaleDateString()} <span className="text-gray-400 text-xs">{new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 capitalize dark:bg-blue-950/50 dark:text-blue-400">
                          {s.exercise_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-medium text-gray-900 dark:text-white">{s.total_reps}</td>
                      <td className="py-3 pr-4 text-right">
                        <span className={`font-mono font-medium ${
                          s.avg_symmetry >= 85 ? "text-emerald-600 dark:text-emerald-400" :
                          s.avg_symmetry >= 70 ? "text-yellow-600 dark:text-yellow-400" :
                          "text-red-600 dark:text-red-400"
                        }`}>
                          {s.avg_symmetry}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-medium text-gray-900 dark:text-white">{s.total_compensations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
