"use client";

import { useEffect, useState } from "react";
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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

interface AutoFindEntry {
  id: string;
  keyword: string;
  server_key?: string;
  channel_id: string;
  message_id?: string;
  enabled?: boolean;
  logo?: string;
  color?: string;
  discord_id?: string;
  guild_id?: string;
  created_at?: string;
}

export default function AutoFindPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [entries, setEntries] = useState<AutoFindEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState("user");
  const [limit, setLimit] = useState<number | "INF">(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AutoFindEntry | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    keyword: "",
    server_key: "",
    channel_id: "",
    message_id: "",
    logo: "",
    color: "",
  });

  useEffect(() => {
    fetch(`${API}/api/servers/${guildId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const data = d?.data || {};
        setEntries(data.autofind || []);
        setRole(data.role || "user");
        setLimit(data.auto_limit ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const isPremium = role !== "user";

  const filtered = entries.filter(
    (e) =>
      e.keyword.toLowerCase().includes(search.toLowerCase()) ||
      (e.server_key || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.channel_id || "").includes(search)
  );

  const enabledCount = entries.filter((e) => e.enabled).length;
  const disabledCount = entries.filter((e) => !e.enabled).length;

  const openAddForm = () => {
    setEditing(null);
    setForm({
      keyword: "",
      server_key: "",
      channel_id: "",
      message_id: "",
      logo: "",
      color: "",
    });
    setShowForm(true);
  };

  const openEditForm = (entry: AutoFindEntry) => {
    setEditing(entry);
    setForm({
      keyword: entry.keyword,
      server_key: entry.server_key || "",
      channel_id: entry.channel_id,
      message_id: entry.message_id || "",
      logo: entry.logo || "",
      color: entry.color || "",
    });
    setShowForm(true);
  };

  const submitForm = async () => {
    if (!form.keyword.trim() || !form.channel_id.trim()) return;
    if (editing) {
      const updated = entries.map((e) =>
        e.id === editing.id ? { ...e, ...form } : e
      );
      setEntries(updated);
      await persistEntries(updated);
    } else {
      const newEntry: AutoFindEntry = {
        id: `af_${Date.now()}`,
        ...form,
        enabled: true,
        guild_id: guildId,
        created_at: new Date().toISOString(),
      };
      const updated = [...entries, newEntry];
      setEntries(updated);
      await persistEntries(updated);
    }
    setShowForm(false);
  };

  const toggleEntry = async (id: string) => {
    const updated = entries.map((e) =>
      e.id === id ? { ...e, enabled: !e.enabled } : e
    );
    setEntries(updated);
    await persistEntries(updated);
  };

  const deleteEntry = async (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    await persistEntries(updated);
  };

  const persistEntries = async (data: AutoFindEntry[]) => {
    setSaving(true);
    try {
      await fetch(`${API}/api/servers/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autofind: data }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading auto-find...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-300">
            Auto Find Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Keyword tracker entries for this guild. Create, toggle, and delete
            auto-find rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {enabledCount} active / {disabledCount} inactive
          </Badge>
          {saved && <Badge variant="success">Saved!</Badge>}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Total Rules
            </p>
            <p className="text-2xl font-bold text-white">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Active
            </p>
            <p className="text-2xl font-bold text-green-400">{enabledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Inactive
            </p>
            <p className="text-2xl font-bold text-red-400">{disabledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Limit
            </p>
            <p className="text-2xl font-bold text-white">
              {limit === "INF" ? "INF" : limit}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-blue-900/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-300">
              {editing ? "Edit Auto Find Entry" : "Create New Auto Find Entry"}
            </CardTitle>
            <CardDescription>
              {editing
                ? "Update the configuration for this entry."
                : "Define a keyword to track, the target channel, and optional visual settings."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Keyword *
                </label>
                <Input
                  value={form.keyword}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, keyword: e.target.value }))
                  }
                  placeholder="police / ems / medic / store"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Server Key
                </label>
                <Input
                  value={form.server_key}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, server_key: e.target.value }))
                  }
                  placeholder="alpha / beta / main"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Channel ID *
                </label>
                <Input
                  value={form.channel_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, channel_id: e.target.value }))
                  }
                  placeholder="1234567890123456789"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Message ID
                </label>
                <Input
                  value={form.message_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, message_id: e.target.value }))
                  }
                  placeholder="Leave empty for auto-generated"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Logo
                </label>
                <Input
                  value={form.logo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, logo: e.target.value }))
                  }
                  placeholder="police / medic"
                  disabled={!isPremium}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Color
                </label>
                <Input
                  value={form.color}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, color: e.target.value }))
                  }
                  placeholder="#3b82f6 / Blue / Gold"
                  disabled={!isPremium}
                />
              </div>
            </div>
            {!isPremium && (
              <p className="text-xs text-yellow-500">
                Logo and Color are only available for premium roles.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                onClick={submitForm}
                disabled={!form.keyword.trim() || !form.channel_id.trim()}
              >
                {editing ? "Update Entry" : "Create Entry"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keyword, server, channel..."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {entries.length} entries
          </span>
          {!showForm && (
            <Button size="sm" onClick={openAddForm}>
              + Add Entry
            </Button>
          )}
        </div>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-blue-300">
              Auto Find Entries
            </CardTitle>
            {saving && (
              <Badge variant="outline" className="text-xs">
                Saving...
              </Badge>
            )}
          </div>
          <CardDescription>
            All keyword tracker entries configured for this guild.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-blue-300 font-semibold mb-1">
                {entries.length === 0
                  ? "No Auto Find entries yet"
                  : "No entries match your search"}
              </p>
              <p className="text-xs text-muted-foreground">
                {entries.length === 0
                  ? "Create your first entry using the Add Entry button above."
                  : "Try adjusting your search filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3">ID</th>
                    <th className="text-left py-2 px-3">Keyword</th>
                    <th className="text-left py-2 px-3">Server Key</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">
                      Channel ID
                    </th>
                    <th className="text-left py-2 px-3 hidden lg:table-cell">
                      Message ID
                    </th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3 hidden lg:table-cell">
                      Logo
                    </th>
                    <th className="text-left py-2 px-3 hidden lg:table-cell">
                      Color
                    </th>
                    <th className="text-right py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-muted-foreground text-xs font-mono">
                        {row.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-blue-300 font-medium text-xs">
                          {row.keyword}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-foreground text-xs uppercase font-medium">
                          {row.server_key || "-"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 hidden md:table-cell text-muted-foreground text-xs font-mono truncate max-w-[180px]">
                        {row.channel_id}
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell text-muted-foreground text-xs font-mono truncate max-w-[180px]">
                        {row.message_id || "-"}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => toggleEntry(row.id)}
                          className={`inline-flex items-center gap-1.5 cursor-pointer`}
                        >
                          <Badge
                            variant={row.enabled ? "success" : "secondary"}
                            className="text-[10px] cursor-pointer"
                          >
                            {row.enabled ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {row.logo || (
                          <span className="opacity-40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell text-xs">
                        {row.color ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-full border border-border inline-block"
                              style={{ backgroundColor: row.color }}
                            />
                            {row.color}
                          </span>
                        ) : (
                          <span className="text-muted-foreground opacity-40">
                            -
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => openEditForm(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-red-400 hover:text-red-300 hover:bg-red-950"
                            onClick={() => deleteEntry(row.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
