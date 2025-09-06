'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LeafletMap({ points }: { points: {lat:number, lon:number, label:string}[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if (!ref.current) return;
    const map = L.map(ref.current).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    const group: any[] = [];
    points.forEach(p => {
      const m = L.marker([p.lat, p.lon]).addTo(map).bindPopup(p.label);
      group.push(m);
    });
    if (group.length) {
      const g = L.featureGroup(group as any);
      map.fitBounds(g.getBounds().pad(0.25));
    }
    return () => { map.remove(); };
  }, [points]);
  return <div ref={ref} style={{height: 360, width: '100%'}} />;
}
