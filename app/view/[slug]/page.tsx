import { supabaseServer } from "@/lib/supabase/server";
import Viewer from "./viewer";

export default async function ViewPage({ params }: { params: { slug: string } }) {
  // Demo slug uses a public tree, or you can map slug->tree
  const supabase = supabaseServer();

  // If slug === "demo", create/read a public demo tree once (simple)
  if (params.slug === "demo") return <Viewer mode="demo" treeId={null} />;

  // For real share tokens (future): find tree by share_token
  const { data: tree } = await supabase
    .from("trees")
    .select("id")
    .eq("share_token", params.slug)
    .maybeSingle();

  return <Viewer mode="share" treeId={tree?.id ?? null} />;
}
