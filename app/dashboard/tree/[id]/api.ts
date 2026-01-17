// app/dashboard/tree/[id]/api.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { DbEdge, DbNode, GraphData } from "./graph/types";
import { normalizeEdge, normalizeNode } from "./graph/normalize";

function supabaseServer() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getTreeData(treeId: string): Promise<GraphData> {
  if (!treeId || treeId === "undefined" || treeId === "null") {
    throw new Error("getTreeData called without valid treeId");
  }

  const supabase = supabaseServer();

  // nodes schema you posted
  const { data: rawNodes, error: nErr } = await supabase
    .from("nodes")
    .select("id, tree_id, type, position_x, position_y, data, member_id, created_at, updated_at")
    .eq("tree_id", treeId);

  if (nErr) throw new Error(`Failed to load nodes: ${nErr.message}`);

  const { data: rawEdges, error: eErr } = await supabase
    .from("edges")
    .select("*")
    .eq("tree_id", treeId);

  if (eErr) throw new Error(`Failed to load edges: ${eErr.message}`);

  const nodes = (rawNodes ?? []).map((n) => normalizeNode(n as DbNode));

  const edges = (rawEdges ?? [])
    .map((e) => normalizeEdge(e as DbEdge, treeId))
    .filter(Boolean) as any;

  return { nodes, edges };
}
