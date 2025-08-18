export const dynamicParams = false;
export function generateStaticParams() {
  return [
    { code: "GG-DEMO-2025" },
    { code: "DOURI-ROOTS" },
    { code: "FAMILY-1234" }
  ];
}
import NFTByCodeClient from "../../../../components/NFTByCodeClient";

export const dynamic = "force-static";

export default function NFTByCodePage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || "").toUpperCase();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] to-[#0b1220] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-5">
          <h1 className="text-xl font-semibold">NFT · {code}</h1>
          <div className="mt-4 bg-white rounded-xl p-4">
            <NFTByCodeClient code={code} />
          </div>
        </div>
      </div>
    </div>
  );
}
