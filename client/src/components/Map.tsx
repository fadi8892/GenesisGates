import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function Map({ treeData }: { treeData: any }) {
  useEffect(() => {
    // Fix Leaflet icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer center={[30, 10]} zoom={2} style={{ height: '600px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      {(treeData.people || []).map((person: any) => (
        person.bLat && person.bLon && (
          <Circle
            key={person.id}
            center={[parseFloat(person.bLat), parseFloat(person.bLon)]}
            radius={50000}
            color="#6D28D9"
          />
        )
      ))}
    </MapContainer>
  );
}
