export const runtime = "edge";

// Use your existing env var names from Upstash integration
const REDIS_REST_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL; // you have this

const REDIS_REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN; // you have this (WRITE)

const headers = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

// Generate code like AAAAA-BBBBB-CCCCC-DDDDD-EEEEE
function genCode(): string {
  const base32 = "ABCDEFGHJKLMNPQRSTUVWXYZ234567";
  const group = () => Array.from({ length: 5 }, () => base32[Math.floor(Math.random() * base32.length)]).join("");
  return [group(), group(), group(), group(), group()].join("-");
}

// Upstash REST helpers
async function redisGet(key: string): Promise<string | null> {
  const r = await fetch(`${REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.result ?? null;
}
async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  const url = new URL(`${REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`);
  if (ttlSeconds && ttlSeconds > 0) url.searchParams.set("EX", String(ttlSeconds));
  const r = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}` },
  });
  if (!r.ok) return false;
  const j = await r.json().catch(() => null);
  return j?.result === "OK";
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }
  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) {
    return new Response(JSON.stringify({ error: "Missing Upstash REST env vars" }), { status: 500, headers });
  }

  let cid: string | undefined;
  try {
    const body = await req.json();
    cid = body?.cid;
  } catch {}

  if (!cid || typeof cid !== "string") {
    return new Response(JSON.stringify({ error: "Missing 'cid' in JSON body" }), { status: 400, headers });
  }

  // Try up to 5 times to avoid collisions
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const exists = await redisGet(`code:${code}`);
    if (!exists) break;
    code = genCode();
  }

  // Store for 1 year
  const TTL = 60 * 60 * 24 * 365;
  const ok = await redisSet(`code:${code}`, cid, TTL);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Failed to save code" }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ code }), { status: 200, headers });
}
