"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

interface BotCommand {
  id: string;
  name: string;
  description?: string;
  category?: string;
  enabled?: boolean;
  ephemeral?: boolean;
}

export default function CommandsPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [commands, setCommands] = useState<BotCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/servers/${guildId}`)
      .then((r) => r.json())
      .then((d) => {
        const cmds = (d.data as any)?.commands || [];
        setCommands(cmds);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const toggleCommand = (id: string, field: "enabled" | "ephemeral") => {
    setCommands((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [field]: !c[field as keyof BotCommand] } : c
      )
    );
  };

  const saveCommands = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`${API}/api/servers/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const filtered = commands.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map((c) => c.category || "General"))];

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading commands…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commands</h1>
        <div className="flex items-center gap-3">
          {saved && <Badge variant="success">Saved!</Badge>}
          <Button onClick={saveCommands} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search commands…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {categories.map((cat) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-lg">{cat}</CardTitle>
            <CardDescription>
              {filtered.filter((c) => (c.category || "General") === cat).length} commands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {filtered
                .filter((c) => (c.category || "General") === cat)
                .map((cmd) => (
                  <div
                    key={cmd.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-800/50 transition"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{cmd.name}</span>
                        {!cmd.enabled && (
                          <Badge variant="secondary" className="text-[10px]">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      {cmd.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{cmd.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-gray-400">Ephemeral</span>
                        <div
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            cmd.ephemeral ? "bg-blue-600" : "bg-gray-700"
                          }`}
                          onClick={() => toggleCommand(cmd.id, "ephemeral")}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                              cmd.ephemeral ? "left-4.5" : "left-0.5"
                            }`}
                          />
                        </div>
                      </label>
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          cmd.enabled !== false ? "bg-green-600" : "bg-gray-700"
                        }`}
                        onClick={() => toggleCommand(cmd.id, "enabled")}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                            cmd.enabled !== false ? "translate-x-5 left-0.5" : "left-0.5"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {filtered.length === 0 && (
        <p className="text-gray-500 text-center py-8">No commands found</p>
      )}
    </div>
  );
}
