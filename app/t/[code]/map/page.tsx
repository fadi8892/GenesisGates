import MapByCodeClient from "../../../../components/MapByCodeClient";

export const dynamic = "force-static";

export default function MapByCodePage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || "").toUpperCase();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] to-[#0b1220] text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-5">
          <h1 className="text-xl font-semibold">Map · {code}</h1>
          <div className="mt-4 bg-white rounded-xl p-4">
            <MapByCodeClient code={code} />
          </div>
        </div>
      </div>
    </div>
  );
}
