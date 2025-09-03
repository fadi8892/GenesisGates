import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = typeof body?.email === 'string' ? body.email : '';
    const code  = typeof body?.code  === 'string' ? body.code  : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const result = await verifyOtp(email, code);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Verification failed' },
      { status: 400 }
    );
  }
}
