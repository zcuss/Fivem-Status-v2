"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const API = "http://localhost:34002";

type TaskStatus = "pending" | "running" | "completed" | "failed" | "scheduled";
type TaskPriority = "low" | "medium" | "high" | "critical";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at?: string;
  last_run?: string;
  next_run?: string;
}

const statusColors: Record<TaskStatus, string> = {
  pending: "secondary",
  running: "warning",
  completed: "success",
  failed: "destructive",
  scheduled: "outline",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "secondary",
  medium: "outline",
  high: "warning",
  critical: "destructive",
};

export default function TasksPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
  });

  useEffect(() => {
    fetch(`${API}/api/servers/${guildId}`)
      .then((r) => r.json())
      .then((d) => {
        setTasks((d.data as any)?.tasks || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const addTask = () => {
    if (!form.title.trim()) return;
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: form.title,
      description: form.description,
      status: "pending",
      priority: form.priority,
      created_at: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
    setForm({ title: "", description: "", priority: "medium" });
    setShowForm(false);
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status, last_run: status === "running" ? new Date().toISOString() : t.last_run }
          : t
      )
    );
  };

  const runTask = (id: string) => {
    updateTaskStatus(id, "running");
    setTimeout(() => updateTaskStatus(id, "completed"), 2000);
  };

  const forcePushTask = (id: string) => {
    updateTaskStatus(id, "running");
    setTimeout(() => updateTaskStatus(id, "completed"), 1500);
  };

  const testTask = (id: string) => {
    updateTaskStatus(id, "running");
    setTimeout(() => {
      const task = tasks.find((t) => t.id === id);
      updateTaskStatus(id, task?.priority === "critical" ? "completed" : "completed");
    }, 1000);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/servers/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading tasks…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Task"}
          </Button>
          <Button onClick={saveAll} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Task</CardTitle>
            <CardDescription>Create an autonomous task for the bot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Daily server report"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Priority</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high", "critical"] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                      className={`px-3 py-2 rounded-md text-xs font-medium capitalize transition border ${
                        form.priority === p
                          ? "border-gray-500 bg-gray-800 text-white"
                          : "border-gray-800 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <Button onClick={addTask}>Create Task</Button>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Autonomous Tasks</CardTitle>
          <CardDescription>
            {tasks.length} tasks ·{" "}
            {tasks.filter((t) => t.status === "running").length} running
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No tasks configured. Click "Add Task" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-800 hover:border-gray-700 transition"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{task.title}</span>
                      <Badge variant={statusColors[task.status] as any} className="text-[10px]">
                        {task.status}
                      </Badge>
                      <Badge variant={priorityColors[task.priority] as any} className="text-[10px] capitalize">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                    )}
                    {task.last_run && (
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Last run: {new Date(task.last_run).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      disabled={task.status === "running"}
                      onClick={() => runTask(task.id)}
                    >
                      ▶ Run
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      disabled={task.status === "running"}
                      onClick={() => forcePushTask(task.id)}
                    >
                      ⏭ Force
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      disabled={task.status === "running"}
                      onClick={() => testTask(task.id)}
                    >
                      🧪 Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 text-xs"
                      onClick={() => deleteTask(task.id)}
                    >
                      ✕
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
