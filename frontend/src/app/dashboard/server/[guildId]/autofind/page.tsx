"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const API = "http://localhost:34002";

interface AutoFindEntry {
  id: string;
  keyword: string;
  channel_id: string;
  channel_name?: string;
  server_name?: string;
  server_id?: string;
  enabled?: boolean;
  created_at?: string;
}

export default function AutoFindPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [entries, setEntries] = useState<AutoFindEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AutoFindEntry | null>(null);
  const [form, setForm] = useState({
    keyword: "",
    channel_id: "",
    channel_name: "",
    server_name: "",
    server_id: "",
  });

  useEffect(() => {
    fetch(`${API}/api/servers/${guildId}`)
      .then((r) => r.json())
      .then((d) => {
        setEntries((d.data as any)?.autofind || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const toggleEntry = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const openAddForm = () => {
    setEditing(null);
    setForm({ keyword: "", channel_id: "", channel_name: "", server_name: "", server_id: "" });
    setShowForm(true);
  };

  const openEditForm = (entry: AutoFindEntry) => {
    setEditing(entry);
    setForm({
      keyword: entry.keyword,
      channel_id: entry.channel_id,
      channel_name: entry.channel_name || "",
      server_name: entry.server_name || "",
      server_id: entry.server_id || "",
    });
    setShowForm(true);
  };

  const submitForm = () => {
    if (!form.keyword.trim()) return;
    if (editing) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editing.id
            ? { ...e, ...form }
            : e
        )
      );
    } else {
      const newEntry: AutoFindEntry = {
        id: `af_${Date.now()}`,
        ...form,
        enabled: true,
        created_at: new Date().toISOString(),
      };
      setEntries((prev) => [...prev, newEntry]);
    }
    setShowForm(false);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/servers/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autofind: entries }),
      });
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading auto-find entries…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auto-Find</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openAddForm}>
            + Add Entry
          </Button>
          <Button onClick={saveAll} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editing ? "Edit Auto-Find Entry" : "New Auto-Find Entry"}
            </CardTitle>
            <CardDescription>
              Auto-find monitors channels for keywords and reports matches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Keyword *</label>
                <Input
                  value={form.keyword}
                  onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))}
                  placeholder="e.g. police"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Channel ID</label>
                <Input
                  value={form.channel_id}
                  onChange={(e) => setForm((p) => ({ ...p, channel_id: e.target.value }))}
                  placeholder="e.g. 1234567890123456789"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Channel Name</label>
                <Input
                  value={form.channel_name}
                  onChange={(e) => setForm((p) => ({ ...p, channel_name: e.target.value }))}
                  placeholder="e.g. general"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Server Name</label>
                <Input
                  value={form.server_name}
                  onChange={(e) => setForm((p) => ({ ...p, server_name: e.target.value }))}
                  placeholder="e.g. My RP Server"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Server ID</label>
                <Input
                  value={form.server_id}
                  onChange={(e) => setForm((p) => ({ ...p, server_id: e.target.value }))}
                  placeholder="e.g. 1234567890123456789"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={submitForm}>{editing ? "Update" : "Add"}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monitored Keywords</CardTitle>
          <CardDescription>
            {entries.length} entries · {entries.filter((e) => e.enabled).length} active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-6">
              No auto-find entries. Click "Add Entry" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-800 hover:border-gray-700 transition"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{entry.keyword}</span>
                      {!entry.enabled && (
                        <Badge variant="secondary" className="text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span>#{entry.channel_name || entry.channel_id || "—"}</span>
                      {entry.server_name && <span>{entry.server_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        entry.enabled ? "bg-green-600" : "bg-gray-700"
                      }`}
                      onClick={() => toggleEntry(entry.id)}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                          entry.enabled ? "translate-x-5 left-0.5" : "left-0.5"
                        }`}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(entry)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
