"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

interface CommandLog {
  command_name: string;
  discord_id: string;
  guild_id?: string;
  display_name?: string;
  username?: string;
  created_at?: string;
}

export default function AnalyticsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [commands, setCommands] = useState<CommandLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/logs/commands?guild_id=${guildId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const logs = d?.data || d?.commands || [];
        setCommands(Array.isArray(logs) ? logs : []);
      })
      .catch(() => {
        // Fallback: fetch all commands and filter
        fetch(`${API}/api/logs/commands`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            const logs = d?.data || d?.commands || [];
            const filtered = Array.isArray(logs)
              ? logs.filter(
                  (l: CommandLog) =>
                    l.guild_id === guildId ||
                    !l.guild_id
                )
              : [];
            setCommands(filtered);
          })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const stats = useMemo(() => {
    const totalCommands = commands.length;

    const userMap = new Map<string, { name: string; count: number }>();
    commands.forEach((c) => {
      const key = c.discord_id;
      const existing = userMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        userMap.set(key, {
          name: c.display_name || c.username || c.discord_id.slice(0, 8),
          count: 1,
        });
      }
    });
    const uniqueUsers = userMap.size;

    const cmdMap = new Map<string, number>();
    commands.forEach((c) => {
      const name = c.command_name || "unknown";
      cmdMap.set(name, (cmdMap.get(name) || 0) + 1);
    });
    const sortedCmds = Array.from(cmdMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const mostUsedCmd = sortedCmds[0] || ["-", 0];

    // Peak hour analysis
    const hourMap = new Map<number, number>();
    commands.forEach((c) => {
      if (c.created_at) {
        try {
          const h = new Date(c.created_at).getHours();
          hourMap.set(h, (hourMap.get(h) || 0) + 1);
        } catch {}
      }
    });
    let peakHour = 0;
    let peakCount = 0;
    hourMap.forEach((count, hour) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = hour;
      }
    });

    // Daily usage for chart
    const dayMap = new Map<string, number>();
    commands.forEach((c) => {
      if (c.created_at) {
        try {
          const d = c.created_at.slice(0, 10);
          dayMap.set(d, (dayMap.get(d) || 0) + 1);
        } catch {}
      }
    });
    const dailyUsage = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14); // last 14 days

    // Top users
    const topUsers = Array.from(userMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15);

    // Hourly distribution
    const hourlyDist = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourMap.get(i) || 0,
    }));

    // Command breakdown
    const cmdBreakdown = sortedCmds.slice(0, 10);

    return {
      totalCommands,
      uniqueUsers,
      mostUsedCmd,
      peakHour,
      peakCount,
      dailyUsage,
      topUsers,
      hourlyDist,
      cmdBreakdown,
      maxDaily: Math.max(1, ...dailyUsage.map(([, c]) => c)),
      maxHourly: Math.max(1, ...hourlyDist.map((h) => h.count)),
      maxCmdCount: Math.max(1, ...cmdBreakdown.map(([, c]) => c)),
    };
  }, [commands]);

  if (loading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-300">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Command usage metrics, user activity, and peak hours for this guild.
          </p>
        </div>
        <Badge variant="outline">{commands.length} total logs</Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Total Commands
            </p>
            <p className="text-3xl font-bold text-white">
              {stats.totalCommands}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Unique Users
            </p>
            <p className="text-3xl font-bold text-blue-400">
              {stats.uniqueUsers}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Most Used Command
            </p>
            <p className="text-xl font-bold text-green-400 truncate">
              /{stats.mostUsedCmd[0]}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.mostUsedCmd[1]} uses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Peak Hour
            </p>
            <p className="text-3xl font-bold text-yellow-400">
              {stats.peakHour}:00
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.peakCount} commands
            </p>
          </CardContent>
        </Card>
      </div>

      {commands.length === 0 ? (
        <Card className="bg-secondary/60 border-border">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground font-semibold mb-1">
                No command data available
              </p>
              <p className="text-sm text-muted-foreground">
                Analytics will populate once commands are used in this guild.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Daily Usage Chart */}
          <Card className="bg-secondary/60 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-blue-300">
                Daily Command Usage
              </CardTitle>
              <CardDescription>
                Commands executed per day (last {stats.dailyUsage.length} days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {stats.dailyUsage.map(([day, count]) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0 font-mono">
                      {day}
                    </span>
                    <div className="flex-1 bg-gray-800/50 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.round(
                            (count / stats.maxDaily) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right font-mono">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hourly Distribution + Command Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hourly Distribution */}
            <Card className="bg-secondary/60 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-blue-300">
                  Hourly Distribution
                </CardTitle>
                <CardDescription>
                  Commands by hour of day (24h)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-1">
                  {stats.hourlyDist.map((h) => (
                    <div
                      key={h.hour}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-full flex flex-col justify-end h-20">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            h.hour === stats.peakHour
                              ? "bg-yellow-400"
                              : "bg-blue-500/70"
                          }`}
                          style={{
                            height: `${Math.round(
                              (h.count / stats.maxHourly) * 100
                            )}%`,
                            minHeight: h.count > 0 ? "4px" : "0px",
                          }}
                        />
                      </div>
                      <span className="text-[8px] text-muted-foreground">
                        {h.hour}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Peak:{" "}
                  <span className="text-yellow-400 font-medium">
                    {stats.peakHour}:00
                  </span>{" "}
                  ({stats.peakCount} commands)
                </p>
              </CardContent>
            </Card>

            {/* Command Breakdown */}
            <Card className="bg-secondary/60 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-blue-300">
                  Top Commands
                </CardTitle>
                <CardDescription>
                  Most frequently used commands
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.cmdBreakdown.map(([name, count]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs text-blue-300 font-medium w-24 shrink-0 truncate">
                        /{name}
                      </span>
                      <div className="flex-1 bg-gray-800/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-green-500/80 h-2.5 rounded-full transition-all"
                          style={{
                            width: `${Math.round(
                              (count / stats.maxCmdCount) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right font-mono">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Users */}
          <Card className="bg-secondary/60 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-blue-300">
                Top Users
              </CardTitle>
              <CardDescription>
                Most active users by command count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 px-3">#</th>
                      <th className="text-left py-2 px-3">User</th>
                      <th className="text-left py-2 px-3 hidden md:table-cell">
                        Discord ID
                      </th>
                      <th className="text-right py-2 px-3">Commands</th>
                      <th className="text-left py-2 px-3 w-32">Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topUsers.map(([id, user], idx) => {
                      const maxUser = stats.topUsers[0]?.[1].count || 1;
                      return (
                        <tr
                          key={id}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="py-2 px-3 text-muted-foreground text-xs font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-sm font-medium text-foreground">
                              {user.name}
                            </span>
                          </td>
                          <td className="py-2 px-3 hidden md:table-cell text-xs text-muted-foreground font-mono">
                            {id}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Badge variant="outline" className="text-[10px]">
                              {user.count}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.round(
                                    (user.count / maxUser) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Command Usage Table */}
          <Card className="bg-secondary/60 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-blue-300">
                Daily Breakdown
              </CardTitle>
              <CardDescription>
                Per-day command counts in tabular form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-right py-2 px-3">Commands</th>
                      <th className="text-left py-2 px-3 w-40">Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.dailyUsage.map(([day, count]) => (
                      <tr
                        key={day}
                        className="border-b border-border/50 hover:bg-secondary/30"
                      >
                        <td className="py-1.5 px-3 text-muted-foreground text-xs font-mono">
                          {day}
                        </td>
                        <td className="py-1.5 px-3 text-right text-xs font-mono">
                          {count}
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${Math.round(
                                  (count / stats.maxDaily) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
