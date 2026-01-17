// app/api/trees/[id]/relative/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseServer() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const treeId = params.id;
  const supabase = supabaseServer();

  const body = await req.json();
  const baseId = String(body.baseId ?? "");
  const kind = body.kind as "father" | "mother" | "child";

  if (!baseId || !kind) {
    return new NextResponse("Missing baseId/kind", { status: 400 });
  }

  // 1) Create new node
  // Adjust columns for your schema:
  const { data: newNode, error: nErr } = await supabase
    .from("nodes")
    .insert({
      tree_id: treeId,
      first_name: "",
      last_name: "",
      sex: kind === "father" ? "M" : kind === "mother" ? "F" : null,
    })
    .select("*")
    .single();

  if (nErr) return new NextResponse(nErr.message, { status: 500 });

  // 2) Create edge direction: parent -> child
  const parentId = kind === "child" ? baseId : newNode.id;
  const childId = kind === "child" ? newNode.id : baseId;

  const { error: eErr } = await supabase.from("edges").insert({
    tree_id: treeId,
    source: parentId,
    target: childId,
    type: "parent_child",
  });

  if (eErr) return new NextResponse(eErr.message, { status: 500 });

  // 3) Return updated graph data
  const { data: nodes, error: n2Err } = await supabase
    .from("nodes")
    .select("*")
    .eq("tree_id", treeId);

  if (n2Err) return new NextResponse(n2Err.message, { status: 500 });

  const { data: edges, error: e2Err } = await supabase
    .from("edges")
    .select("*")
    .eq("tree_id", treeId);

  if (e2Err) return new NextResponse(e2Err.message, { status: 500 });

  return NextResponse.json({ nodes: nodes ?? [], edges: edges ?? [] });
}
