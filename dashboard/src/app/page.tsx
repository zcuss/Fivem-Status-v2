"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:34002";

interface BotInfo {
  id: number;
  name: string;
  status: string;
  enabled: boolean;
  cluster_id: string;
}

interface Stats {
  bots: number;
  servers: number;
  users: number;
  commands: number;
}

export default function DashboardPage() {
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/stats`)
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(() => setError("API offline"));
    fetch(`${API}/api/bots`)
      .then((r) => r.json())
      .then((d) => setBots(d.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Bots", value: stats?.bots ?? "—" },
          { label: "Servers", value: stats?.servers ?? "—" },
          { label: "Users", value: stats?.users ?? "—" },
          { label: "Commands Today", value: stats?.commands ?? "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bot List */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="font-semibold mb-3">Active Bots</h2>
        {bots.length === 0 ? (
          <p className="text-gray-500 text-sm">No bots configured</p>
        ) : (
          <div className="space-y-2">
            {bots.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <span className="font-medium">{b.name}</span>
                  <span className="ml-2 text-xs text-gray-500">id={b.id}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    b.status === "running"
                      ? "bg-green-900/50 text-green-400"
                      : b.status === "error"
                      ? "bg-red-900/50 text-red-400"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
