export interface SessionData {
  userId: string;
  username: string;
  avatar: string | null;
  globalName: string | null;
  guilds?: DiscordGuild[];
  role: "user" | "admin" | "dev";
  iat: number;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: number;
}
