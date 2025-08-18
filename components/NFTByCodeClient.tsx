"use client";
import { useMemo } from "react";

function buildMetadata({ code, title, description, peopleCount }:{
  code:string; title:string; description?:string; peopleCount:number;
}) {
  return {
    name: `${title} — GenesisGates`,
    description: description ?? "GenesisGates family tree (privacy-first). Public badge only; no PII on-chain.",
    image: "ipfs://REPLACE_WITH_IMAGE_CID",
    external_url: `https://example.com/t/${encodeURIComponent(code)}`,
    attributes: [
      { trait_type: "Tree Code", value: code },
      { trait_type: "People (count)", value: peopleCount },
      { trait_type: "Privacy", value: "No PII on-chain" },
      { trait_type: "Platform", value: "GenesisGates" }
    ]
  };
}

export default function NFTByCodeClient({ code }: { code: string }) {
  const meta = useMemo(() => buildMetadata({
    code, title: "GenesisGates Tree", description: "Demo metadata", peopleCount: 0
  }), [code]);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `genesisgates-${code}-metadata.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="text-sm text-gray-600">Preview (ERC-721 JSON)</div>
      <pre className="mt-2 text-xs overflow-auto bg-gray-50 p-3 rounded border text-black">
        {JSON.stringify(meta, null, 2)}
      </pre>
      <button onClick={downloadJson} className="mt-3 rounded bg-black text-white px-4 py-2">
        Download metadata.json
      </button>
      <p className="text-xs text-gray-400 mt-2">
        Keep identities private. The NFT is a public badge, not the raw family data.
      </p>
    </div>
  );
}
