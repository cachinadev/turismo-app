// frontend/app/components/landing/PackagesShowcase.jsx
'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { mediaUrl } from '@/app/lib/media';

// Lazy-load the map on the client to avoid SSR issues with window/DOM APIs
const DynamicPackagesMap = dynamic(() => import('./PackagesMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] w-full rounded-xl border bg-slate-50 animate-pulse" />
  ),
});

export default function PackagesShowcase({ featured = [], all = [] }) {
  const [view, setView] = useState('list'); // 'list' | 'map'

  // Accept both shapes: p.location.{lat,lng} or p.{lat,lng}
  const mapPackages = useMemo(() => {
    return (all || []).filter((p) => {
      const lat = Number(p?.location?.lat ?? p?.lat);
      const lng = Number(p?.location?.lng ?? p?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
  }, [all]);

  return (
    <section id="destacados" className="py-16">
      <div className="container-default">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Descubre Perú</h2>

          {/* Segmented toggle */}
          <div className="inline-flex rounded-xl border overflow-hidden">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium transition ${
                view === 'list' ? 'bg-brand-600 text-white' : 'bg-white hover:bg-slate-50'
              }`}
            >
              Listado
            </button>
            <button
              type="button"
              onClick={() => setView('map')}
              className={`px-4 py-2 text-sm font-medium transition border-l ${
                view === 'map' ? 'bg-brand-600 text-white' : 'bg-white hover:bg-slate-50'
              }`}
            >
              Mapa
            </button>
          </div>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            {featured.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <p className="text-slate-600">
                    Aún no hay paquetes activos. Crea algunos en <b>Admin → Gestión de Paquetes</b>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((p) => {
                  const id = p._id || p.id || p.slug;
                  const img = mediaUrl(p.media?.[0]?.url) || 'https://picsum.photos/600/400';
                  return (
                    <Link key={id} className="group card" href={`/packages/${p.slug}`}>
                      <div className="relative">
                        <img
                          src={img}
                          alt={p.title}
                          className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {p.city && <div className="absolute top-3 left-3 badge">{p.city}</div>}
                      </div>
                      <div className="card-body">
                        <h3 className="font-semibold text-lg line-clamp-1">{p.title}</h3>
                        <p className="text-slate-600 line-clamp-2">{p.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-brand-700 font-semibold">
                            {p.currency} {p.price}
                          </span>
                          <span className="text-xs text-slate-500">{p.durationHours || 8} h</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-8 text-right">
              <Link href="/packages" className="text-brand-700 font-medium">
                Ver todos los paquetes →
              </Link>
            </div>
          </>
        )}

        {/* MAP VIEW */}
        {view === 'map' && (
          <div className="rounded-xl overflow-hidden border">
            <DynamicPackagesMap
              // Show only packages with valid coords
              packages={mapPackages}
              // If your PackagesMap accepts these, great; otherwise it will ignore.
              className="h-[560px] w-full"
              height={560}
            />
          </div>
        )}
      </div>
    </section>
  );
}
