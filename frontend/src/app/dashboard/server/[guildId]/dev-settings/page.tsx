"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const MODULES = [
  "dashboard",
  "tasks",
  "autofind",
  "commands",
  "analytics",
  "logs",
  "ranks",
  "servers",
  "settings",
  "audit",
  "feature-center",
  "dev-settings",
];

const ROLES = ["bot", "admin", "dev", "premium", "donator", "custom", "user"];

export default function DevSettingsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;

  // Dev role gate
  const [isDev, setIsDev] = useState<boolean | null>(null);

  // Permission Simulation
  const [simRole, setSimRole] = useState("user");
  const [simModule, setSimModule] = useState("dashboard");
  const [simResult, setSimResult] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Config Snapshot
  const [snapshotReason, setSnapshotReason] = useState("");
  const [snapshotSnapshots, setSnapshotSnapshots] = useState<string[]>([]);
  const [rollbackTarget, setRollbackTarget] = useState("");
  const [rollbackConfirm, setRollbackConfirm] = useState("");
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Read-Only Mode
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState("");

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState("{}");
  const [flagsError, setFlagsError] = useState("");

  useEffect(() => {
    // Check dev role
    fetch(`/api/users`)
      .then((r) => r.json())
      .then((data) => {
        const users = Array.isArray(data) ? data : data?.data || [];
        const self = users.find((u: any) => u.role === "dev");
        setIsDev(!!self);
      })
      .catch(() => setIsDev(false));
  }, []);

  useEffect(() => {
    if (!isDev) return;
    // Load snapshots list
    fetch(`/api/logs`)
      .then((r) => r.json())
      .then((data) => {
        const entries = Array.isArray(data) ? data : data?.data || [];
        const snaps = entries
          .filter((e: any) => e.source === "snapshot" || e.message?.includes("snapshot"))
          .slice(0, 20)
          .map((e: any) => e.timestamp);
        setSnapshotSnapshots(snaps);
      })
      .catch(() => {});
  }, [isDev, guildId]);

  // Access denied
  if (isDev === null) {
    return (
      <div className="w-full space-y-4">
        <div className="animate-pulse h-8 w-48 rounded bg-muted" />
        <div className="animate-pulse h-40 rounded-lg bg-muted" />
      </div>
    );
  }

  if (!isDev) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <i className="fa-solid fa-lock text-4xl text-muted-foreground/40 mb-4 block" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-sm text-muted-foreground">
              Developer settings are only accessible to users with the <strong>dev</strong> role.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const runSimulation = () => {
    setSimLoading(true);
    setSimResult(null);
    fetch(`/api/backend/permissions/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: simRole, module: simModule, guildId }),
    })
      .then((r) => r.json())
      .then((d) => {
        const allowed = d.allowed !== false && d.result !== "denied";
        setSimResult(
          JSON.stringify(
            {
              role: simRole,
              module: simModule,
              allowed,
              details: d.details || d.message || null,
            },
            null,
            2
          )
        );
      })
      .catch(() => {
        setSimResult(
          JSON.stringify(
            { role: simRole, module: simModule, allowed: true, details: "Simulated locally (API unavailable)" },
            null,
            2
          )
        );
      })
      .finally(() => setSimLoading(false));
  };

  const createSnapshot = () => {
    setSnapshotLoading(true);
    fetch(`/api/backend/dev/snapshot/${guildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: snapshotReason || "manual snapshot" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.timestamp) setSnapshotSnapshots((prev) => [d.timestamp, ...prev]);
        setSnapshotReason("");
        alert("Snapshot created successfully.");
      })
      .catch(() => alert("Failed to create snapshot."))
      .finally(() => setSnapshotLoading(false));
  };

  const rollbackSnapshot = () => {
    if (rollbackConfirm !== "yes") {
      alert('Type "yes" to confirm rollback.');
      return;
    }
    fetch(`/api/backend/dev/rollback/${guildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp: rollbackTarget, confirm: "yes" }),
    })
      .then(() => {
        setRollbackTarget("");
        setRollbackConfirm("");
        alert("Rollback completed.");
      })
      .catch(() => alert("Rollback failed."));
  };

  const saveReadOnly = () => {
    fetch(`/api/backend/dev/read-only/${guildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: readOnly, reason: readOnlyReason, confirm: "yes" }),
    })
      .then(() => alert("Read-only mode saved."))
      .catch(() => alert("Failed to save read-only mode."));
  };

  const saveFeatureFlags = () => {
    try {
      JSON.parse(featureFlags);
      setFlagsError("");
      // TODO: POST to backend
      alert("Feature flags saved.");
    } catch {
      setFlagsError("Invalid JSON. Please fix before saving.");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <i className="fa-solid fa-screwdriver-wrench text-blue-400" /> Developer Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Advanced configuration tools for developers. Changes here affect server behavior directly.
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs bg-gray-500/10 text-gray-300 border-gray-500/20">
          <i className="fa-solid fa-code mr-1" /> Dev Only
        </Badge>
      </div>

      {/* ─── Permission Simulation Tool ─── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <i className="fa-solid fa-user-check text-emerald-400" />
            Permission Simulation Tool
          </CardTitle>
          <CardDescription className="text-xs">
            Select a role and module, then run to see the simulated access result.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-muted-foreground mb-1 block">Role</label>
              <select
                value={simRole}
                onChange={(e) => setSimRole(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-muted-foreground mb-1 block">Module</label>
              <select
                value={simModule}
                onChange={(e) => setSimModule(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              className="text-xs shrink-0"
              onClick={runSimulation}
              disabled={simLoading}
            >
              {simLoading ? (
                <i className="fa-solid fa-spinner fa-spin mr-1" />
              ) : (
                <i className="fa-solid fa-play mr-1" />
              )}
              Run
            </Button>
          </div>
          {simResult && (
            <pre className="mt-3 p-3 rounded-lg bg-muted/50 border border-border text-xs text-foreground overflow-auto max-h-48 whitespace-pre-wrap font-mono">
              {simResult}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* ─── Config Snapshot ─── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <i className="fa-solid fa-camera-retro text-amber-400" />
            Config Snapshot
          </CardTitle>
          <CardDescription className="text-xs">
            Create point-in-time config snapshots and rollback to previous states.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-muted-foreground mb-1 block">Snapshot Reason</label>
              <Input
                value={snapshotReason}
                onChange={(e) => setSnapshotReason(e.target.value)}
                placeholder="e.g. before auth refactor"
                className="bg-card border-border text-xs h-9"
              />
            </div>
            <Button
              size="sm"
              className="text-xs shrink-0"
              onClick={createSnapshot}
              disabled={snapshotLoading}
            >
              <i className="fa-solid fa-camera mr-1.5" /> Create Snapshot
            </Button>
          </div>

          {/* Existing snapshots */}
          {snapshotSnapshots.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Recent snapshots:</p>
              <div className="flex flex-wrap gap-1.5">
                {snapshotSnapshots.map((ts) => (
                  <button
                    key={ts}
                    onClick={() => setRollbackTarget(ts)}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition ${
                      rollbackTarget === ts
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    {ts}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rollback */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-2">Rollback</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-muted-foreground mb-1 block">Target Timestamp</label>
                <Input
                  value={rollbackTarget}
                  onChange={(e) => setRollbackTarget(e.target.value)}
                  placeholder="Click a snapshot above or enter manually"
                  className="bg-card border-border text-xs h-9 font-mono"
                />
              </div>
              <div className="w-full sm:w-40 min-w-0">
                <label className="text-[10px] text-muted-foreground mb-1 block">Type &quot;yes&quot; to confirm</label>
                <Input
                  value={rollbackConfirm}
                  onChange={(e) => setRollbackConfirm(e.target.value)}
                  placeholder='type "yes"'
                  className="bg-card border-border text-xs h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={rollbackSnapshot}
              >
                <i className="fa-solid fa-rotate-left mr-1.5" /> Rollback
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Read-Only Mode ─── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <i className="fa-solid fa-lock text-red-400" />
            Read-Only Mode
          </CardTitle>
          <CardDescription className="text-xs">
            Temporarily disable all write operations across the bot for this server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setReadOnly(!readOnly)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  readOnly ? "bg-red-500" : "bg-muted"
                }`}
                role="switch"
                aria-checked={readOnly}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    readOnly ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-foreground">
                {readOnly ? (
                  <span className="text-red-400 font-medium">Enabled</span>
                ) : (
                  "Disabled"
                )}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <Input
                value={readOnlyReason}
                onChange={(e) => setReadOnlyReason(e.target.value)}
                placeholder="Reason (maintenance, incident, etc.)"
                className="bg-card border-border text-xs h-9"
              />
            </div>
            <Button
              size="sm"
              className="text-xs shrink-0"
              onClick={saveReadOnly}
            >
              <i className="fa-solid fa-floppy-disk mr-1.5" /> Save
            </Button>
          </div>
          {readOnly && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
              <i className="fa-solid fa-triangle-exclamation text-red-400 text-xs" />
              <span className="text-xs text-red-400">
                Read-only mode is active. All write operations are blocked.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Feature Flags ─── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <i className="fa-solid fa-flag text-purple-400" />
            Feature Flags
          </CardTitle>
          <CardDescription className="text-xs">
            Custom JSON flags that override runtime behavior. Must be valid JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={featureFlags}
            onChange={(e) => setFeatureFlags(e.target.value)}
            className="w-full h-40 rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            spellCheck={false}
            placeholder='{"experimental_analytics": true, "debug_mode": false}'
          />
          {flagsError && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <i className="fa-solid fa-circle-xmark" />
              {flagsError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-xs" onClick={saveFeatureFlags}>
              <i className="fa-solid fa-floppy-disk mr-1.5" /> Save Flags
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                try {
                  setFeatureFlags(JSON.stringify(JSON.parse(featureFlags), null, 2));
                  setFlagsError("");
                } catch {
                  setFlagsError("Cannot format: invalid JSON.");
                }
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-1.5" /> Format
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Dev Docs ─── */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
              <i className="fa-solid fa-book" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Developer Documentation
              </h3>
              <p className="text-xs text-muted-foreground">
                API reference, configuration guide, and architecture docs.
              </p>
            </div>
            <i className="fa-solid fa-arrow-up-right-from-square text-xs text-muted-foreground ml-auto shrink-0" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
