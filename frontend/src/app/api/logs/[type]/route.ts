import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'http://localhost:34002';

const VALID_TYPES = ['commands', 'bot', 'console'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
  }

  try {
    const searchParams = req.nextUrl.searchParams.toString();
    const url = searchParams ? `${BACKEND}/api/logs/${type}?${searchParams}` : `${BACKEND}/api/logs/${type}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
