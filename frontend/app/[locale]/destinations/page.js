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
