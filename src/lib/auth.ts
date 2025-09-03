import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { kv } from './kv';
import { sql } from './db';

const COOKIE = 'gg_session';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET missing');
  return s;
}

export async function startOtp(email: string) {
  if (!email || !email.includes('@')) throw new Error('Invalid email');
  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  await kv.set(`otp:${email}`, code, { ex: 600 });
  // In dev, return the code; in prod, you would send via Resend/SMTP
  return { email, code: process.env.NODE_ENV !== 'production' ? code : undefined };
}

export async function verifyOtp(email: string, code: string) {
  const k = `otp:${email}`;
  const v = await kv.get<string>(k);
  if (!v || v !== code) throw new Error('Invalid code');
  await kv.del(k);
  // upsert user
  const { rows } = await sql`insert into users (email) values (${email}) on conflict (email) do update set email=excluded.email returning *`;
  const user = rows[0];
  const token = jwt.sign({ userId: user.id, email: user.email }, secret(), { expiresIn: '7d' });
  cookies().set(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  return { ok: true };
}

export function getSessionOrNull() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const data = jwt.verify(token, secret()) as any;
    return data;
  } catch {
    return null;
  }
}

export function requireSession() {
  const s = getSessionOrNull();
  if (!s) throw new Error('Unauthorized');
  return s as { userId: string; email: string };
}

export function clearSession() {
  cookies().delete(COOKIE);
}
