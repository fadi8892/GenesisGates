"use client";

import { useRouter } from "next/navigation";
import PersonProfile from "../../PersonProfile";
import type { GraphData } from "../../graph/types";

export default function FullProfileClient({
  data,
  treeId,
  personId,
}: {
  data: GraphData;
  treeId: string;
  personId: string;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-[#F5F5F7]">
      <div className="mx-auto max-w-5xl py-8 px-4">
        <div className="rounded-[32px] overflow-hidden border border-gray-200 shadow-2xl bg-white">
          <PersonProfile
            data={data}
            personId={personId}
            treeId={treeId}
            onBack={() => router.push(`/dashboard/tree/${treeId}`)}
            onSelect={(id) => router.push(`/dashboard/tree/${treeId}/person/${id}`)}
            showFullProfileLink={false}
          />
        </div>
      </div>
    </div>
  );
}
