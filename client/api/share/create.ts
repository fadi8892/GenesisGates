export const runtime = "edge";
import { kv } from "@vercel/kv";

const headers = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function genCode(): string {
  const base32 = "ABCDEFGHJKLMNPQRSTUVWXYZ234567";
  const group = () =>
    Array.from({ length: 5 }, () => base32[Math.floor(Math.random() * base32.length)]).join("");
  // format: AAAAA-BBBBB-CCCCC-DDDDD-EEEEE
  return [group(), group(), group(), group(), group()].join("-");
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const cid = body?.cid as string | undefined;
  if (!cid || typeof cid !== "string") {
    return new Response(JSON.stringify({ error: "Missing 'cid' in JSON body" }), { status: 400, headers });
  }

  // generate a unique code (retry if collision)
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const exists = await kv.exists(`code:${code}`);
    if (!exists) break;
    code = genCode();
  }

  // store mapping with 1-year TTL (adjust as you like)
  await kv.set(`code:${code}`, cid, { ex: 60 * 60 * 24 * 365 });

  return new Response(JSON.stringify({ code }), { status: 200, headers });
}
