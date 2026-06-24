import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "/"));
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
}
