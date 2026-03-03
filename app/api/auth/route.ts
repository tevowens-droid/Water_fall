import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const APP_PASSWORD = process.env.APP_PASSWORD;

  // If no password is configured, allow access
  if (!APP_PASSWORD) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { password } = await req.json();
    if (password === APP_PASSWORD) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
