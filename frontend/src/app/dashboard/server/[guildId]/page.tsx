"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

interface GuildInfo {
  memberCount?: number;
  textCount?: number;
  voiceCount?: number;
  categoryCount?: number;
  roleCount?: number;
}

interface BotHealth {
  status?: string;
  latencyMs?: string | number;
  lastRefresh?: string;
  lastError?: string;
  db?: { status?: string; latencyMs?: number | null };
  discordApi?: { status?: string; latencyMs?: number | null };
}

interface ServerData {
  name?: string;
  guild_id?: string;
  autofind?: any[];
  config?: {
    defaultEphemeral?: boolean;
    voicePresence?: { enabled?: boolean };
  };
}

interface UserRole {
  discord_id?: string;
  username?: string;
  role?: string;
  server_key?: string;
}

export default function ServerDashboardPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [guildInfo, setGuildInfo] = useState<GuildInfo>({});
  const [botHealth, setBotHealth] = useState<BotHealth | null>(null);
  const [serverData, setServerData] = useState<ServerData>({});
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const s = controller.signal;

    Promise.all([
      fetch(`${API}/api/guild-info/${guildId}`, { signal: s })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${API}/api/servers/${guildId}`, { signal: s })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${API}/api/bots/health`, { signal: s })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${API}/api/users`, { signal: s })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([info, server, health, userData]) => {
      if (info) setGuildInfo(info);
      if (server?.data) setServerData(server.data);
      if (health) setBotHealth(health.data || health);
      if (userData) {
        const list = Array.isArray(userData) ? userData : userData?.data || [];
        setUsers(list.filter((u: UserRole) => u.server_key === guildId || !u.server_key));
      }
      setLoading(false);
    });

    return () => controller.abort();
  }, [guildId]);

  const copyServerId = async () => {
    await navigator.clipboard.writeText(guildId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const autoFindCount = serverData.autofind?.length ?? 0;

  const healthBadge = (status?: string) => {
    if (status === "healthy") return <Badge variant="success">healthy</Badge>;
    if (status === "degraded") return <Badge variant="warning">degraded</Badge>;
    if (status === "down") return <Badge variant="destructive">down</Badge>;
    return <Badge variant="secondary">{status || "unknown"}</Badge>;
  };

  const ROLE_ORDER: Record<string, number> = {
    bot: 0,
    admin: 1,
    dev: 2,
    premium: 3,
    donator: 4,
    custom: 5,
    user: 6,
  };

  const sortedUsers = [...users].sort((a, b) => {
    const ra = ROLE_ORDER[a.role || "user"] ?? 99;
    const rb = ROLE_ORDER[b.role || "user"] ?? 99;
    if (ra !== rb) return ra - rb;
    return (a.username || "").localeCompare(b.username || "");
  });

  // Determine current user's role (first match or fallback)
  const currentUserRole = sortedUsers.length > 0 ? sortedUsers[0].role || "user" : "user";

  // Calculate limits based on role
  const roleLimits: Record<string, number | string> = {
    bot: "INF",
    admin: "INF",
    dev: 50,
    premium: 25,
    donator: 15,
    custom: 10,
    user: 5,
  };
  const userLimit = roleLimits[currentUserRole] ?? 5;
  const usagePct =
    typeof userLimit === "string"
      ? 100
      : userLimit > 0
      ? Math.min(100, (autoFindCount / userLimit) * 100)
      : 0;

  // Onboarding checklist
  const onboardingItems = [
    { label: "Bot added to server", done: true },
    { label: "Server config created", done: !!serverData.guild_id },
    { label: "Auto Find configured", done: autoFindCount > 0 },
    { label: "Default ephemeral set", done: !!serverData.config?.defaultEphemeral },
    { label: "Voice presence enabled", done: !!serverData.config?.voicePresence?.enabled },
  ];
  const onboardingDone = onboardingItems.filter((i) => i.done).length;

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-muted-foreground">
          <i className="fa-solid fa-spinner fa-spin" />
          <span className="text-sm">Loading server dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Server Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Server overview, account plan, and bot health at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyServerId}>
            <i className="fa-regular fa-clipboard mr-1.5" />
            {copied ? "Copied!" : "Copy Server ID"}
          </Button>
          <Badge variant="outline">
            <i className="fa-solid fa-server mr-1" />
            {guildId.slice(0, 8)}...
          </Badge>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Members", value: guildInfo.memberCount ?? "-", icon: "fa-users" },
          { label: "Text Channels", value: guildInfo.textCount ?? "-", icon: "fa-comment" },
          { label: "Voice Channels", value: guildInfo.voiceCount ?? "-", icon: "fa-headphones" },
          { label: "Categories", value: guildInfo.categoryCount ?? "-", icon: "fa-folder" },
          { label: "Roles", value: guildInfo.roleCount ?? "-", icon: "fa-shield-halved" },
          { label: "Auto Find", value: autoFindCount, icon: "fa-magnifying-glass" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <i className={`fa-solid ${m.icon} text-muted-foreground text-xs`} />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {m.label}
              </p>
              <p className="text-xl font-bold text-foreground">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Plan + Bot Health + Onboarding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Plan Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-crown text-yellow-500" />
                Account Plan
              </CardTitle>
              <Badge variant="outline" className="text-xs capitalize">
                {currentUserRole}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Role</p>
                <p className="text-lg font-bold text-foreground capitalize">{currentUserRole}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Limit</p>
                <p className="text-lg font-bold text-foreground">{userLimit}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Used</p>
                <p className="text-lg font-bold text-foreground">{autoFindCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Remaining</p>
                <p className="text-lg font-bold text-foreground">
                  {typeof userLimit === "string" ? "INF" : Math.max(0, userLimit - autoFindCount)}
                </p>
              </div>
            </div>
            {/* Usage bar */}
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Usage</span>
                <span>
                  {autoFindCount} / {userLimit}
                </span>
              </div>
              <div className="h-2.5 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePct >= 90 ? "bg-red-500" : usagePct >= 60 ? "bg-yellow-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(100, usagePct)}%` }}
                />
              </div>
            </div>
            {/* Tier hierarchy */}
            <div className="border-t border-border pt-3">
              <p className="text-[10px] uppercase text-muted-foreground mb-2">Role Hierarchy</p>
              <div className="flex flex-wrap gap-1">
                {["bot", "admin", "dev", "premium", "donator", "custom", "user"].map((r) => (
                  <Badge
                    key={r}
                    variant={r === currentUserRole ? "default" : "secondary"}
                    className="text-[9px] capitalize"
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bot Health Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-heart-pulse text-green-500" />
                Bot Health
              </CardTitle>
              {healthBadge(botHealth?.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Status</p>
                <p className="text-sm font-bold text-foreground capitalize">
                  {botHealth?.status || "unknown"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Latency</p>
                <p className="text-sm font-bold text-foreground">
                  {botHealth?.latencyMs ?? "-"}ms
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Last Refresh</p>
                <p className="text-xs text-muted-foreground">
                  {botHealth?.lastRefresh
                    ? new Date(botHealth.lastRefresh).toLocaleString()
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Last Error</p>
                <p className="text-xs text-muted-foreground truncate">
                  {botHealth?.lastError || "None"}
                </p>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] uppercase text-muted-foreground mb-2">Endpoints</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/30 rounded-lg p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">Database</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      variant={botHealth?.db?.status === "healthy" ? "success" : "secondary"}
                      className="text-[9px]"
                    >
                      {botHealth?.db?.status || "-"}
                    </Badge>
                    {botHealth?.db?.latencyMs != null && (
                      <span className="text-[9px] text-muted-foreground">
                        {botHealth.db.latencyMs}ms
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">Discord API</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      variant={
                        botHealth?.discordApi?.status === "healthy" ? "success" : "secondary"
                      }
                      className="text-[9px]"
                    >
                      {botHealth?.discordApi?.status || "-"}
                    </Badge>
                    {botHealth?.discordApi?.latencyMs != null && (
                      <span className="text-[9px] text-muted-foreground">
                        {botHealth.discordApi.latencyMs}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Checklist */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-list-check text-blue-400" />
                Onboarding
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {onboardingDone}/{onboardingItems.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress bar */}
            <div>
              <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(onboardingDone / onboardingItems.length) * 100}%` }}
                />
              </div>
            </div>
            {/* Checklist */}
            {onboardingItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 py-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    item.done
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : "bg-secondary text-muted-foreground border border-border"
                  }`}
                >
                  {item.done ? (
                    <i className="fa-solid fa-check" />
                  ) : (
                    <i className="fa-solid fa-minus" />
                  )}
                </div>
                <span
                  className={`text-xs ${
                    item.done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
                {item.done && (
                  <Badge variant="success" className="text-[8px] ml-auto">
                    Done
                  </Badge>
                )}
              </div>
            ))}
            {onboardingDone === onboardingItems.length && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center mt-2">
                <i className="fa-solid fa-circle-check text-green-500 mb-1" />
                <p className="text-xs text-green-400 font-medium">
                  Server fully configured!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registered Users */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <i className="fa-solid fa-users text-muted-foreground" />
              Registered Users
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {sortedUsers.length} users
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {sortedUsers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">No users registered for this server yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3">User</th>
                    <th className="text-left py-2 px-3">Discord ID</th>
                    <th className="text-left py-2 px-3">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((u, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-secondary/30"
                    >
                      <td className="py-2 px-3 text-foreground text-xs font-medium">
                        {u.username || "-"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs font-mono">
                        {u.discord_id || "-"}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={
                            u.role === "admin"
                              ? "destructive"
                              : u.role === "dev"
                              ? "warning"
                              : u.role === "premium"
                              ? "success"
                              : "secondary"
                          }
                          className="text-[10px] capitalize"
                        >
                          {u.role || "user"}
                        </Badge>
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
