"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

interface ServerSettings {
  ephemeral_enabled?: boolean;
  voice_channel_id?: string;
  voice_channel_name?: string;
  alert_enabled?: boolean;
  alert_channel_id?: string;
  report_enabled?: boolean;
  report_channel_id?: string;
  anti_abuse_enabled?: boolean;
  anti_abuse_threshold?: number;
  moderation_enabled?: boolean;
  moderation_log_channel?: string;
  public_status?: boolean;
  permissions?: Record<string, string[]>;
}

export default function ServerSettingsPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [settings, setSettings] = useState<ServerSettings>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/servers/${guildId}`)
      .then((r) => r.json())
      .then((d) => setSettings(d.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const updateSetting = (key: keyof ServerSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`${API}/api/servers/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Server Settings</h1>
        <div className="flex items-center gap-3">
          {saved && <Badge variant="success">Saved!</Badge>}
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Saving…" : "Save All"}
          </Button>
        </div>
      </div>

      {/* Ephemeral Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ephemeral Responses</CardTitle>
          <CardDescription>Make bot responses visible only to the command user</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.ephemeral_enabled ? "bg-green-600" : "bg-gray-700"
              }`}
              onClick={() => updateSetting("ephemeral_enabled", !settings.ephemeral_enabled)}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.ephemeral_enabled ? "translate-x-5.5 left-0.5" : "left-0.5"
                }`}
              />
            </div>
            <span className="text-sm">
              {settings.ephemeral_enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Voice Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Voice Channel</CardTitle>
          <CardDescription>Configure the default voice channel for voice-related features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Channel ID</label>
            <Input
              value={settings.voice_channel_id || ""}
              onChange={(e) => updateSetting("voice_channel_id", e.target.value)}
              placeholder="e.g. 1234567890123456789"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Channel Name</label>
            <Input
              value={settings.voice_channel_name || ""}
              onChange={(e) => updateSetting("voice_channel_name", e.target.value)}
              placeholder="e.g. General Voice"
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alert Settings</CardTitle>
          <CardDescription>Configure alert notifications for server events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.alert_enabled ? "bg-green-600" : "bg-gray-700"
              }`}
              onClick={() => updateSetting("alert_enabled", !settings.alert_enabled)}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.alert_enabled ? "translate-x-5.5 left-0.5" : "left-0.5"
                }`}
              />
            </div>
            <span className="text-sm">
              {settings.alert_enabled ? "Alerts Enabled" : "Alerts Disabled"}
            </span>
          </label>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Alert Channel ID</label>
            <Input
              value={settings.alert_channel_id || ""}
              onChange={(e) => updateSetting("alert_channel_id", e.target.value)}
              placeholder="e.g. 1234567890123456789"
            />
          </div>
        </CardContent>
      </Card>

      {/* Report Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Settings</CardTitle>
          <CardDescription>Configure user report handling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.report_enabled ? "bg-green-600" : "bg-gray-700"
              }`}
              onClick={() => updateSetting("report_enabled", !settings.report_enabled)}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.report_enabled ? "translate-x-5.5 left-0.5" : "left-0.5"
                }`}
              />
            </div>
            <span className="text-sm">
              {settings.report_enabled ? "Reports Enabled" : "Reports Disabled"}
            </span>
          </label>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Report Channel ID</label>
            <Input
              value={settings.report_channel_id || ""}
              onChange={(e) => updateSetting("report_channel_id", e.target.value)}
              placeholder="e.g. 1234567890123456789"
            />
          </div>
        </CardContent>
      </Card>

      {/* Anti-Abuse Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Anti-Abuse</CardTitle>
          <CardDescription>Protect against command spam and abuse</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.anti_abuse_enabled ? "bg-green-600" : "bg-gray-700"
              }`}
              onClick={() => updateSetting("anti_abuse_enabled", !settings.anti_abuse_enabled)}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.anti_abuse_enabled ? "translate-x-5.5 left-0.5" : "left-0.5"
                }`}
              />
            </div>
            <span className="text-sm">
              {settings.anti_abuse_enabled ? "Anti-Abuse Enabled" : "Anti-Abuse Disabled"}
            </span>
          </label>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Threshold (max commands per minute)</label>
            <Input
              type="number"
              value={settings.anti_abuse_threshold || ""}
              onChange={(e) => updateSetting("anti_abuse_threshold", parseInt(e.target.value) || 0)}
              placeholder="e.g. 10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Moderation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moderation</CardTitle>
          <CardDescription>Configure moderation tools and logging</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.moderation_enabled ? "bg-green-600" : "bg-gray-700"
              }`}
              onClick={() => updateSetting("moderation_enabled", !settings.moderation_enabled)}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.moderation_enabled ? "translate-x-5.5 left-0.5" : "left-0.5"
                }`}
              />
            </div>
            <span className="text-sm">
              {settings.moderation_enabled ? "Moderation Enabled" : "Moderation Disabled"}
            </span>
          </label>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Moderation Log Channel ID</label>
            <Input
              value={settings.moderation_log_channel || ""}
              onChange={(e) => updateSetting("moderation_log_channel", e.target.value)}
              placeholder="e.g. 1234567890123456789"
            />
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permission Matrix</CardTitle>
          <CardDescription>Role-based access control for bot commands</CardDescription>
        </CardHeader>
        <CardContent>
          {settings.permissions && Object.keys(settings.permissions).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(settings.permissions).map(([command, roles]) => (
                <div key={command} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <span className="font-mono text-sm">{command}</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No permission rules configured</p>
          )}
        </CardContent>
      </Card>

      {/* Public Status Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Public Status</CardTitle>
          <CardDescription>Make this server visible on the public status page</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.public_status ? "bg-green-600" : "bg-gray-700"
              }`}
              onClick={() => updateSetting("public_status", !settings.public_status)}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.public_status ? "translate-x-5.5 left-0.5" : "left-0.5"
                }`}
              />
            </div>
            <span className="text-sm">
              {settings.public_status ? "Public" : "Private"}
            </span>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
