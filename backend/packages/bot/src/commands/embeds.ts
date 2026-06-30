// ============================================================
// Consistent embed builder for all bot responses
// ============================================================

import { EmbedBuilder } from "discord.js";

const BRAND_COLOR = 0x3b82f6;
const AUTHOR_NAME = process.env.BOT_AUTHOR || "Zcus";

export function botEmbed(opts: {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  thumbnail?: string;
}) {
  const embed = new EmbedBuilder()
    .setTitle(opts.title)
    .setColor(opts.color ?? BRAND_COLOR)
    .setFooter({
      text: opts.footer || `ZCUS BOT • ${new Date(Date.now() + 7 * 3600000).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })}`,
    })
    .setTimestamp();

  if (opts.description) embed.setDescription(opts.description);
  if (opts.fields?.length) embed.addFields(opts.fields);
  if (opts.thumbnail) embed.setThumbnail(opts.thumbnail);

  return embed;
}

export function successEmbed(title: string, desc?: string) {
  return botEmbed({ title: `✅ ${title}`, description: desc, color: 0x22c55e });
}

export function errorEmbed(title: string, desc?: string) {
  return botEmbed({ title: `❌ ${title}`, description: desc, color: 0xef4444 });
}

export function infoEmbed(title: string, desc?: string, fields?: { name: string; value: string; inline?: boolean }[]) {
  return botEmbed({ title, description: desc, fields });
}
