import { NextResponse } from "next/server";
import { emailFromSession } from "@/lib/auth";
import { getStore } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const email = emailFromSession(req.headers.get("cookie") || "");
  if (!email) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = await req.json();
  const { memberEmail, role } = body as { memberEmail: string; role: "admin"|"editor"|"viewer" };

  const t = getStore().trees.get(params.id);
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (t.members[email] !== "owner" && t.members[email] !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!memberEmail || !role) return NextResponse.json({ error: "missing" }, { status: 400 });
  t.members[memberEmail] = role;
  if (!getStore().users.has(memberEmail)) getStore().users.set(memberEmail, { email: memberEmail });

  return NextResponse.json({ ok: true, tree: t });
}
