"use client";

import { useEffect, useState } from "react";
import { getAllSessions, type SessionRecord } from "@/lib/api";
import { BarChart3, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Prepare chart data
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-8">Recovery Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Calendar className="h-4 w-4" /> Sessions
          </div>
          <p className="text-3xl font-bold">{sessions.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <BarChart3 className="h-4 w-4" /> Total Reps
          </div>
          <p className="text-3xl font-bold">{totalReps}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="h-4 w-4" /> Avg Symmetry
          </div>
          <p className="text-3xl font-bold">{avgSymmetry}%</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <AlertTriangle className="h-4 w-4" /> Compensations
          </div>
          <p className="text-3xl font-bold">{totalCompensations}</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm dark:bg-gray-900">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No completed sessions yet. Start an exercise to see your data here.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Symmetry Trend */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <h2 className="text-lg font-semibold mb-4">Symmetry Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={symmetryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="session" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="symmetry" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Reps per Session */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <h2 className="text-lg font-semibold mb-4">Reps per Session</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={symmetryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="session" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="reps" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Session History Table */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Session History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="py-2 pr-4 text-left text-gray-500 font-medium">Date</th>
                    <th className="py-2 pr-4 text-left text-gray-500 font-medium">Exercise</th>
                    <th className="py-2 pr-4 text-right text-gray-500 font-medium">Reps</th>
                    <th className="py-2 pr-4 text-right text-gray-500 font-medium">Symmetry</th>
                    <th className="py-2 text-right text-gray-500 font-medium">Compensations</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b dark:border-gray-800">
                      <td className="py-2 pr-4">{new Date(s.started_at).toLocaleString()}</td>
                      <td className="py-2 pr-4 capitalize">{s.exercise_type.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-4 text-right font-mono">{s.total_reps}</td>
                      <td className="py-2 pr-4 text-right font-mono">{s.avg_symmetry}%</td>
                      <td className="py-2 text-right font-mono">{s.total_compensations}</td>
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
