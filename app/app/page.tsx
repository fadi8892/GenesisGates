import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Workspace from "./workspace";

export default async function AppPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");

  await supabase.from("profiles").upsert({ user_id: data.user.id });

  return <Workspace />;
}
