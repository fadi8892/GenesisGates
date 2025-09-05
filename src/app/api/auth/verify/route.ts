import { NextResponse } from "next/server";
import { verifyOtp, createSession } from "@/lib/auth";
import { getStore } from "@/lib/db";

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (!verifyOtp(email, code)) return NextResponse.json({ error: "bad code" }, { status: 400 });

  const sid = createSession(email);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", `gg_session=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax`);
  return res;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
