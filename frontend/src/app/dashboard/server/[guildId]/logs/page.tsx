"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const API = "http://localhost:34002";

type LogType = "commands" | "moderation" | "audit";

interface LogEntry {
  id: string;
  type: string;
  user?: string;
  user_id?: string;
  command?: string;
  action?: string;
  details?: string;
  timestamp: string;
}

const PAGE_SIZE = 20;

export default function LogsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<LogType>("commands");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const endpoint =
      logType === "commands"
        ? `/api/logs/commands?guild_id=${guildId}&page=1&limit=${PAGE_SIZE}`
        : `/api/logs/bot?guild_id=${guildId}&type=${logType}&page=1&limit=${PAGE_SIZE}`;

    fetch(`${API}${endpoint}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.data || []);
        setTotalPages(d.total_pages || Math.ceil((d.total || 0) / PAGE_SIZE) || 1);
      })
      .catch(() => {
        setLogs([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [guildId, logType]);

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setLoading(true);
    setPage(newPage);

    const endpoint =
      logType === "commands"
        ? `/api/logs/commands?guild_id=${guildId}&page=${newPage}&limit=${PAGE_SIZE}`
        : `/api/logs/bot?guild_id=${guildId}&type=${logType}&page=${newPage}&limit=${PAGE_SIZE}`;

    fetch(`${API}${endpoint}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.data || []);
        setTotalPages(d.total_pages || Math.ceil((d.total || 0) / PAGE_SIZE) || 1);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  const filteredLogs = logs.filter((log) => {
    if (dateFilter) {
      const logDate = log.timestamp?.split("T")[0];
      if (logDate !== dateFilter) return false;
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const text = `${log.user || ""} ${log.command || ""} ${log.action || ""} ${log.details || ""}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const typeLabels: Record<LogType, string> = {
    commands: "Command Logs",
    moderation: "Moderation Logs",
    audit: "Audit Logs",
  };

  const tabTypes: LogType[] = ["commands", "moderation", "audit"];

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Logs</h1>

      {/* Tab Selector */}
      <div className="flex gap-1 border border-gray-800 rounded-lg p-1 w-fit">
        {tabTypes.map((type) => (
          <button
            key={type}
            onClick={() => setLogType(type)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              logType === type
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            {typeLabels[type]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-400 mb-1 block">Search</label>
              <Input
                placeholder="Filter by user, command, action…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-44"
              />
            </div>
            {(dateFilter || searchFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter("");
                  setSearchFilter("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{typeLabels[logType]}</CardTitle>
          <CardDescription>
            {filteredLogs.length} entries on page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-gray-500 text-center py-8">Loading logs…</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No logs found</div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-3 px-3 rounded-md hover:bg-gray-800/50 transition border-b border-gray-800/50 last:border-0"
                >
                  <Badge variant={log.type === "error" ? "destructive" : log.type === "moderation" ? "warning" : "secondary"} className="shrink-0 mt-0.5">
                    {log.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {log.user && (
                        <span className="font-medium text-sm">{log.user}</span>
                      )}
                      {log.command && (
                        <span className="font-mono text-xs text-gray-400">
                          /{log.command}
                        </span>
                      )}
                      {log.action && (
                        <span className="text-xs text-gray-400">{log.action}</span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{log.details}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
              >
                ← Previous
              </Button>
              <span className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(page + 1)}
                disabled={page >= totalPages}
              >
                Next →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
