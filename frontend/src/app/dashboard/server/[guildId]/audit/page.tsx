"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

interface AuditRow {
  time: string;
  action: string;
  actor: string;
  target: string;
  detail: string;
}

const ACTION_TYPES = ["all", "server_config", "moderation", "server_log", "system"] as const;
type ActionType = (typeof ACTION_TYPES)[number];

const PAGE_SIZE = 20;

function parseAuditEntry(entry: LogEntry): AuditRow {
  const msg = entry.message || "";
  const parts = msg.split(" | ");
  return {
    time: entry.timestamp,
    action: entry.source || "server_log",
    actor: parts[0]?.trim() || "system",
    target: parts[1]?.trim() || "-",
    detail: parts.slice(2).join(" | ").trim() || msg,
  };
}

function actionBadgeColor(action: string): string {
  if (action === "moderation") return "bg-red-500/15 text-red-400 border-red-500/20";
  if (action === "server_config") return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  if (action === "server_log") return "bg-blue-500/15 text-blue-400 border-blue-500/20";
  return "bg-purple-500/15 text-purple-400 border-purple-500/20";
}

export default function AuditPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ActionType>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/logs`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: any) => {
        const entries = Array.isArray(data) ? data : data?.data || [];
        const auditEntries = entries.filter(
          (e: any) => e.source === "server_logs" || e.source === "moderation_logs" || e.source === "server_config"
        );
        setLogs(auditEntries.map(parseAuditEntry));
      })
      .catch((err) => setError(err.message || "Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, [guildId]);

  const filtered = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter((r) => r.action.includes(filter));
  }, [logs, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-8 w-48 rounded bg-muted" />
        <div className="animate-pulse h-12 rounded-lg bg-muted" />
        <div className="animate-pulse h-[28rem] rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-blue-400" /> Audit Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Admin actions and configuration changes across this server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
            Admin
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => window.open(`/api/logs?format=csv`, "_blank")}
          >
            <i className="fa-solid fa-download mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">Filter by action:</span>
            <div className="flex flex-wrap gap-1.5">
              {ACTION_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    filter === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "All" : t.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <i className="fa-solid fa-circle-exclamation mr-2" />
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody>
                {paged.length > 0 ? (
                  paged.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(row.time).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${actionBadgeColor(
                            row.action
                          )}`}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {row.actor}
                      </td>
                      <td className="px-4 py-3 text-foreground text-xs">
                        {row.target}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                        {row.detail}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <i className="fa-solid fa-clipboard-check text-3xl text-muted-foreground/50 mb-3 block" />
                      <p className="text-muted-foreground font-medium">No audit entries</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {filter !== "all"
                          ? `No entries matching "${filter.replace(/_/g, " ")}" filter.`
                          : "Audit trail is empty. Actions will appear here as they occur."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <i className="fa-solid fa-chevron-left" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8 w-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <i className="fa-solid fa-chevron-right" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
