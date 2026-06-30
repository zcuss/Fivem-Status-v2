import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Fetch favorites from the backend - it uses the same cookie-based auth
    // The backend stores favorites in app_settings as "favorites.{discordId}"
    const res = await fetch(`${BACKEND}/api/favorites/${session.userId}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    // If backend doesn't have this endpoint, return empty
    return NextResponse.json({ ok: true, favorites: [] });
  } catch {
    return NextResponse.json({ ok: true, favorites: [] });
  }
}
