import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  clearSession();
  return NextResponse.redirect(new URL('/', process.env.APP_ORIGIN || 'http://localhost:5173'));
}
