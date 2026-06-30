"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

const ROLE_ORDER: Record<string, number> = {
  bot: 0,
  admin: 1,
  dev: 2,
  premium: 3,
  donator: 4,
  custom: 5,
  user: 6,
};

type FilterType = "all" | "available" | "upgrade" | "admin";

interface BotCommand {
  name: string;
  description: string;
  tier: string;
  adminOnly: boolean;
  category: string;
}

const COMMANDS: BotCommand[] = [
  { name: "find", description: "Find a player in the server by name, ID, or identifier.", tier: "user", adminOnly: false, category: "search" },
  { name: "playtime", description: "Check the total playtime of a specific player.", tier: "user", adminOnly: false, category: "search" },
  { name: "profile", description: "View a player's full profile including stats and activity.", tier: "user", adminOnly: false, category: "search" },
  { name: "steamhex", description: "Look up a player's Steam hex identifier.", tier: "user", adminOnly: false, category: "search" },
  { name: "topplaytime", description: "Display the leaderboard of top players by playtime.", tier: "user", adminOnly: false, category: "search" },
  { name: "spy", description: "Monitor a player's real-time activity and actions.", tier: "premium", adminOnly: false, category: "monitoring" },
  { name: "setauto", description: "Set up an auto-find rule for a player or pattern.", tier: "premium", adminOnly: false, category: "auto" },
  { name: "delauto", description: "Remove an existing auto-find rule.", tier: "premium", adminOnly: false, category: "auto" },
  { name: "setrank", description: "Assign a rank to a user for server-specific permissions.", tier: "admin", adminOnly: true, category: "management" },
  { name: "delrank", description: "Remove a user's assigned rank.", tier: "admin", adminOnly: true, category: "management" },
  { name: "addserver", description: "Register a new FiveM server to the bot dashboard.", tier: "admin", adminOnly: true, category: "server" },
  { name: "editserver", description: "Edit configuration for an existing registered server.", tier: "admin", adminOnly: true, category: "server" },
  { name: "delserver", description: "Remove a registered server from the bot.", tier: "admin", adminOnly: true, category: "server" },
  { name: "listserver", description: "List all registered servers with their status.", tier: "donator", adminOnly: false, category: "server" },
  { name: "commandlogs", description: "View command execution history and audit trail.", tier: "donator", adminOnly: false, category: "logs" },
  { name: "setephemeral", description: "Toggle ephemeral responses for bot commands.", tier: "premium", adminOnly: false, category: "settings" },
  { name: "setvoice", description: "Configure voice presence monitoring for the server.", tier: "premium", adminOnly: false, category: "settings" },
  { name: "setup", description: "Run the initial server setup wizard.", tier: "user", adminOnly: true, category: "setup" },
  { name: "settings", description: "View and modify server settings from Discord.", tier: "donator", adminOnly: false, category: "settings" },
  { name: "botlist", description: "Display all available bots and their status.", tier: "user", adminOnly: false, category: "info" },
];

export default function CommandsPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [currentRole, setCurrentRole] = useState("user");
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/users?guild_id=${guildId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.data || [];
        if (list.length > 0) {
          setCurrentRole(list[0].role || "user");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const roleRank = ROLE_ORDER[currentRole] ?? 6;

  const isLocked = (cmd: BotCommand) => {
    const tierRank = ROLE_ORDER[cmd.tier] ?? 6;
    return tierRank < roleRank;
  };

  const filtered = COMMANDS.filter((cmd) => {
    if (filter === "all") return true;
    if (filter === "available") return !isLocked(cmd);
    if (filter === "upgrade") return isLocked(cmd);
    if (filter === "admin") return cmd.adminOnly;
    return true;
  });

  const upgradeCount = COMMANDS.filter((cmd) => isLocked(cmd)).length;
  const availableCount = COMMANDS.filter((cmd) => !isLocked(cmd)).length;

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      user: "secondary",
      donator: "outline",
      premium: "success",
      admin: "destructive",
      dev: "warning",
      bot: "destructive",
    };
    return (
      <Badge variant={(colors[tier] as any) || "secondary"} className="text-[9px] capitalize">
        {tier}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-muted-foreground">
          <i className="fa-solid fa-spinner fa-spin" />
          <span className="text-sm">Loading commands...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commands</h1>
          <p className="text-sm text-muted-foreground">
            Full command catalog with tier availability and admin access control.
          </p>
        </div>
        <Badge variant="outline">
          <i className="fa-solid fa-terminal mr-1" />
          {COMMANDS.length} Commands
        </Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <i className="fa-solid fa-shield-halved text-muted-foreground text-xs" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Your Role</p>
            <p className="text-xl font-bold text-foreground capitalize">{currentRole}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <i className="fa-solid fa-terminal text-muted-foreground text-xs" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Commands</p>
            <p className="text-xl font-bold text-foreground">{COMMANDS.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{availableCount} available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <i className="fa-solid fa-arrow-up text-yellow-500 text-xs" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Upgrade Needed</p>
            <p className="text-xl font-bold text-foreground">{upgradeCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">locked by tier</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { key: "all" as FilterType, label: "All", count: COMMANDS.length },
          { key: "available" as FilterType, label: "Available", count: availableCount },
          { key: "upgrade" as FilterType, label: "Upgrade Needed", count: upgradeCount },
          { key: "admin" as FilterType, label: "Admin Only", count: COMMANDS.filter((c) => c.adminOnly).length },
        ]).map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className="text-xs"
          >
            {f.label}
            <Badge variant="secondary" className="text-[9px] ml-1.5">
              {f.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Command Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((cmd) => {
          const locked = isLocked(cmd);
          return (
            <Card
              key={cmd.name}
              className={`${locked ? "opacity-60 border-border/50" : "hover:border-foreground/20"} transition-colors`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Top row: name + badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground">/{cmd.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {tierBadge(cmd.tier)}
                    {cmd.adminOnly && (
                      <Badge variant="warning" className="text-[9px]">
                        <i className="fa-solid fa-lock mr-0.5" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cmd.description}
                </p>

                {/* Status */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {cmd.category}
                  </span>
                  {locked ? (
                    <Badge variant="outline" className="text-[9px] text-yellow-500 border-yellow-500/30">
                      <i className="fa-solid fa-lock mr-0.5" />
                      Requires {cmd.tier}
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-[9px]">
                      <i className="fa-solid fa-check mr-0.5" />
                      Available
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <i className="fa-solid fa-magnifying-glass text-muted-foreground/30 text-3xl mb-3 block" />
            <p className="text-sm text-muted-foreground">No commands match this filter</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Try a different filter or check your role</p>
          </CardContent>
        </Card>
      )}

      {/* Footer note */}
      <div className="bg-secondary/30 border border-border text-muted-foreground text-xs px-4 py-3 rounded-lg">
        <i className="fa-solid fa-info-circle mr-1.5" />
        Tier requirements are enforced server-side. Upgrade your role to unlock more commands.
        Admin-only commands require explicit admin permissions regardless of tier.
      </div>
    </div>
  );
}
