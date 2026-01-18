<<<<<<< HEAD
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { API_BASE, SITE_URL } from "@/app/lib/config";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";

const DESTINATIONS = [
  {
    city: "Puno",
    slug: "puno",
    shape: "hexagon",
    color: "#0086C0",
  },
  {
    city: "Cusco",
    slug: "cusco",
    shape: "circle",
    color: "#0E374A",
  },
  {
    city: "Lima",
    slug: "lima",
    shape: "triangle",
    color: "#A3B117",
  },
  {
    city: "Arequipa",
    slug: "arequipa",
    shape: "diamond",
    color: "#0086C0",
  },
  {
    city: "Otros",
    slug: "others",
    shape: "pentagon",
    color: "#0E374A",
  },
];

const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const canonical = `${normalizeBase(SITE_URL || "")}/destinations`;

/* ------------------ Metadata ------------------ */
export const viewport = {
  title: `${BRAND} | Galería de Destinos`,
  description: `Un viaje visual por los destinos más espectaculares del Perú.`,
  alternates: { canonical },
  openGraph: {
    title: `${BRAND} | Galería Visual`,
    description: "Explora Perú a través de imágenes reales de nuestros paquetes",
    url: canonical,
    type: "website",
    siteName: BRAND,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND} | Galería Visual`,
    description: "Descubre Perú con imágenes reales de experiencias",
  },
};

/* ------------------ Data ------------------ */
async function fetchCityPreview(city) {
  try {
    const res = await fetch(
      `${API_BASE}/api/packages?city=${encodeURIComponent(city)}&limit=8`,
      { cache: "no-store" }
    );
    if (!res.ok) return { total: 0, packages: [] };

    const json = await res.json().catch(() => ({}));
    const items = Array.isArray(json?.items) ? json.items : [];
    
    const packages = items.slice(0, 8).map(item => ({
      image: item?.media?.find((m) => m?.type === "image")?.url ||
             item?.media?.[0]?.url ||
             null,
      title: item?.title || ""
    }));

    const total = typeof json?.total === "number" ? json.total : items.length;

    return { total, packages };
  } catch {
    return { total: 0, packages: [] };
  }
}

/* ------------------ Page ------------------ */
export default async function DestinationsPage() {
  const previews = await Promise.all(
    DESTINATIONS.map(async (d, index) => {
      const { total, packages } = await fetchCityPreview(d.city);
      
      // Filtrar solo imágenes válidas
      const validPackages = packages.filter(p => p.image && p.image.trim() !== '');
      
      return { 
        ...d, 
        total,
        packages: validPackages,
        displayName: d.city === "Otros" ? "Otros" : d.city 
      };
    })
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50/50 to-white">
      {/* Hero - Minimal Geometric */}
      <div className="relative overflow-hidden">
        {/* Geometric Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-40 h-40 bg-[#0086C0] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-60 h-60 bg-[#0E374A] rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-[#A3B117] rounded-full blur-3xl"></div>
        </div>
        
        <div className="container-default relative z-10 pt-24 pb-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: i % 3 === 0 ? '#A3B117' : i % 2 === 0 ? '#0086C0' : '#0E374A'
                  }}
                ></div>
              ))}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter">
              <span className="text-[#0E374A]">VIAJES </span>
              <span className="text-[#A3B117]"> INNOLVIDABLES</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-xl mx-auto mb-12">
              Imágenes reales de experiencias reales
            </p>
            
            <div className="inline-flex items-center gap-6 px-8 py-4 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0086C0]"></div>
                <span className="text-gray-700">{previews.length} destinos</span>
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#A3B117]"></div>
                <span className="text-gray-700">
                  {previews.reduce((sum, d) => sum + d.total, 0)} experiencias
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Geometric Destinations Gallery */}
      <div className="container-default pb-32">
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 relative z-10">
            {previews.map((destination, index) => {
              const shapeClasses = {
                hexagon: "clip-hexagon",
                circle: "rounded-full",
                triangle: "clip-triangle",
                diamond: "clip-diamond rotate-45",
                pentagon: "clip-pentagon",
              };

              // Tomar hasta 3 imágenes de los paquetes para mostrar
              const displayImages = destination.packages.slice(0, 3);
              
              return (
                <div 
                  key={destination.slug}
                  className="relative group"
                >
                  <Link
                    href={`/packages?city=${encodeURIComponent(destination.city)}`}
                    className="block"
                  >
                    {/* Shape Container */}
                    <div className="relative">
                      {/* Outer Glow */}
                      <div 
                        className={`absolute inset-0 ${shapeClasses[destination.shape]} blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500`}
                        style={{ backgroundColor: destination.color }}
                      ></div>
                      
                      {/* Main Shape */}
                      <div 
                        className={`relative w-48 h-48 mx-auto ${shapeClasses[destination.shape]} bg-gradient-to-br from-white to-gray-100 shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:scale-110 flex items-center justify-center overflow-hidden`}
                      >
                        {/* Shape Border */}
                        <div 
                          className={`absolute inset-0 ${shapeClasses[destination.shape]} border-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300`}
                          style={{ borderColor: destination.color }}
                        ></div>
                        
                        {/* Si hay imágenes de paquetes, mostrar collage */}
                        {displayImages.length > 0 ? (
                          <div className="relative w-full h-full">
                            {/* Imagen principal centrada */}
                            {displayImages[0] && (
                              <div className="absolute inset-0">
                                <img
                                  src={displayImages[0].image}
                                  alt={displayImages[0].title || destination.displayName}
                                  className="w-full h-full object-cover transform scale-125 group-hover:scale-150 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
                              </div>
                            )}
                            
                            {/* Miniaturas flotantes si hay más imágenes */}
                            {displayImages.slice(1).map((pkg, imgIndex) => (
                              <div 
                                key={imgIndex}
                                className="absolute w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-lg"
                                style={{
                                  top: `${15 + imgIndex * 30}%`,
                                  left: `${10 + imgIndex * 25}%`,
                                  transform: `rotate(${imgIndex * 45}deg)`,
                                }}
                              >
                                <img
                                  src={pkg.image}
                                  alt={pkg.title || `${destination.displayName} ${imgIndex + 2}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            
                            {/* Si no hay suficientes imágenes, mostrar indicador */}
                            {destination.packages.length > 3 && (
                              <div className="absolute bottom-4 right-4">
                                <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                  <span className="text-xs font-bold" style={{ color: destination.color }}>
                                    +{destination.packages.length - 3}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Fallback si no hay imágenes */
                          <div className="relative z-10 flex flex-col items-center justify-center p-4">
                            <div 
                              className="w-24 h-24 rounded-full flex items-center justify-center mb-3"
                              style={{ backgroundColor: `${destination.color}20` }}
                            >
                              <span className="text-3xl">
                                {destination.shape === 'hexagon' ? '🌊' : 
                                 destination.shape === 'circle' ? '🏔️' : 
                                 destination.shape === 'triangle' ? '🌆' : 
                                 destination.shape === 'diamond' ? '🌋' : '✨'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 text-center px-2">
                              {destination.total} experiencias disponibles
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* City Name */}
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-20">
                        <div 
                          className="px-6 py-2 rounded-full shadow-lg backdrop-blur-sm"
                          style={{ backgroundColor: destination.color }}
                        >
                          <h3 className="text-base font-bold text-white whitespace-nowrap">
                            {destination.displayName}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Package Count */}
                      <div className="absolute -top-3 -right-3 z-30">
                        <div className="w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center">
                          <span 
                            className="text-base font-bold"
                            style={{ color: destination.color }}
                          >
                            {destination.total}
                          </span>
                        </div>
                      </div>
                      
                      {/* Hover Effect */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div 
                          className="px-4 py-2 rounded-full shadow-xl backdrop-blur-sm"
                          style={{ backgroundColor: destination.color }}
                        >
                          <span className="text-white font-medium text-sm">Ver {destination.total} paquetes →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {/* Connecting Dots */}
                  {index < previews.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-6 transform translate-y-1/2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((dot) => (
                          <div 
                            key={dot}
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: dot === 2 ? destination.color : `${destination.color}80`,
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Preview de más imágenes debajo */}
                  {destination.packages.length > 0 && (
                    <div className="mt-12">
                      <div className="grid grid-cols-3 gap-2">
                        {destination.packages.slice(0, 3).map((pkg, imgIndex) => (
                          <div 
                            key={imgIndex}
                            className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                          >
                            <img
                              src={pkg.image}
                              alt={pkg.title || `${destination.displayName} ${imgIndex + 1}`}
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-center">
                        <Link
                          href={`/packages?city=${encodeURIComponent(destination.city)}`}
                          className="text-sm font-base hover:underline inline-flex items-center gap-1"
                          style={{ color: destination.color }}
                        >
                          Ver todas las experiencias
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* CTA con estadísticas */}
        <div className="mt-32">
          <div className="bg-gradient-to-r from-[#0086C0]/5 via-[#0E374A]/5 to-[#A3B117]/5 rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-10">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#0E374A] mb-2">
                  {previews.length}
                </div>
                <div className="text-gray-600">Destinos únicos</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#0086C0] mb-2">
                  {previews.reduce((sum, d) => sum + d.total, 0)}
                </div>
                <div className="text-gray-600">Paquetes activos</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#A3B117] mb-2">
                  {previews.reduce((sum, d) => sum + d.packages.length, 0)}+
                </div>
                <div className="text-gray-600">Fotos reales</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#0E374A] mb-2">
                  100%
                </div>
                <div className="text-gray-600">Experiencias verificadas</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="inline-block relative group">
                <Link
                  href="/packages"
                  className="relative inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-[#0086C0] to-[#0E374A] text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 group/btn"
                >
                  <span>Explorar todas las experiencias</span>
                  <span className="text-base group-hover/btn:translate-x-2 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>


    </main>
  );
}
=======
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { API_BASE, SITE_URL } from "@/app/lib/config";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";

const DESTINATIONS = [
  {
    city: "Puno",
    slug: "puno",
    blurb:
      "Gateway to Lake Titicaca: Uros, Taquile, Sillustani and rich Aymara culture.",
  },
  {
    city: "Cusco",
    slug: "cusco",
    blurb:
      "Heart of the Inca empire: Sacred Valley, Rainbow Mountain, and world-class trekking.",
  },
  {
    city: "Lima",
    slug: "lima",
    blurb:
      "Clifftop capital of Peru: food scene, history, and coastal day trips.",
  },
  {
    city: "Arequipa",
    slug: "arequipa",
    blurb:
      "The White City: Colca Canyon, volcano views, and serene monasteries.",
  },
  {
    // NOTE: backend uses "Otros" (Spanish); keep this key for API correctness.
    city: "Otros",
    slug: "others",
    blurb: "Hidden gems across Peru: off-the-beaten-path nature and culture.",
  },
];

const FALLBACK_IMG = "https://picsum.photos/1200/800?blur=2";

const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const canonical = `${normalizeBase(SITE_URL || "")}/destinations`;

/* ------------------ Metadata ------------------ */
export const viewport = {
  title: `${BRAND} | Destinations in Peru`,
  description: `Explore destinations in Peru — Puno, Cusco, Lima, Arequipa and more. Find curated experiences with ${BRAND}.`,
  alternates: { canonical },
  openGraph: {
    title: `${BRAND} | Destinations`,
    description:
      "Browse top cities and jump straight into curated experiences.",
    url: canonical,
    type: "website",
    siteName: BRAND,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND} | Destinations`,
    description: "Pick a city to see tours and experiences.",
  },
};

/* ------------------ Data ------------------ */
async function fetchCityPreview(city) {
  try {
    const res = await fetch(
      `${API_BASE}/api/packages?city=${encodeURIComponent(city)}&limit=1`,
      { cache: "no-store" }
    );
    if (!res.ok) return { total: 0, cover: null };

    const json = await res.json().catch(() => ({}));
    const item = Array.isArray(json?.items) ? json.items[0] : null;
    const cover =
      item?.media?.find((m) => m?.type === "image")?.url ||
      item?.media?.[0]?.url ||
      null;

    const total =
      typeof json?.total === "number"
        ? json.total
        : Array.isArray(json?.items)
        ? json.items.length
        : 0;

    return { total, cover };
  } catch {
    return { total: 0, cover: null };
  }
}

/* ------------------ Page ------------------ */
export default async function DestinationsPage() {
  const previews = await Promise.all(
    DESTINATIONS.map(async (d) => {
      const { total, cover } = await fetchCityPreview(d.city);
      return { ...d, total, cover };
    })
  );

  // JSON-LD for SEO
  const itemListLD = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: previews.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${normalizeBase(SITE_URL || "")}/packages?city=${encodeURIComponent(
        d.city
      )}`,
      item: {
        "@type": "TouristDestination",
        name: d.city === "Otros" ? "Others" : d.city,
        description: d.blurb,
      },
    })),
  };

  return (
    <main>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLD) }}
      />

      {/* Breadcrumbs */}
      <div className="border-b border-slate-100">
        <div className="container-default py-3 text-sm text-slate-600">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800">Destinations</span>
        </div>
      </div>

      {/* Hero */}
      <section className="container-default py-10">
        <h1 className="text-3xl md:text-4xl font-bold">Destinations</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Pick a city to explore curated experiences — or jump straight to the
          map and browse visually.
        </p>
        <div className="mt-4">
          <Link href="/packages?view=map" className="btn btn-ghost">
            View all on map ↗
          </Link>
        </div>
      </section>

      {/* Destination Cards */}
      <section className="container-default pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {previews.map((d) => {
            const label = d.city === "Otros" ? "Others" : d.city;
            const href = `/packages?city=${encodeURIComponent(d.city)}`;
            const img = d.cover || FALLBACK_IMG;

            return (
              <Link
                key={d.slug}
                href={href}
                className="group card overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={img}
                    alt={`Tours and experiences in ${label}`}
                    className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="text-white text-xl font-semibold drop-shadow">
                        {label}
                      </p>
                      <p className="text-white/90 text-sm drop-shadow line-clamp-2">
                        {d.blurb}
                      </p>
                    </div>
                    <span className="badge bg-white/90 text-slate-800">
                      {d.total} {d.total === 1 ? "experience" : "experiences"}
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="text-brand-700 font-medium">
                    Explore {label} →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
