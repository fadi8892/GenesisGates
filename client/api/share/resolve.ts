export const runtime = "edge";
import { kv } from "@vercel/kv";

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

  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").toUpperCase();

  if (!/^[A-Z2-7]{5}(-[A-Z2-7]{5}){4}$/.test(code)) {
    return new Response(JSON.stringify({ error: "Invalid code format" }), { status: 400, headers });
  }

  const cid = await kv.get<string>(`code:${code}`);
  if (!cid) {
    return new Response(JSON.stringify({ error: "Code not found" }), { status: 404, headers });
  }

  return new Response(JSON.stringify({ cid }), { status: 200, headers });
}
