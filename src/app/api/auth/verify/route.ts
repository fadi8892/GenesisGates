import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    await verifyOtp(email, code);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 });
  }
}
