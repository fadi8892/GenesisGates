import { NextResponse } from 'next/server';
import { startOtp } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const email = body?.email; // pass raw; auth.ts will coerce & validate

    const result = await startOtp(email);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to start sign-in' },
      { status: 400 }
    );
  }
}
