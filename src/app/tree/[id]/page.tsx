import TreeClient from "./tree-client";

export const dynamic = "force-dynamic";
export default function TreePage({ params }: { params: { id: string } }) {
  return <TreeClient treeId={params.id} />;
}
