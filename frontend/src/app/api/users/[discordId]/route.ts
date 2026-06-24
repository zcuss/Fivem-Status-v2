import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'http://localhost:34002';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ discordId: string }> }) {
  const { discordId } = await params;
  try {
    const res = await fetch(`${BACKEND}/api/users/${discordId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ discordId: string }> }) {
  const { discordId } = await params;
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/api/users/${discordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
