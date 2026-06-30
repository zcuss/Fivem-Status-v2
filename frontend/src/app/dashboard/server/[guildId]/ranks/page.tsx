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

interface SteamRank {
  id: string;
  rank_label: string;
  steam_hex: string;
  discord_role_id?: string;
  discord_role_name?: string;
  owner_discord_id?: string;
  created_at?: string;
  updated_at?: string;
}

export default function RanksPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [ranks, setRanks] = useState<SteamRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SteamRank | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    rank_label: "",
    steam_hex: "",
    discord_role_id: "",
    discord_role_name: "",
  });

  useEffect(() => {
    fetch(`${API}/api/servers/${guildId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const data = d?.data || {};
        setRanks(data.ranks || []);
        setOwnerId(data.owner_discord_id || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const filtered = ranks.filter(
    (r) =>
      r.rank_label.toLowerCase().includes(search.toLowerCase()) ||
      r.steam_hex.toLowerCase().includes(search.toLowerCase()) ||
      (r.discord_role_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.discord_role_id || "").includes(search)
  );

  const openAddForm = () => {
    setEditing(null);
    setForm({
      rank_label: "",
      steam_hex: "",
      discord_role_id: "",
      discord_role_name: "",
    });
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

  const submitForm = async () => {
    if (!form.rank_label.trim() || !form.steam_hex.trim()) return;
    let updated: SteamRank[];
    if (editing) {
      updated = ranks.map((r) =>
        r.id === editing.id
          ? { ...r, ...form, updated_at: new Date().toISOString() }
          : r
      );
    } else {
      const newRank: SteamRank = {
        id: `rank_${Date.now()}`,
        ...form,
        owner_discord_id: ownerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updated = [...ranks, newRank];
    }
    setRanks(updated);
    setShowForm(false);
    await persistRanks(updated);
  };

  const deleteRank = async (id: string) => {
    const updated = ranks.filter((r) => r.id !== id);
    setRanks(updated);
    await persistRanks(updated);
  };

  const persistRanks = async (data: SteamRank[]) => {
    setSaving(true);
    try {
      await fetch(`${API}/api/servers/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_discord_id: ownerId, ranks: data }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v?: string) => {
    if (!v) return "-";
    try {
      return new Date(v).toLocaleString("id-ID");
    } catch {
      return v;
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading steam ranks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-300">
            Steam Ranks Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Map Steam hex identifiers to Discord roles for in-game rank
            recognition.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{ranks.length} ranks</Badge>
          {saved && <Badge variant="success">Saved!</Badge>}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Total Ranks
            </p>
            <p className="text-2xl font-bold text-white">{ranks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              With Discord Role
            </p>
            <p className="text-2xl font-bold text-green-400">
              {ranks.filter((r) => r.discord_role_id).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Mapped Steam Hex
            </p>
            <p className="text-2xl font-bold text-blue-400">
              {ranks.filter((r) => r.steam_hex).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Owner
            </p>
            <p className="text-xs font-bold text-white truncate">
              {ownerId || "Not set"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Owner ID */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-blue-300">
            Owner Discord ID
          </CardTitle>
          <CardDescription>
            Discord user ID of the server owner for elevated permissions and rank
            management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md flex items-center gap-3">
            <Input
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              placeholder="1234567890123456789"
            />
            <Button
              size="sm"
              onClick={() => persistRanks(ranks)}
              disabled={saving}
            >
              Save Owner
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-blue-800/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-300">
              {editing ? "Edit Steam Rank" : "Add New Steam Rank"}
            </CardTitle>
            <CardDescription>
              Map a FiveM steam hex to a Discord role. Both fields with * are
              required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Rank Label *
                </label>
                <Input
                  value={form.rank_label}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rank_label: e.target.value }))
                  }
                  placeholder="Police Chief / EMS Director"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Steam Hex *
                </label>
                <Input
                  value={form.steam_hex}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, steam_hex: e.target.value }))
                  }
                  placeholder="steam:11000010abcdef0"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Discord Role ID
                </label>
                <Input
                  value={form.discord_role_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, discord_role_id: e.target.value }))
                  }
                  placeholder="1234567890123456789"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Discord Role Name
                </label>
                <Input
                  value={form.discord_role_name}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      discord_role_name: e.target.value,
                    }))
                  }
                  placeholder="Police Chief"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={submitForm}
                disabled={!form.rank_label.trim() || !form.steam_hex.trim()}
              >
                {editing ? "Update Rank" : "Add Rank"}
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
            placeholder="Search rank label, steam hex, role name..."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {ranks.length} ranks
          </span>
          {!showForm && (
            <Button size="sm" onClick={openAddForm}>
              + Add Rank
            </Button>
          )}
        </div>
      </div>

      {/* Ranks Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-blue-300">
              Steam Player Ranks
            </CardTitle>
            {saving && (
              <Badge variant="outline" className="text-xs">
                Saving...
              </Badge>
            )}
          </div>
          <CardDescription>
            All steam hex to Discord role mappings for this guild.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-blue-300 font-semibold mb-1">
                {ranks.length === 0
                  ? "No ranks configured yet"
                  : "No ranks match your search"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ranks.length === 0
                  ? "Add your first rank mapping using the button above."
                  : "Try adjusting your search filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3">Rank Label</th>
                    <th className="text-left py-2 px-3">Steam Hex</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">
                      Discord Role ID
                    </th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">
                      Discord Role Name
                    </th>
                    <th className="text-left py-2 px-3 hidden lg:table-cell">
                      Owner ID
                    </th>
                    <th className="text-left py-2 px-3 hidden lg:table-cell">
                      Created
                    </th>
                    <th className="text-left py-2 px-3 hidden lg:table-cell">
                      Updated
                    </th>
                    <th className="text-right py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rank) => (
                    <tr
                      key={rank.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <span className="text-blue-300 font-medium text-xs">
                          {rank.rank_label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <code className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {rank.steam_hex}
                        </code>
                      </td>
                      <td className="py-2.5 px-3 hidden md:table-cell text-xs font-mono text-muted-foreground">
                        {rank.discord_role_id || (
                          <span className="opacity-40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 hidden md:table-cell">
                        {rank.discord_role_name ? (
                          <Badge variant="outline" className="text-[10px]">
                            {rank.discord_role_name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground opacity-40">
                            -
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-muted-foreground font-mono">
                        {rank.owner_discord_id || (
                          <span className="opacity-40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {fmt(rank.created_at)}
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {fmt(rank.updated_at)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => openEditForm(rank)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-red-400 hover:text-red-300 hover:bg-red-950"
                            onClick={() => deleteRank(rank.id)}
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
