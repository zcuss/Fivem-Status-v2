"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

interface ServerEntry {
  server_key: string;
  name?: string;
  ip_port?: string;
  enabled?: boolean;
  guild_id?: string;
  server_code?: string;
  created_by?: string;
  last_data_fetch?: string;
}

export default function ServersListPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";

  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    server_key: "",
    ip_port: "",
    guild_id: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/servers`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data || data?.servers || [];
        setServers(list);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const filtered = servers.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (s.server_key || "").toLowerCase().includes(q) ||
      (s.name || "").toLowerCase().includes(q) ||
      (s.ip_port || "").toLowerCase().includes(q) ||
      (s.server_code || "").toLowerCase().includes(q) ||
      (s.guild_id || "").toLowerCase().includes(q)
    );
  });

  const addServer = async () => {
    if (!form.server_key.trim()) return;
    setSaving(true);
    try {
      // Fetch current, append new, then PUT bulk
      const existingRes = await fetch(`${API}/api/servers`);
      let existing: ServerEntry[] = [];
      if (existingRes.ok) {
        const d = await existingRes.json();
        existing = Array.isArray(d) ? d : d?.data || d?.servers || [];
      }
      const newEntry: ServerEntry = {
        server_key: form.server_key.trim(),
        name: form.name.trim() || form.server_key.trim(),
        ip_port: form.ip_port.trim(),
        enabled: true,
        guild_id: form.guild_id.trim() || guildId,
      };
      const updated = [...existing, newEntry];
      const putRes = await fetch(`${API}/api/servers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (putRes.ok) {
        setServers(updated);
      } else {
        // Fallback: just add locally
        setServers((prev) => [...prev, newEntry]);
      }
    } catch {
      const fallback: ServerEntry = {
        server_key: form.server_key.trim(),
        name: form.name.trim() || form.server_key.trim(),
        ip_port: form.ip_port.trim(),
        enabled: true,
        guild_id: form.guild_id.trim() || guildId,
      };
      setServers((prev) => [...prev, fallback]);
    }
    setForm({ name: "", server_key: "", ip_port: "", guild_id: "" });
    setShowForm(false);
    setSaving(false);
  };

  const toggleServer = async (key: string, enabled: boolean) => {
    const updated = servers.map((s) =>
      s.server_key === key ? { ...s, enabled } : s
    );
    setServers(updated);
    try {
      await fetch(`${API}/api/servers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch {}
  };

  const deleteServer = async (key: string) => {
    if (!confirm(`Delete server "${key}"?`)) return;
    const updated = servers.filter((s) => s.server_key !== key);
    setServers(updated);
    try {
      await fetch(`${API}/api/servers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch {}
  };

  const enabledCount = servers.filter((s) => s.enabled !== false).length;
  const disabledCount = servers.length - enabledCount;

  if (loading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading servers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-300">Server Registry</h1>
          <p className="text-sm text-muted-foreground">
            Manage registered servers used by bot for tracking and auto-find.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{servers.length} total</Badge>
          <Badge variant="success">{enabledCount} enabled</Badge>
          {disabledCount > 0 && (
            <Badge variant="destructive">{disabledCount} disabled</Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-blue-950/30 border-blue-800/40">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Listed Servers
            </p>
            <p className="text-2xl font-bold text-blue-400">{servers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-950/30 border-green-800/40">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Enabled
            </p>
            <p className="text-2xl font-bold text-green-400">{enabledCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-950/30 border-red-800/40">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Disabled
            </p>
            <p className="text-2xl font-bold text-red-400">{disabledCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Server Form */}
      <Card className="border-blue-900/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-blue-300">
              Add Server Entry
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Cancel" : "+ Add Server"}
            </Button>
          </div>
          <CardDescription>
            Register a new server to the registry for tracking and auto-find
            workflows.
          </CardDescription>
        </CardHeader>
        {showForm && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Server Key *
                </label>
                <Input
                  value={form.server_key}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, server_key: e.target.value }))
                  }
                  placeholder="alpha / beta / main"
                  maxLength={64}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="My Server"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  IP:Port
                </label>
                <Input
                  value={form.ip_port}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ip_port: e.target.value }))
                  }
                  placeholder="127.0.0.1:30120"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Guild ID
                </label>
                <Input
                  value={form.guild_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, guild_id: e.target.value }))
                  }
                  placeholder={guildId || "Discord guild ID"}
                />
              </div>
            </div>
            <Button onClick={addServer} disabled={!form.server_key.trim() || saving}>
              {saving ? "Saving..." : "Add Server"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by key, name, IP, or guild..."
          />
        </div>
        <span className="text-xs text-muted-foreground self-center">
          {filtered.length} of {servers.length} servers
        </span>
      </div>

      {/* Server Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Server Key
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    IP:Port
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Guild ID
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Enabled
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      {servers.length === 0
                        ? "No servers registered yet. Add one above."
                        : "No servers match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((server) => (
                    <tr
                      key={server.server_key}
                      className="border-b border-border hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded font-mono">
                          {server.server_key}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {server.name || server.server_key}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-muted-foreground font-mono">
                          {server.ip_port || server.server_code || "-"}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {server.guild_id || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={server.enabled !== false}
                            onCheckedChange={(checked) =>
                              toggleServer(server.server_key, checked)
                            }
                          />
                          <Badge
                            variant={server.enabled !== false ? "success" : "destructive"}
                            className="text-[10px]"
                          >
                            {server.enabled !== false ? "On" : "Off"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/50 text-xs"
                          onClick={() => deleteServer(server.server_key)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
