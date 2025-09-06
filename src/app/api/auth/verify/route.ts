import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}

    const email = body?.email; // pass raw; auth.ts will coerce & validate
    const code  = body?.code;

    const result = await verifyOtp(email, code);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Verification failed' },
      { status: 400 }
    );
  }
}
