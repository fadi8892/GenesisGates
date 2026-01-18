import { notFound } from "next/navigation";
import { getTreeData } from "../../api";
import FullProfileClient from "./FullProfileClient";

export default async function PersonProfilePage({
  params,
}: {
  params: { id: string; personId: string };
}) {
  const { id, personId } = params;

  if (!id || !personId) {
    return notFound();
  }

  const data = await getTreeData(id);

  return <FullProfileClient data={data} treeId={id} personId={personId} />;
}
