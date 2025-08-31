export const runtime = "edge";

const REDIS_REST_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL; // you have this

const REDIS_REST_TOKEN_READ =
  process.env.UPSTASH_REDIS_REST_TOKEN_READ_ONLY ||
  process.env.KV_REST_API_READ_ONLY_TOKEN || // you have this
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN; // fallback to write if needed

const headers = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }
  if (!REDIS_REST_URL || !REDIS_REST_TOKEN_READ) {
    return new Response(JSON.stringify({ error: "Missing Upstash REST env vars" }), { status: 500, headers });
  }

  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").toUpperCase();

  if (!/^[A-Z2-7]{5}(-[A-Z2-7]{5}){4}$/.test(code)) {
    return new Response(JSON.stringify({ error: "Invalid code format" }), { status: 400, headers });
  }

  const r = await fetch(`${REDIS_REST_URL}/get/${encodeURIComponent("code:" + code)}`, {
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN_READ}` },
    cache: "no-store",
  });

  if (!r.ok) {
    return new Response(JSON.stringify({ error: "Lookup failed" }), { status: 500, headers });
  }

  const j = await r.json().catch(() => null);
  const cid = j?.result || null;

  if (!cid) {
    return new Response(JSON.stringify({ error: "Code not found" }), { status: 404, headers });
  }

  return new Response(JSON.stringify({ cid }), { status: 200, headers });
}
