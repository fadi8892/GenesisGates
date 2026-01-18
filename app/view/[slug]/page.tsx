import { createClient } from "@/lib/supabase/server";
import Viewer from "./viewer";

export default async function ViewPage({ params }: { params: Promise<{ slug: string }> }) {
  // 1. Await params (Next.js 15+ requirement)
  const { slug } = await params;

  // 2. Use createClient instead of supabaseServer
  const supabase = await createClient();

  // If slug === "demo", create/read a public demo tree once (simple)
  if (slug === "demo") return <Viewer mode="demo" treeId={null} />;

  // For real share tokens (future): find tree by share_token
  const { data: tree } = await supabase
    .from("trees")
    .select("id")
    .eq("share_token", slug)
    .maybeSingle();

  return <Viewer mode="share" treeId={tree?.id ?? null} />;
}