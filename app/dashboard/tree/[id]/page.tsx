// app/dashboard/tree/[id]/page.tsx
import { notFound } from "next/navigation";
import TreeClient from "./TreeClient";
import { getTreeData } from "./api";

export default async function TreePage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params; // ✅ unwrap Promise

  const treeId = id;

  // guard bad URLs like /dashboard/tree/undefined
  if (!treeId || treeId === "undefined" || treeId === "null") {
    notFound();
  }

  const data = await getTreeData(treeId);

  return (
    <div style={{ padding: 16 }}>
      <TreeClient treeId={treeId} initialData={data} />
    </div>
  );
}
