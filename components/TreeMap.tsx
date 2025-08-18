"use client";
import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export default function TreeMap({ data }: { data: any }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any;
    (async () => {
      const L = (await import("leaflet")).default as any;
      await import("leaflet.heat");

      map = L.map(mapRef.current!, { preferCanvas: true }).setView([20, 10], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        detectRetina: true,
        maxZoom: 18
      }).addTo(map);

      let points =
        Array.isArray(data?.migrations) && data.migrations.length
          ? data.migrations.map((m:any) => ({ lat: m.lat, lng: m.lng, weight: 0.7 }))
          : (data?.people || [])
              .filter((p:any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
              .map((p:any) => ({ lat: p.lat, lng: p.lng, weight: 0.7 }));

      if (!points.length) points = [{ lat: 36.1911, lng: 44.0096, weight: 0.7 }];

      const triples = points.map((p:any)=>[p.lat,p.lng,p.weight ?? 0.7]) as any[];
      // @ts-ignore
      L.heatLayer(triples, { radius: 25, blur: 15, minOpacity: 0.25 }).addTo(map);
    })();

    return () => { if (map) map.remove(); };
  }, [data]);

  return <div ref={mapRef} className="h-[520px] w-full rounded overflow-hidden" />;
}
