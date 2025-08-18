"use client";
import { useEffect, useState } from "react";
import TreeMap from "./TreeMap";

export default function MapByCodeClient({ code }: { code: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Demo data. Later: load from IPFS or DB by code.
    const demo = {
      people: [
        { id: "p1", name: "Ancestor", lat: 36.1911, lng: 44.0096 },
        { id: "p2", name: "Descendant", lat: 32.7157, lng: -117.1611 }
      ],
      migrations: [
        { lat: 36.1911, lng: 44.0096 },
        { lat: 32.7157, lng: -117.1611 }
      ]
    };
    setData(demo);
  }, [code]);

  if (!data) return <div className="text-black/70">Loading…</div>;
  return <TreeMap data={data} />;
}
