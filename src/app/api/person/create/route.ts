import { NextResponse } from "next/server";
import { emailFromSession } from "@/lib/auth";
import { getStore, genId, Person } from "@/lib/db";

export async function POST(req: Request) {
  const email = emailFromSession(req.headers.get("cookie") || "");
  if (!email) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { treeId, person } = await req.json() as { treeId: string; person: Partial<Person> };
  const t = getStore().trees.get(treeId);
  if (!t || !t.members[email]) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = person.id || genId("p");
  const p = { id, name: person.name || "Unnamed", spouseIds: [], parentIds: [], childIds: [], ...person };
  t.people[id] = p;
  return NextResponse.json({ ok: true, person: p });
}
