import { NextResponse } from "next/server";
import { emailFromSession } from "@/lib/auth";
import { getStore } from "@/lib/db";

export async function GET(req: Request) {
  const email = emailFromSession(req.headers.get("cookie") || "");
  if (!email) return NextResponse.json({ trees: [] });

  const trees = Array.from(getStore().trees.values()).filter(t => t.members[email]);
  return NextResponse.json({ trees });
}
