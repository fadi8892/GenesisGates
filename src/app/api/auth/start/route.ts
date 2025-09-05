import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { issueOtp } from "@/lib/auth";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const users = getStore().users;
  if (!users.has(email)) users.set(email, { email });

  const code = issueOtp(email);
  console.log("[OTP]", email, code); // In production, email it via provider
  return NextResponse.json({ ok: true });
}
