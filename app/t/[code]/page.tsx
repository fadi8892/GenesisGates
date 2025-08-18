import Link from "next/link";

export default function TreeByCodePage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || "").toUpperCase();

  // Accept a demo code; otherwise show unknown
  const isDemo = ["GG-DEMO-2025", "FAMILY-1234", "DOURI-ROOTS"].includes(code);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] to-[#0b1220] text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{isDemo ? "Demo Tree" : "Unknown Tree"}</h1>
            <div className="text-white/60 text-xs">Code: {code}</div>
          </div>

          <div className="mt-4 flex gap-2 text-xs">
            <Link href={`/t/${code}`} className="rounded px-3 py-1 bg-white/10 border border-white/10">Tree</Link>
            <Link href={`/t/${code}/map`} className="rounded px-3 py-1 bg-white/10 border border-white/10">Map</Link>
            <Link href={`/t/${code}/nft`} className="rounded px-3 py-1 bg-white/10 border border-white/10">NFT</Link>
          </div>

          <div className="mt-6 bg-white text-black rounded-xl p-6">
            <p>This is a placeholder tree viewer. We’ll plug in your real data editor/reader next.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
