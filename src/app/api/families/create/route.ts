import { NextResponse } from "next/server";
import { emailFromSession } from "@/lib/auth";
import { getStore, genId } from "@/lib/db";

export async function POST(req: Request) {
  const email = emailFromSession(req.headers.get("cookie") || "");
  if (!email) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });

  const t = { id: genId("t"), name, createdAt: Date.now(), members: { [email]: "owner" }, people: {} };
  getStore().trees.set(t.id, t as any);
  return NextResponse.json({ ok: true, tree: t });
}
