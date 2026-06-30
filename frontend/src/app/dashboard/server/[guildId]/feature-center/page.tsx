"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Feature {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  tier: "free" | "premium" | "enterprise";
}

const INITIAL_FEATURES: Feature[] = [
  {
    id: "auto_find",
    name: "Auto Find",
    description: "Automatically scans for and recommends optimal servers based on player preferences and history.",
    icon: "fa-solid fa-tower-broadcast",
    enabled: true,
    tier: "free",
  },
  {
    id: "playtime_tracking",
    name: "Playtime Tracking",
    description: "Tracks cumulative playtime per player across sessions. Powers leaderboard and reward systems.",
    icon: "fa-solid fa-clock",
    enabled: true,
    tier: "free",
  },
  {
    id: "steam_ranks",
    name: "Steam Ranks",
    description: "Assigns competitive ranks based on Steam achievements, playtime, and server activity.",
    icon: "fa-solid fa-id-badge",
    enabled: false,
    tier: "premium",
  },
  {
    id: "moderation",
    name: "Moderation",
    description: "Auto-mod, word filters, kick/ban tools, and mod log integration for server safety.",
    icon: "fa-solid fa-shield-halved",
    enabled: true,
    tier: "free",
  },
  {
    id: "voice_presence",
    name: "Voice Presence",
    description: "Shows real-time voice channel occupancy and tracks voice activity metrics.",
    icon: "fa-solid fa-headphones",
    enabled: false,
    tier: "premium",
  },
  {
    id: "command_logs",
    name: "Command Logs",
    description: "Logs all bot command invocations with timestamps, actors, and arguments for audit.",
    icon: "fa-solid fa-terminal",
    enabled: true,
    tier: "free",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Server growth, engagement, retention, and activity analytics with exportable reports.",
    icon: "fa-solid fa-chart-line",
    enabled: true,
    tier: "enterprise",
  },
];

function tierBadgeStyle(tier: string): string {
  switch (tier) {
    case "enterprise":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "premium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
}

function tierIcon(tier: string): string {
  switch (tier) {
    case "enterprise":
      return "fa-solid fa-building";
    case "premium":
      return "fa-solid fa-crown";
    default:
      return "fa-solid fa-gift";
  }
}

export default function FeatureCenterPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [features, setFeatures] = useState<Feature[]>(INITIAL_FEATURES);

  const toggleFeature = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
    // TODO: POST to backend API to persist toggle
  };

  const enabledCount = features.filter((f) => f.enabled).length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <i className="fa-solid fa-table-cells text-primary" /> Feature Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable features for this server. Some features require higher tiers.
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs bg-primary/10 text-primary border-primary/20">
          {enabledCount}/{features.length} active
        </Badge>
      </div>

      {/* Quick actions */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setFeatures((p) => p.map((f) => ({ ...f, enabled: true })))}>
              <i className="fa-solid fa-toggle-on mr-1.5" /> Enable All
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setFeatures((p) => p.map((f) => ({ ...f, enabled: false })))}>
              <i className="fa-solid fa-toggle-off mr-1.5" /> Disable All
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              Click a card to toggle its state.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Card
            key={feature.id}
            className={`bg-card border-border transition-all duration-200 cursor-pointer hover:border-primary/50 ${
              feature.enabled ? "ring-1 ring-primary/20" : "opacity-75"
            }`}
            onClick={() => toggleFeature(feature.id)}
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                      feature.enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <i className={feature.icon} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {feature.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${tierBadgeStyle(
                          feature.tier
                        )}`}
                      >
                        <i className={`${tierIcon(feature.tier)} mr-1 text-[9px]`} />
                        {feature.tier}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Toggle switch */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFeature(feature.id);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    feature.enabled ? "bg-primary" : "bg-muted"
                  }`}
                  role="switch"
                  aria-checked={feature.enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      feature.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    feature.enabled ? "bg-emerald-400" : "bg-muted-foreground/40"
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {feature.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
