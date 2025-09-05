"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Pt = { lat: number; lon: number; label: string };
type Line = { lat: number; lon: number }[];

export default function LeafletMap({ points, lines }: { points: Pt[]; lines?: Line[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (mapRef.current) return;

    const map = L.map(ref.current).setView([20,0], 2);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const group: any[] = [];
    points.forEach(p => {
      const m = L.marker([p.lat, p.lon]).addTo(map).bindPopup(p.label);
      group.push(m);
    });

    (lines || []).forEach(line => {
      const poly = L.polyline(line.map(pt => [pt.lat, pt.lon] as [number, number]), { weight: 2 });
      poly.addTo(map);
      group.push(poly);
    });

    if (group.length) {
      const bounds = L.featureGroup(group as any).getBounds();
      map.fitBounds(bounds.pad(0.2));
    }

    return () => { group.forEach((g:any) => map.removeLayer(g)); };
  }, [points, JSON.stringify(lines || [])]);

  return <div ref={ref} className="w-full h-[520px] rounded-xl overflow-hidden border" />;
}
