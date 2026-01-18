// frontend/app/components/landing/PackagesMap.jsx
'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect } from 'react';

// Carga dinámica de react-leaflet solo en el cliente
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker        = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

/** Mapea city -> coords aproximadas */
const CITY_COORDS = {
  Puno: [-15.8402, -70.0219],
  Cusco: [-13.53195, -71.96746],
  Lima: [-12.04637, -77.04279],
  Arequipa: [-16.40904, -71.53745],
  Otros: [-12.04637, -77.04279],
};

export default function PackagesMap({ packages = [] }) {
  // Selecciona el primer paquete por defecto
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Al cargar, selecciona el primer paquete
  useEffect(() => {
    if (packages.length > 0) {
      setSelectedPackage(packages[0]);
    }
  }, [packages]);

  const center = useMemo(() => {
    if (selectedPackage?.city) {
      return CITY_COORDS[selectedPackage.city] || CITY_COORDS.Otros;
    }
    const firstCity = packages.find(p => p?.city)?.city || 'Lima';
    return CITY_COORDS[firstCity] || [-9.19, -75.0152];
  }, [packages, selectedPackage]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden shadow-lg">
      <MapContainer center={center} zoom={6} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
        />
        {packages.map((p) => {
          const coords = CITY_COORDS[p.city] || CITY_COORDS.Otros;
          const key = p._id || p.id || p.slug;
          const isSelected = selectedPackage?._id === p._id || selectedPackage?.slug === p.slug;
          
          return (
            <Marker 
              key={key} 
              position={coords}
              eventHandlers={{
                click: () => setSelectedPackage(p)
              }}
            />
          );
        })}
      </MapContainer>

      {/* Tarjeta flotante - SIEMPRE VISIBLE si hay paquete seleccionado */}
      {selectedPackage && (
        <div className="absolute top-6 left-6 z-[1000] w-80 bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-[#8b9b3a]">
          {/* Imagen del paquete con botón cerrar */}
          <div className="relative h-52">
            <img 
              src={selectedPackage.image || selectedPackage.images?.[0] || '/placeholder-destination.jpg'} 
              alt={selectedPackage.title}
              className="w-full h-full object-cover"
            />
            {/* Botón + en la esquina superior izquierda (como en tu imagen) */}
            <button 
              className="absolute top-3 left-3 w-9 h-9 bg-white rounded-md flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors font-bold text-xl text-gray-700"
            >
              +
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">
              {selectedPackage.title}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{selectedPackage.city}</p>

            {/* Información adicional si existe */}
            {selectedPackage.duration && (
              <p className="text-xs text-gray-600 mb-3">
                ⏱️ {selectedPackage.duration} días
              </p>
            )}

            {/* Precio - posicionado a la derecha */}
            <div className="flex items-center justify-end mb-5">
              <div className="bg-[#2d7a9e] text-white px-5 py-2.5 rounded-full flex items-center gap-2 shadow-md">
                <span className="text-base">📍</span>
                <span className="font-bold text-base">
                  {selectedPackage.currency || 'USD'} {selectedPackage.price}
                </span>
              </div>
            </div>

            {/* Botón Explore More */}
            <a 
              href={`/packages/${selectedPackage.slug}`}
              className="block w-full bg-[#8b9b3a] hover:bg-[#737f2f] text-white text-center font-bold py-3.5 rounded-lg transition-colors text-base"
            >
              Explore More →
            </a>
          </div>
        </div>
      )}

      {/* Miniatura de imagen secundaria (como en tu referencia) - opcional */}
      {selectedPackage?.images?.[1] && (
        <div className="absolute top-6 right-6 z-[999] w-32 h-32 rounded-lg overflow-hidden shadow-xl border-2 border-white">
          <img 
            src={selectedPackage.images[1]} 
            alt="Vista secundaria"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}