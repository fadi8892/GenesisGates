// src/lib/auth.ts
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { kv } from './kv';
import { sql } from './db';
import { sendOtpEmail } from './email';

const COOKIE = 'gg_session';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET missing');
  return s;
}

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

function normCode(code: string) {
  return code.trim().replace(/\s+/g, '');
}

export async function startOtp(emailRaw: string) {
  const email = normEmail(emailRaw);
  if (!email || !email.includes('@')) throw new Error('Invalid email');

  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  // store by normalized email
  await kv.set(`otp:${email}`, code, { ex: 600 });

  await sendOtpEmail(email, code);

  if (process.env.DEV_SHOW_OTP === '1') return { email, code };
  return { email };
}

export async function verifyOtp(emailRaw: string, codeRaw: string) {
  const email = normEmail(emailRaw);
  const code = normCode(codeRaw);

  if (!email || !email.includes('@')) throw new Error('Invalid email');
  if (!/^\d{6}$/.test(code)) throw new Error('Invalid code');

  const key = `otp:${email}`;
  const stored = await kv.get<string>(key);

  if (!stored || normCode(stored) !== code) {
    throw new Error('Invalid code');
  }

  await kv.del(key);

  const { rows } = await sql`
    insert into users (email) values (${email})
    on conflict (email) do update set email = excluded.email
    returning *;
  `;
  const user = rows[0];

  const token = jwt.sign({ userId: user.id, email: user.email }, secret(), {
    expiresIn: '7d',
  });

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  return { ok: true };
}

export function getSessionOrNull() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, secret()) as any;
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
