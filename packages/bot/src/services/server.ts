// ============================================================
// FiveM Server data fetcher
// ============================================================

import { CFX_API_BASE, SERVER_FETCH_TTL_MS } from "@fivem/shared";

const cache = new Map<string, { value: any; fetchedAt: number }>();
const inFlight = new Map<string, Promise<any>>();

export async function fetchServerData(serverId: string) {
  const id = String(serverId || "").trim().toLowerCase();
  if (!id) return { players: [], name: null };

  const now = Date.now();
  const cached = cache.get(id);
  if (cached && now - cached.fetchedAt <= SERVER_FETCH_TTL_MS) return cached.value;

  const existing = inFlight.get(id);
  if (existing) return existing;

  const task = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${CFX_API_BASE}/${id}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const empty = { players: [], name: null };
        cache.set(id, { value: empty, fetchedAt: Date.now() });
        return empty;
      }
      const json = await res.json();
      const value = {
        players: json?.Data?.players || [],
        name: json?.Data?.hostname || json?.Data?.vars?.sv_projectName || null,
      };
      cache.set(id, { value, fetchedAt: Date.now() });
      return value;
    } catch {
      const empty = { players: [], name: null };
      cache.set(id, { value: empty, fetchedAt: Date.now() });
      return empty;
    } finally {
      inFlight.delete(id);
    }
  })();

  inFlight.set(id, task);
  return task;
}

export async function fetchPlayers(serverId: string) {
  const data = await fetchServerData(serverId);
  return data.players;
}
