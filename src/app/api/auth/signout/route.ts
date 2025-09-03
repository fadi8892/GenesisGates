// src/app/api/auth/signout/route.ts
import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  clearSession();
  const origin = process.env.APP_ORIGIN ?? new URL(req.url).origin;
  return NextResponse.redirect(new URL('/', origin));
}
