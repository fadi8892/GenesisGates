import { kv } from './kv';

export async function rateLimit(key: string, limit: number, windowSec: number) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = `rl:${key}:${Math.floor(now / windowSec)}`;
  const n = await kv.incr(bucket);
  if (n === 1) await kv.expire(bucket, windowSec);
  if (n > limit) throw new Error('Rate limit exceeded');
}
