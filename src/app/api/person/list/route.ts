import { NextResponse } from "next/server";
import { emailFromSession } from "@/lib/auth";
import { getStore } from "@/lib/db";

export async function POST(req: Request) {
  const email = emailFromSession(req.headers.get("cookie") || "");
  if (!email) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { treeId } = await req.json();
  const t = getStore().trees.get(treeId);
  if (!t || !t.members[email]) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ people: Object.values(t.people) });
}
