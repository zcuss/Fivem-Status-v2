import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

async function getStats() {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";
  try {
    const res = await fetch(`${API}/api/stats`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export default async function DashboardHome() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Bots", value: stats?.bots ?? "—" },
          { label: "Servers", value: stats?.servers ?? "—" },
          { label: "Users", value: stats?.users ?? "—" },
          { label: "Commands Today", value: stats?.commands ?? "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-gray-800 bg-gray-900 p-4"
          >
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/bots" className="block">
          <Card className="hover:border-gray-700 transition cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">🤖 Bots</CardTitle>
              <CardDescription>
                Manage bot instances and tokens
              </CardDescription>
            </CardHeader>
          </Card>
        </a>
        <a href="/servers" className="block">
          <Card className="hover:border-gray-700 transition cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">🖥️ Servers</CardTitle>
              <CardDescription>
                Server configs and auto-find rules
              </CardDescription>
            </CardHeader>
          </Card>
        </a>
        <a href="/logs" className="block">
          <Card className="hover:border-gray-700 transition cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">📋 Logs</CardTitle>
              <CardDescription>Bot logs and command history</CardDescription>
            </CardHeader>
          </Card>
        </a>
      </div>
    </div>
  );
}
