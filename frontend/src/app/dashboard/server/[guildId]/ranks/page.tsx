"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

interface SteamRank {
  id: string;
  rank_label: string;
  steam_hex: string;
  discord_role_id?: string;
  discord_role_name?: string;
}

interface RanksConfig {
  owner_discord_id?: string;
  ranks: SteamRank[];
}

export default function RanksPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [ranksConfig, setRanksConfig] = useState<RanksConfig>({ ranks: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SteamRank | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [form, setForm] = useState({
    rank_label: "",
    steam_hex: "",
    discord_role_id: "",
    discord_role_name: "",
  });

  useEffect(() => {
    fetch(`${API}/api/servers/${guildId}`)
      .then((r) => r.json())
      .then((d) => {
        const data = (d.data as any) || {};
        setRanksConfig({
          owner_discord_id: data.owner_discord_id || "",
          ranks: data.ranks || [],
        });
        setOwnerId(data.owner_discord_id || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const openAddForm = () => {
    setEditing(null);
    setForm({ rank_label: "", steam_hex: "", discord_role_id: "", discord_role_name: "" });
    setShowForm(true);
  };

  const openEditForm = (rank: SteamRank) => {
    setEditing(rank);
    setForm({
      rank_label: rank.rank_label,
      steam_hex: rank.steam_hex,
      discord_role_id: rank.discord_role_id || "",
      discord_role_name: rank.discord_role_name || "",
    });
    setShowForm(true);
  };

  const submitForm = () => {
    if (!form.rank_label.trim() || !form.steam_hex.trim()) return;
    if (editing) {
      setRanksConfig((prev) => ({
        ...prev,
        ranks: prev.ranks.map((r) =>
          r.id === editing.id ? { ...r, ...form } : r
        ),
      }));
    } else {
      const newRank: SteamRank = {
        id: `rank_${Date.now()}`,
        ...form,
      };
      setRanksConfig((prev) => ({
        ...prev,
        ranks: [...prev.ranks, newRank],
      }));
    }
    setShowForm(false);
  };

  const deleteRank = (id: string) => {
    setRanksConfig((prev) => ({
      ...prev,
      ranks: prev.ranks.filter((r) => r.id !== id),
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/servers/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_discord_id: ownerId,
          ranks: ranksConfig.ranks,
        }),
      });
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading ranks…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ranks</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openAddForm}>
            + Add Rank
          </Button>
          <Button onClick={saveAll} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Owner Discord ID */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Owner Discord ID</CardTitle>
          <CardDescription>
            Discord user ID of the server owner for elevated permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end max-w-md">
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1 block">Discord User ID</label>
              <Input
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                placeholder="e.g. 1234567890123456789"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editing ? "Edit Rank" : "New Rank"}
            </CardTitle>
            <CardDescription>
              Map a FiveM steam hex to a Discord role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Rank Label *</label>
                <Input
                  value={form.rank_label}
                  onChange={(e) => setForm((p) => ({ ...p, rank_label: e.target.value }))}
                  placeholder="e.g. Police Chief"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Steam Hex *</label>
                <Input
                  value={form.steam_hex}
                  onChange={(e) => setForm((p) => ({ ...p, steam_hex: e.target.value }))}
                  placeholder="e.g. steam:11000010abcdef0"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Discord Role ID</label>
                <Input
                  value={form.discord_role_id}
                  onChange={(e) => setForm((p) => ({ ...p, discord_role_id: e.target.value }))}
                  placeholder="e.g. 1234567890123456789"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Discord Role Name</label>
                <Input
                  value={form.discord_role_name}
                  onChange={(e) => setForm((p) => ({ ...p, discord_role_name: e.target.value }))}
                  placeholder="e.g. 🚔 Police Chief"
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

      {/* Rank List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Steam Ranks</CardTitle>
          <CardDescription>{ranksConfig.ranks.length} ranks configured</CardDescription>
        </CardHeader>
        <CardContent>
          {ranksConfig.ranks.length === 0 ? (
            <p className="text-gray-500 text-center py-6">
              No ranks configured. Click "Add Rank" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {ranksConfig.ranks.map((rank) => (
                <div
                  key={rank.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-800 hover:border-gray-700 transition"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{rank.rank_label}</span>
                      {rank.discord_role_name && (
                        <Badge variant="outline" className="text-[10px]">
                          {rank.discord_role_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{rank.steam_hex}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(rank)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => deleteRank(rank.id)}
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
