"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

const ROLE_ORDER: Record<string, number> = {
  bot: 0, admin: 1, dev: 2, premium: 3, donator: 4, custom: 5, user: 6,
};

const COMMANDS = ["find", "playtime", "profile", "steamhex", "topplaytime", "spy"];

interface ServerSettings {
  currentRole?: string;
  autoFindLimit?: number;
  autoFindUsed?: number;
  defaultEphemeral?: boolean;
  voicePresence?: {
    enabled?: boolean;
    channelId?: string;
  };
  autoModeration?: {
    everyoneMention?: boolean;
    attachmentThreshold?: number;
  };
  keywordAlerts?: {
    webhookUrl?: string;
    conditionMode?: string;
  };
  scheduledReports?: {
    channelId?: string;
    scheduleTime?: string;
  };
  antiAbuse?: {
    enabled?: boolean;
    mentionThreshold?: number;
  };
  publicStatus?: {
    enabled?: boolean;
    channelId?: string;
  };
  commandEphemeral?: Record<string, boolean>;
}

export default function ServerSettingsPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [settings, setSettings] = useState<ServerSettings>({
    defaultEphemeral: true,
    voicePresence: { enabled: false, channelId: "" },
    autoModeration: { everyoneMention: false, attachmentThreshold: 5 },
    keywordAlerts: { webhookUrl: "", conditionMode: "OR" },
    scheduledReports: { channelId: "", scheduleTime: "09:00" },
    antiAbuse: { enabled: false, mentionThreshold: 5 },
    publicStatus: { enabled: false, channelId: "" },
    commandEphemeral: {
      find: true,
      playtime: true,
      profile: true,
      steamhex: true,
      topplaytime: true,
      spy: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = fetch(`${API}/api/users?guild_id=${guildId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.data || [];
        if (list.length > 0) setSettings((s) => ({ ...s, currentRole: list[0].role || "user" }));
      })
      .catch(() => {});

    const fetchServer = fetch(`${API}/api/servers/${guildId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const data = d?.data;
        if (data) {
          setSettings((s) => ({
            ...s,
            autoFindLimit: data.autofind_limit ?? data.autoFindLimit ?? 5,
            autoFindUsed: data.autofind?.length ?? data.autoFindUsed ?? 0,
            defaultEphemeral: data.config?.defaultEphemeral ?? s.defaultEphemeral,
            voicePresence: data.config?.voicePresence ?? s.voicePresence,
            autoModeration: data.config?.autoModeration ?? s.autoModeration,
            keywordAlerts: data.config?.keywordAlerts ?? s.keywordAlerts,
            scheduledReports: data.config?.scheduledReports ?? s.scheduledReports,
            antiAbuse: data.config?.antiAbuse ?? s.antiAbuse,
            publicStatus: data.config?.publicStatus ?? s.publicStatus,
            commandEphemeral: data.config?.commandEphemeral ?? s.commandEphemeral,
          }));
        }
      })
      .catch(() => {});

    Promise.all([fetchUser, fetchServer]).finally(() => setLoading(false));
  }, [guildId]);

  const saveSection = async (section: string, data: Record<string, any>) => {
    setSavingSection(section);
    try {
      await fetch(`${API}/api/servers/${guildId}/settings/${section}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 2000);
    } catch {
      // silent
    } finally {
      setSavingSection(null);
    }
  };

  const update = (path: string, value: any) => {
    setSettings((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const SaveButton = ({ section, data }: { section: string; data: Record<string, any> }) => (
    <div className="flex justify-end pt-3 border-t border-border">
      <Button
        size="sm"
        onClick={() => saveSection(section, data)}
        disabled={savingSection === section}
      >
        {savingSection === section ? (
          <>
            <i className="fa-solid fa-spinner fa-spin mr-1.5" />
            Saving...
          </>
        ) : savedSection === section ? (
          <>
            <i className="fa-solid fa-check mr-1.5" />
            Saved!
          </>
        ) : (
          <>
            <i className="fa-solid fa-floppy-disk mr-1.5" />
            Save
          </>
        )}
      </Button>
    </div>
  );

  const roleLimit = ROLE_ORDER[settings.currentRole || "user"] ?? 6;

  const handleExport = async (format: "csv" | "json") => {
    try {
      const res = await fetch(`${API}/api/servers/${guildId}/export?format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `server-logs-${guildId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-muted-foreground">
          <i className="fa-solid fa-spinner fa-spin" />
          <span className="text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Server Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure operational settings for this server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <i className="fa-solid fa-sliders mr-1" />
            Settings
          </Badge>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <i className="fa-solid fa-shield-halved text-muted-foreground text-xs" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Role</p>
            <p className="text-xl font-bold text-foreground capitalize">{settings.currentRole || "user"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <i className="fa-solid fa-gauge-high text-muted-foreground text-xs" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Auto Find Limit</p>
            <p className="text-xl font-bold text-foreground">{settings.autoFindLimit ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <i className="fa-solid fa-chart-simple text-muted-foreground text-xs" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Used</p>
            <p className="text-xl font-bold text-foreground">{settings.autoFindUsed ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* 1. Default Ephemeral */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-regular fa-eye-slash text-muted-foreground" />
            Default Ephemeral
          </CardTitle>
          <CardDescription>
            Bot responses are only visible to the user who ran the command
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <Switch
              checked={settings.defaultEphemeral}
              onCheckedChange={(checked) => update("defaultEphemeral", checked)}
            />
            <span className="text-sm text-foreground">
              {settings.defaultEphemeral ? "Ephemeral Enabled" : "Ephemeral Disabled"}
            </span>
          </label>
          <SaveButton
            section="ephemeral"
            data={{ defaultEphemeral: settings.defaultEphemeral }}
          />
        </CardContent>
      </Card>

      {/* 2. Voice Presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-headphones text-muted-foreground" />
            Voice Presence
          </CardTitle>
          <CardDescription>
            Monitor and report voice channel activity for this server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <Switch
              checked={settings.voicePresence?.enabled}
              onCheckedChange={(checked) => update("voicePresence.enabled", checked)}
            />
            <span className="text-sm text-foreground">
              {settings.voicePresence?.enabled ? "Voice Presence Enabled" : "Voice Presence Disabled"}
            </span>
          </label>
          {settings.voicePresence?.enabled && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Voice Channel ID</label>
              <Input
                value={settings.voicePresence?.channelId || ""}
                placeholder="e.g. 1234567890123456789"
                onChange={(e) => update("voicePresence.channelId", e.target.value)}
              />
            </div>
          )}
          <SaveButton
            section="voice"
            data={{
              enabled: settings.voicePresence?.enabled,
              channelId: settings.voicePresence?.channelId || "",
            }}
          />
        </CardContent>
      </Card>

      {/* 3. Auto Moderation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-muted-foreground" />
            Auto Moderation
          </CardTitle>
          <CardDescription>
            Automatic moderation rules for messages and content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Block @everyone Mentions</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={settings.autoModeration?.everyoneMention}
                  onCheckedChange={(checked) => update("autoModeration.everyoneMention", checked)}
                />
                <span className="text-sm text-foreground">
                  {settings.autoModeration?.everyoneMention ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Attachment Threshold (max per message)
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={settings.autoModeration?.attachmentThreshold ?? 5}
                onChange={(e) =>
                  update("autoModeration.attachmentThreshold", parseInt(e.target.value) || 5)
                }
              />
            </div>
          </div>
          <SaveButton
            section="moderation"
            data={{
              everyoneMention: settings.autoModeration?.everyoneMention,
              attachmentThreshold: settings.autoModeration?.attachmentThreshold ?? 5,
            }}
          />
        </CardContent>
      </Card>

      {/* 4. Keyword Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-bell text-muted-foreground" />
            Keyword Alerts
          </CardTitle>
          <CardDescription>
            Get notified via webhook when specific keywords are detected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Webhook URL</label>
            <Input
              value={settings.keywordAlerts?.webhookUrl || ""}
              placeholder="https://discord.com/api/webhooks/..."
              onChange={(e) => update("keywordAlerts.webhookUrl", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Condition Mode</label>
              <div className="flex gap-2">
                {["OR", "AND"].map((mode) => (
                  <Button
                    key={mode}
                    variant={settings.keywordAlerts?.conditionMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => update("keywordAlerts.conditionMode", mode)}
                    className="flex-1"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <SaveButton
            section="alerts"
            data={{
              webhookUrl: settings.keywordAlerts?.webhookUrl || "",
              conditionMode: settings.keywordAlerts?.conditionMode || "OR",
            }}
          />
        </CardContent>
      </Card>

      {/* 5. Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-chart-bar text-muted-foreground" />
            Scheduled Reports
          </CardTitle>
          <CardDescription>
            Automatically send server reports to a channel on a schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Report Channel ID</label>
              <Input
                value={settings.scheduledReports?.channelId || ""}
                placeholder="e.g. 1234567890123456789"
                onChange={(e) => update("scheduledReports.channelId", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Schedule Time</label>
              <Input
                type="time"
                value={settings.scheduledReports?.scheduleTime || "09:00"}
                onChange={(e) => update("scheduledReports.scheduleTime", e.target.value)}
              />
            </div>
          </div>
          <SaveButton
            section="reports"
            data={{
              channelId: settings.scheduledReports?.channelId || "",
              scheduleTime: settings.scheduledReports?.scheduleTime || "09:00",
            }}
          />
        </CardContent>
      </Card>

      {/* 6. Anti-Abuse */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-ban text-muted-foreground" />
            Anti-Abuse
          </CardTitle>
          <CardDescription>
            Detect and limit @mention abuse to protect server members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Mention Abuse Detection</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={settings.antiAbuse?.enabled}
                  onCheckedChange={(checked) => update("antiAbuse.enabled", checked)}
                />
                <span className="text-sm text-foreground">
                  {settings.antiAbuse?.enabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Max Mentions Per Message
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={settings.antiAbuse?.mentionThreshold ?? 5}
                onChange={(e) =>
                  update("antiAbuse.mentionThreshold", parseInt(e.target.value) || 5)
                }
              />
            </div>
          </div>
          <SaveButton
            section="anti-abuse"
            data={{
              enabled: settings.antiAbuse?.enabled,
              mentionThreshold: settings.antiAbuse?.mentionThreshold ?? 5,
            }}
          />
        </CardContent>
      </Card>

      {/* 7. Public Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-globe text-muted-foreground" />
            Public Status
          </CardTitle>
          <CardDescription>
            Show a public server status embed visible to all members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <Switch
              checked={settings.publicStatus?.enabled}
              onCheckedChange={(checked) => update("publicStatus.enabled", checked)}
            />
            <span className="text-sm text-foreground">
              {settings.publicStatus?.enabled ? "Public Status Enabled" : "Public Status Disabled"}
            </span>
          </label>
          {settings.publicStatus?.enabled && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Public Status Channel ID</label>
              <Input
                value={settings.publicStatus?.channelId || ""}
                placeholder="e.g. 1234567890123456789"
                onChange={(e) => update("publicStatus.channelId", e.target.value)}
              />
            </div>
          )}
          <SaveButton
            section="public-status"
            data={{
              enabled: settings.publicStatus?.enabled,
              channelId: settings.publicStatus?.channelId || "",
            }}
          />
        </CardContent>
      </Card>

      {/* 8. Per-Command Ephemeral */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-terminal text-muted-foreground" />
            Per-Command Ephemeral
          </CardTitle>
          <CardDescription>
            Control ephemeral responses individually for each command
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COMMANDS.map((cmd) => (
            <label
              key={cmd}
              className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
            >
              <span className="text-sm text-foreground font-medium capitalize">{cmd}</span>
              <Switch
                checked={settings.commandEphemeral?.[cmd] ?? true}
                onCheckedChange={(checked) => update(`commandEphemeral.${cmd}`, checked)}
              />
            </label>
          ))}
          <SaveButton
            section="command-ephemeral"
            data={{ commandEphemeral: settings.commandEphemeral }}
          />
        </CardContent>
      </Card>

      {/* 9. Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-download text-muted-foreground" />
            Data Export
          </CardTitle>
          <CardDescription>
            Export server logs and data for external analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              className="flex-1"
            >
              <i className="fa-solid fa-file-csv mr-2" />
              Export as CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("json")}
              className="flex-1"
            >
              <i className="fa-solid fa-file-code mr-2" />
              Export as JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
