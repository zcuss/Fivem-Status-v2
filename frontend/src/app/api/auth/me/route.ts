import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    data: {
      userId: session.userId,
      username: session.username,
      avatar: session.avatar,
      globalName: session.globalName,
      role: session.role,
      guilds: session.guilds || [],
    },
  });
}
