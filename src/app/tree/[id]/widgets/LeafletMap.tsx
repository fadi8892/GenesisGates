'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function loadClusterAssets() {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if ((L as any).MarkerClusterGroup) return resolve();
    const script = document.createElement('script');
    script.src =
      'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
    const link1 = document.createElement('link');
    link1.rel = 'stylesheet';
    link1.href =
      'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
    document.head.appendChild(link1);
    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href =
      'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
    document.head.appendChild(link2);
  });
}

type MapPoint = {
  lat: number;
  lon: number;
  label: string;
  type: 'birth' | 'residence' | 'death';
};

export default function LeafletMap({
  points,
  pinchZoom = true,
  inertia = true,
}: {
  points: MapPoint[];
  pinchZoom?: boolean;
  inertia?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    let map: L.Map | undefined;
    loadClusterAssets().then(() => {
      map = L.map(ref.current!, {
        touchZoom: pinchZoom ? 'center' : false,
        inertia,
      }).setView([20, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 12,
        attribution: '© OpenStreetMap',
      }).addTo(map!);
      // @ts-ignore markerClusterGroup added by plugin
      const cluster = (L as any).markerClusterGroup
        ? // @ts-ignore
          (L as any).markerClusterGroup()
        : L.layerGroup();
      points.forEach((p) => {
        const m = L.marker([p.lat, p.lon]).bindPopup(p.label);
        // @ts-ignore addLayer for cluster groups
        cluster.addLayer ? cluster.addLayer(m) : m.addTo(map!);
      });
      // @ts-ignore
      cluster.addTo ? cluster.addTo(map!) : null;
      if (points.length) {
        // @ts-ignore cluster may expose getBounds/getLayers
        const g = L.featureGroup(cluster.getLayers?.() || []);
        if (g.getLayers().length) {
          map!.fitBounds(g.getBounds().pad(0.25));
        }
      }
    });
    return () => {
      if (map) map.remove();
    };
  }, [points, pinchZoom, inertia]);
  return <div ref={ref} style={{ height: 360, width: '100%' }} />;
}
