import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { startOtp } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    await rateLimit(`otp:${email}`, 5, 600);
    const res = await startOtp(email);
    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 });
  }
}
