// ============================================================
// Shared types for Fivem-Status v2
// ============================================================

export interface ServerConfig {
  serverKey: string;
  serverCode: string;
  createdBy: number;
}

export interface UserRole {
  discordId: number;
  role: "user" | "premium" | "donator" | "custom" | "dev";
  maxAuto: number;
  roleLabel?: string;
  expiresAt?: Date;
  discordName?: string;
  discordUsername?: string;
  lastLoginAt?: Date;
}

export interface AutoFindRule {
  id: number;
  discordId: number;
  guildId: number;
  serverKey: string;
  keyword: string;
  channelId: number;
  messageId?: number;
  logo?: string;
  color?: string;
  enabled: boolean;
  createdAt: Date;
}

export interface SteamPlayer {
  steamHex: string;
  playerName: string;
  playerKey: string;
  lastSeen: Date;
  createdAt: Date;
}

export interface SteamPlayerRank {
  id: number;
  ownerDiscordId: number;
  steamHex: string;
  rankLabel: string;
  updatedAt: Date;
}

export interface PlaytimePlayer {
  id: number;
  playerKey: string;
  latestName: string;
  latestPlayerId: number;
  updatedAt: Date;
}

export interface PlaytimeDailyHot {
  serverKey: string;
  playerRef: number;
  playDate: string;
  lastSeen: Date;
  playtimeSeconds: number;
}

export interface ServerActivity {
  discordId: number;
  guildId: number;
  hitCount: number;
  lastSeen: Date;
}

export interface BotConfig {
  id: number;
  name: string;
  token: string;
  clientId: string;
  enabled: boolean;
  clusterId?: string;
  features: string;
  status: "running" | "stopped" | "error";
  createdAt: Date;
  updatedAt: Date;
}

export interface CommandLog {
  id: number;
  discordId: number;
  guildId: number;
  commandName: string;
  serverKey?: string;
  queryText?: string;
  channelId?: number;
  channelName?: string;
  displayName?: string;
  username?: string;
  detail?: string;
  createdAt: Date;
}

export interface ServerChangeRequest {
  id: number;
  serverKey: string;
  requestedBy: number;
  proposedCode: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  decidedAt?: Date;
  decidedBy?: number;
}

export interface Subscription {
  id: number;
  discordId: number;
  subscriptionId: string;
  status: string;
  amount: number;
  intervalValue: number;
  intervalUnit: string;
  createdAt: Date;
}

export interface PremiumOrder {
  orderId: string;
  discordId: number;
  amount: number;
  status: string;
  createdAt: Date;
}

// ============================================================
// API types
// ============================================================

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// FiveM server data
// ============================================================

export interface FiveMPlayer {
  id: number;
  name: string;
  // ... other FiveM player fields
}

export interface FiveMServerData {
  players: FiveMPlayer[];
  name: string | null;
}
