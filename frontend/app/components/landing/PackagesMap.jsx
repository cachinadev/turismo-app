// frontend/app/components/landing/PackagesMap.jsx
'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Carga dinámica de react-leaflet solo en el cliente
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker        = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup         = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

/** Mapea city -> coords aproximadas (puedes afinar o pasar coords reales desde backend) */
const CITY_COORDS = {
  Puno: [-15.8402, -70.0219],
  Cusco: [-13.53195, -71.96746],
  Lima: [-12.04637, -77.04279],
  Arequipa: [-16.40904, -71.53745],
  Otros: [-12.04637, -77.04279], // fallback (Lima)
};

export default function PackagesMap({ packages = [] }) {
  // Centro: si hay paquetes, centra en la primera ciudad; si no, Perú aprox.
  const center = useMemo(() => {
    const firstCity = packages.find(p => p?.city)?.city || 'Lima';
    return CITY_COORDS[firstCity] || [-9.19, -75.0152]; // centro Perú aprox
  }, [packages]);

  return (
    <div className="w-full h-[420px] rounded-xl overflow-hidden border">
      <MapContainer center={center} zoom={5} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          // Libre de uso con atribución
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
        />
        {packages.map((p) => {
          const coords = CITY_COORDS[p.city] || CITY_COORDS.Otros;
          const key = p._id || p.id || p.slug;
          return (
            <Marker key={key} position={coords}>
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-slate-600">{p.city} • {p.currency} {p.price}</div>
                  <a className="text-xs text-brand-700 underline" href={`/packages/${p.slug}`}>Ver detalle</a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
