// src/lib/auth.ts
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { kv } from './kv';
import { sql, ensureSchema } from './db';
import { sendOtpEmail } from './email';

const COOKIE = 'gg_session';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET missing');
  return s;
}

// Coerce any input to a normalized email string
function normEmail(input: unknown) {
  const email = String(input ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Invalid email');
  return email;
}

// Coerce any input to a 6-digit code (strip spaces)
function normCode(input: unknown) {
  const code = String(input ?? '').trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) throw new Error('Invalid code');
  return code;
}

export async function startOtp(emailRaw: unknown) {
  await ensureSchema(); // make sure tables exist (safe to call repeatedly)
  const email = normEmail(emailRaw);

  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  await kv.set(`otp:${email}`, code, { ex: 600 });

  await sendOtpEmail(email, code);

  if (process.env.DEV_SHOW_OTP === '1') return { email, code };
  return { email };
}

export async function verifyOtp(emailRaw: unknown, codeRaw: unknown) {
  await ensureSchema(); // ensure before db writes
  const email = normEmail(emailRaw);
  const code = normCode(codeRaw);

  const key = `otp:${email}`;
  const stored = await kv.get<string>(key);
  if (!stored || stored.toString().trim() !== code) {
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

  // ✅ Correct overload: (name, value, options)
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
