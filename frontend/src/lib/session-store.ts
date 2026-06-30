/**
 * Server-side session store — file-based, matches old Express-session architecture.
 * Cookie only holds session_id (UUID ~36 bytes). All data on disk.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { SessionData } from "@/lib/types";

const SESSION_DIR = path.join(process.cwd(), ".sessions");
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Ensure session dir exists
function ensureDir() {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
}

function sessionPath(id: string): string {
  // Sanitize ID to prevent path traversal
  if (!/^[a-f0-9-]{32,40}$/i.test(id)) return "";
  return path.join(SESSION_DIR, `${id}.json`);
}

export function createSession(data: SessionData): string {
  ensureDir();
  const id = crypto.randomUUID().replace(/-/g, "");
  const filePath = sessionPath(id);
  if (!filePath) return "";
  const payload = { ...data, createdAt: Date.now() };
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
  return id;
}

export function getSessionById(id: string): SessionData | null {
  const filePath = sessionPath(id);
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    // Check expiry
    if (Date.now() - data.createdAt > SESSION_MAX_AGE) {
      fs.unlinkSync(filePath);
      return null;
    }
    return data as SessionData;
  } catch {
    return null;
  }
}

export function deleteSession(id: string): void {
  const filePath = sessionPath(id);
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }
}

export function updateSession(id: string, data: Partial<SessionData>): boolean {
  const existing = getSessionById(id);
  if (!existing) return false;
  const filePath = sessionPath(id);
  if (!filePath) return false;
  const payload = { ...existing, ...data, createdAt: Date.now() };
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
  return true;
}

// Cleanup old sessions (call periodically)
export function cleanupSessions() {
  ensureDir();
  const files = fs.readdirSync(SESSION_DIR).filter(f => f.endsWith(".json"));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(SESSION_DIR, file), "utf-8");
      const data = JSON.parse(raw);
      if (Date.now() - data.createdAt > SESSION_MAX_AGE) {
        fs.unlinkSync(path.join(SESSION_DIR, file));
      }
    } catch {}
  }
}
