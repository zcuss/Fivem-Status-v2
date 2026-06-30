"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HydrationGuard } from "@/components/HydrationGuard";
import { Input } from "@/components/ui/input";
import type { DiscordGuild } from "@/lib/types";

// --- Constants ---
const DISCORD_CLIENT_ID = "1423657862810304704";
const BOT_INVITE_BASE = (() => {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", DISCORD_CLIENT_ID);
  url.searchParams.set("scope", "bot applications.commands");
  url.searchParams.set("permissions", "8");
  return url.toString();
})();

// --- Helpers ---
function guildIconUrl(guild: { id: string; icon?: string | null }) {
  if (guild.icon) {
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
  }
  return null;
}

function guildInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function isAdminGuild(guild: DiscordGuild) {
  if (guild.owner) return true;
  const perms = Number(guild.permissions);
  return Number.isFinite(perms) && (perms & 0x8) === 0x8;
}

// --- Types ---
interface ServerCard {
  id: string;
  name: string;
  icon: string | null;
  initials: string;
  autoFindCount: number;
  activityCount: number;
  isFavorite: boolean;
  group: "admin" | "other";
}

// --- Component ---
export default function DashboardPage() {
  const router = useRouter();
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [botGuildIds, setBotGuildIds] = useState<Set<string>>(new Set());
  const [autoMap, setAutoMap] = useState<Record<string, number>>({});
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Session
  const [role, setRole] = useState<string>("user");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (meRes.ok) {
        const me = await meRes.json();
        if (me?.ok && me.data) {
          setGuilds(me.data.guilds || []);
          setRole(me.data.role || "user");
        }
      }
    } catch {
      // ignore
    }
    fetchDashboardData();
  }

  async function fetchDashboardData() {
    try {
      const [favoritesRes, botGuildsRes] = await Promise.all([
        fetch("/api/favorites/list", { cache: "no-store" }).catch(() => null),
        fetch("/api/bot-guilds", { cache: "no-store" }).catch(() => null),
      ]);

      if (botGuildsRes?.ok) {
        const data = await botGuildsRes.json();
        if (Array.isArray(data.guildIds)) {
          setBotGuildIds(new Set(data.guildIds.map(String)));
        }
      }

      if (favoritesRes?.ok) {
        const data = await favoritesRes.json();
        if (Array.isArray(data.favorites)) {
          setFavoriteIds(new Set(data.favorites.map(String)));
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  // Build server cards from guilds + favorite/auto data
  const serverCards = useMemo<ServerCard[]>(() => {
    return guilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      initials: guildInitials(g.name),
      autoFindCount: autoMap[g.id] || 0,
      activityCount: activityMap[g.id] || 0,
      isFavorite: favoriteIds.has(g.id),
      group: isAdminGuild(g) ? "admin" : "other",
    }));
  }, [guilds, favoriteIds, autoMap, activityMap]);

  const totalServers = serverCards.length;
  const totalAutoFind = useMemo(
    () => Object.values(autoMap).reduce((s, n) => s + n, 0),
    [autoMap]
  );
  const totalActivity = useMemo(
    () => Object.values(activityMap).reduce((s, n) => s + n, 0),
    [activityMap]
  );
  const adminCount = useMemo(
    () => serverCards.filter((c) => c.group === "admin").length,
    [serverCards]
  );
  const otherCount = useMemo(
    () => serverCards.filter((c) => c.group === "other").length,
    [serverCards]
  );

  // Filter + search
  const filteredCards = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return serverCards.filter((card) => {
      if (activeFilter === "favorite" && !card.isFavorite) return false;
      if (activeFilter === "admin" && card.group !== "admin") return false;
      if (activeFilter === "other" && card.group !== "other") return false;
      if (needle) {
        return (
          card.name.toLowerCase().includes(needle) ||
          card.id.toLowerCase().includes(needle)
        );
      }
      return true;
    });
  }, [serverCards, activeFilter, searchQuery]);

  const visibleCount = filteredCards.length;

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (guildId: string) => {
      try {
        const res = await fetch("/api/favorites/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guildId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const isFav = !!data?.isFavorite;
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(guildId);
          else next.delete(guildId);
          return next;
        });
      } catch {
        // ignore
      }
    },
    []
  );

  const botInviteUrlForGuild = (guildId: string) => {
    const url = new URL(BOT_INVITE_BASE);
    url.searchParams.set("guild_id", guildId);
    return url.toString();
  };

  // -- Filters config --
  const filterButtons = [
    { key: "all", label: "All" },
    { key: "favorite", label: "Favorites" },
    { key: "admin", label: "Admin" },
    { key: "other", label: "Other" },
  ];

  return (
    <HydrationGuard>
    <div className="space-y-6 p-4 lg:p-6">
      {/* -- Header -- */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Kelola server dengan cepat dalam tampilan sederhana.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={BOT_INVITE_BASE}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline" size="sm">
              <span className="mr-1">💬</span> Invite Bot
            </Button>
          </a>
          {role === "dev" && (
            <>
              <Link href="/users">
                <Button variant="outline" size="sm">
                  <span className="mr-1">👥</span> Users
                </Button>
              </Link>
              <Link href="/dashboard/dev-docs">
                <Button variant="outline" size="sm">
                  <span className="mr-1">📝</span> Dev Docs
                </Button>
              </Link>
            </>
          )}
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <span className="mr-1">⭐</span> Premium
          </Button>
        </div>
      </section>

      {/* -- Stats Row -- */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Servers</p>
            <p className="text-3xl font-bold mt-1">{loading ? "—" : totalServers}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Admin: {adminCount} | Other: {otherCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Auto Find</p>
            <p className="text-3xl font-bold mt-1">{loading ? "—" : totalAutoFind}</p>
            <p className="text-xs text-muted-foreground mt-1">Used by all listed servers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Activity</p>
            <p className="text-3xl font-bold mt-1">{loading ? "—" : totalActivity}</p>
            <p className="text-xs text-muted-foreground mt-1">Recent command activity</p>
          </CardContent>
        </Card>
      </section>

      {/* -- Server List Section -- */}
      <section className="rounded-xl border border-border bg-card p-6">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              Daftar Workspace Server
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Filter berdasarkan favorite atau ownership, lalu buka workspace
              server yang ingin kamu kelola.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            🗂 {totalServers} server
          </Badge>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {filterButtons.map((fb) => (
              <Button
                key={fb.key}
                variant={activeFilter === fb.key ? "default" : "outline"}
                size="sm"
                className="font-semibold"
                onClick={() => setActiveFilter(fb.key)}
              >
                {fb.label}
              </Button>
            ))}
            <Badge variant="outline" className="ml-1 text-xs">
              Visible: {visibleCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2" style={{ maxWidth: 320, width: "100%" }}>
            <Input
              type="text"
              placeholder="Cari nama atau ID server"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm"
            />
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Server grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-lg border border-border bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCards.map((guild) => {
              const inBot = botGuildIds.has(guild.id);
              const icon = guildIconUrl({ id: guild.id, icon: guild.icon });

              return (
                <div
                  key={guild.id}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/dashboard/server/${guild.id}`)}
                >
                  <Card className="h-full transition-colors group-hover:border-muted bg-card/60">
                    <CardContent className="flex items-center gap-3 pt-6 pb-6">
                      {/* Guild icon */}
                      {icon ? (
                        <img
                          src={icon}
                          alt=""
                          width={44}
                          height={44}
                          loading="lazy"
                          decoding="async"
                          className="rounded-lg border border-border flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="rounded-lg bg-muted text-muted-foreground flex items-center justify-center font-semibold flex-shrink-0"
                          style={{ width: 44, height: 44 }}
                        >
                          {guild.initials}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-grow min-w-0">
                        <div className="font-semibold truncate">
                          {guild.name}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {guild.id}
                        </div>
                        <div className="text-xs text-primary">
                          Auto Find: {guild.autoFindCount}
                        </div>
                        {/* Bot status */}
                        <div className="text-xs mt-1">
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-1 ${
                              inBot ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-muted-foreground">
                            {inBot ? "Bot siap di server" : "Bot belum join server"}
                          </span>
                        </div>
                        {/* Invite button (show when bot not in guild) */}
                        {!inBot && (
                          <div className="mt-2">
                            <a
                              href={botInviteUrlForGuild(guild.id)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 font-semibold"
                              >
                                <span className="mr-1">➕</span> Invite ke Server
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Favorite toggle */}
                      <button
                        type="button"
                        className={`flex-shrink-0 p-1.5 rounded-md transition-colors ${
                          guild.isFavorite
                            ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                            : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                        title="Toggle favorite"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(guild.id);
                        }}
                      >
                        {guild.isFavorite ? "★" : "☆"}
                      </button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16">
            <div className="text-muted-foreground text-lg font-semibold mb-2">
              {searchQuery
                ? "Tidak ada server yang cocok"
                : "Belum ada server yang bisa ditampilkan"}
            </div>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? "Coba ubah filter atau kata pencarian untuk melihat workspace lain."
                : "Cek hak akses Discord atau invite bot ke server lain agar workspace mulai terisi."}
            </p>
          </div>
        )}
      </section>
    </div>
    </HydrationGuard>
  );
}
