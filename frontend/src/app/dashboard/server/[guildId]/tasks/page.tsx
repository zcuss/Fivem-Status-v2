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

type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

interface Task {
  id: number;
  title: string;
  detail?: string;
  status: TaskStatus;
  priority: string;
  source?: string;
  assignee?: string;
  suggested_action?: string;
  target_paths?: string;
  last_result?: string;
  created_at?: string;
  updated_at?: string;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  open: {
    label: "Open",
    color: "text-blue-400",
    bg: "bg-blue-950/30",
    border: "border-blue-800/40",
  },
  in_progress: {
    label: "In Progress",
    color: "text-yellow-400",
    bg: "bg-yellow-950/30",
    border: "border-yellow-800/40",
  },
  done: {
    label: "Done",
    color: "text-green-400",
    bg: "bg-green-950/30",
    border: "border-green-800/40",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-muted-foreground",
    bg: "bg-secondary/30",
    border: "border-border",
  },
};

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "outline" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

function fmt(v?: string) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("id-ID");
  } catch {
    return v;
  }
}

export default function TasksPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    detail: "",
    priority: "medium",
    source: "",
    assignee: "",
  });

  useEffect(() => {
    fetch(`${API}/api/servers/${guildId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const data = d?.data || {};
        setTasks(data.tasks || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.detail || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.source || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.assignee || "").toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    open: tasks.filter((t) => t.status === "open").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length,
  };

  const addTask = async () => {
    if (!form.title.trim()) return;
    try {
      const res = await fetch(`${API}/api/servers/${guildId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          detail: form.detail,
          priority: form.priority,
          source: form.source || "dashboard",
          assignee: form.assignee || "unassigned",
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.task) setTasks((prev) => [...prev, d.task]);
      }
    } catch {}
    setForm({ title: "", detail: "", priority: "medium", source: "", assignee: "" });
    setShowForm(false);
  };

  const updateStatus = async (id: number, status: TaskStatus) => {
    try {
      await fetch(`${API}/api/servers/${guildId}/tasks/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t))
      );
    } catch {}
  };

  const deleteTask = async (id: number) => {
    try {
      await fetch(`${API}/api/servers/${guildId}/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  if (loading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-300">Task Management</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage tasks with status workflow: Open → In Progress →
            Done.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{tasks.length} total</Badge>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(
          ([key, cfg]) => (
            <Card key={key} className={`${cfg.bg} ${cfg.border}`}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {cfg.label}
                </p>
                <p className={`text-2xl font-bold ${cfg.color}`}>
                  {counts[key]}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Create Task Form */}
      <Card className="border-blue-900/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-blue-300">
              Create New Task
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Cancel" : "+ Add Task"}
            </Button>
          </div>
          <CardDescription>
            Create a task manually or let the autonomous agent create tasks
            automatically.
          </CardDescription>
        </CardHeader>
        {showForm && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Title *
                </label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Audit response time on dashboard"
                  maxLength={160}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Priority
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, priority: e.target.value }))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Source
                </label>
                <Input
                  value={form.source}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, source: e.target.value }))
                  }
                  placeholder="dashboard / agent / manual"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Assignee
                </label>
                <Input
                  value={form.assignee}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, assignee: e.target.value }))
                  }
                  placeholder="user id or unassigned"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Detail
              </label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                value={form.detail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, detail: e.target.value }))
                }
                placeholder="Detailed description of the task..."
              />
            </div>
            <Button onClick={addTask} disabled={!form.title.trim()}>
              Create Task
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title, detail, source..."
          />
        </div>
        <span className="text-xs text-muted-foreground self-center">
          {filtered.length} of {tasks.length} tasks
        </span>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(
          ([statusKey, cfg]) => {
            const colTasks = filtered.filter((t) => t.status === statusKey);
            return (
              <Card key={statusKey} className={cfg.border}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-sm font-semibold ${cfg.color}`}>
                      {cfg.label}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {colTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 opacity-50">
                      No tasks
                    </p>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-lg border ${cfg.border} bg-secondary/20 p-3 space-y-2`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {task.title}
                            </p>
                            {task.detail && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                {task.detail}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={
                              PRIORITY_VARIANT[task.priority] || "outline"
                            }
                            className="text-[10px] shrink-0"
                          >
                            {task.priority}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                          {task.source && (
                            <Badge variant="secondary" className="text-[10px]">
                              {task.source}
                            </Badge>
                          )}
                          {task.assignee && (
                            <Badge variant="secondary" className="text-[10px]">
                              {task.assignee}
                            </Badge>
                          )}
                        </div>

                        {task.last_result && (
                          <p className="text-[10px] text-yellow-500 truncate">
                            Result: {String(task.last_result).slice(0, 80)}
                          </p>
                        )}

                        <p className="text-[10px] text-muted-foreground">
                          Updated: {fmt(task.updated_at)}
                        </p>

                        {/* Status change buttons */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {statusKey !== "open" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] h-6 px-2"
                              onClick={() => updateStatus(task.id, "open")}
                            >
                              → Open
                            </Button>
                          )}
                          {statusKey !== "in_progress" &&
                            statusKey !== "done" &&
                            statusKey !== "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] h-6 px-2"
                                onClick={() =>
                                  updateStatus(task.id, "in_progress")
                                }
                              >
                                → In Progress
                              </Button>
                            )}
                          {statusKey !== "in_progress" &&
                            statusKey === "open" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] h-6 px-2"
                                onClick={() =>
                                  updateStatus(task.id, "in_progress")
                                }
                              >
                                → Start
                              </Button>
                            )}
                          {statusKey !== "done" &&
                            statusKey !== "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] h-6 px-2 text-green-400 border-green-800"
                                onClick={() => updateStatus(task.id, "done")}
                              >
                                → Done
                              </Button>
                            )}
                          {statusKey !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-6 px-2 text-red-400"
                              onClick={() =>
                                updateStatus(task.id, "cancelled")
                              }
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-6 px-2 text-red-400 hover:text-red-300"
                            onClick={() => deleteTask(task.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          }
        )}
      </div>
    </div>
  );
}
