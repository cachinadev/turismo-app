import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { API_BASE, SITE_URL } from "@/app/lib/config";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";

const DESTINATIONS = [
  { city: "Puno", slug: "puno", color: "#0086C0" },
  { city: "Cusco", slug: "cusco", color: "#0E374A" },
  { city: "Lima", slug: "lima", color: "#A3B117" },
  { city: "Arequipa", slug: "arequipa", color: "#0086C0" },
  { city: "Otros", slug: "others", color: "#0E374A" },
];

const normalizeBase = (u = "") => u.replace(/\/+$/, "");

async function fetchCityPackages(city) {
  try {
    const res = await fetch(
      `${API_BASE}/api/packages?city=${encodeURIComponent(city)}&limit=60`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json().catch(() => ({}));
    return Array.isArray(json?.items) ? json.items : [];
  } catch {
    return [];
  }
}

function pickImages(packages) {
  const list = [];
  for (const p of packages) {
    const media = Array.isArray(p?.media) ? p.media : [];
    for (const m of media) {
      if (m?.type === "image" && m?.url) {
        list.push({ url: m.url, title: p.title || "", slug: p.slug || "" });
      }
    }
  }
  return list;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function generateMetadata({ params }) {
  const locale = params?.locale || "es";
  const slug = params?.slug || "";
  const dest = DESTINATIONS.find((d) => d.slug === slug);
  if (!dest) return { title: "Destination not found" };

  const canonical = `${normalizeBase(SITE_URL || "")}/${locale}/destinations/${dest.slug}`;
  const title =
    locale === "en"
      ? `${dest.city} tours and galleries | ${BRAND}`
      : `${dest.city}: tours y galerías | ${BRAND}`;
  const description =
    locale === "en"
      ? `Discover tours, package galleries and booking options in ${dest.city}, Peru.`
      : `Descubre tours, galerías de paquetes y opciones de reserva en ${dest.city}, Perú.`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        es: `/es/destinations/${dest.slug}`,
        en: `/en/destinations/${dest.slug}`,
        fr: `/fr/destinations/${dest.slug}`,
        pt: `/pt/destinations/${dest.slug}`,
        ru: `/ru/destinations/${dest.slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: BRAND,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DestinationDetailPage({ params }) {
  const locale = params?.locale || "es";
  const slug = params?.slug || "";
  const dest = DESTINATIONS.find((d) => d.slug === slug);
  if (!dest) return notFound();

  const packages = await fetchCityPackages(dest.city);
  const images = shuffle(pickImages(packages)).slice(0, 24);
  const canonical = `${normalizeBase(SITE_URL || "")}/${locale}/destinations/${dest.slug}`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: locale === "en" ? "Home" : "Inicio", item: `${normalizeBase(SITE_URL || "")}/${locale}` },
      { "@type": "ListItem", position: 2, name: locale === "en" ? "Destinations" : "Destinos", item: `${normalizeBase(SITE_URL || "")}/${locale}/destinations` },
      { "@type": "ListItem", position: 3, name: dest.city, item: canonical },
    ],
  };
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: dest.city,
    url: canonical,
    about: packages.slice(0, 12).map((p) => p.title).filter(Boolean),
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50/50 to-white pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <div className="container-default pt-16 pb-6">
        <div className="text-sm text-slate-600 mb-4">
          <Link href={`/${locale}/destinations`} className="hover:underline">
            Destinos
          </Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800">{dest.city}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: dest.color }}>
              {dest.city}
            </h1>
            <p className="text-slate-600">
              Álbum fotográfico con imágenes de paquetes en {dest.city}.
            </p>
          </div>
          <Link
            href={`/${locale}/packages?city=${encodeURIComponent(dest.city)}`}
            className="btn btn-primary"
          >
            Ver paquetes
          </Link>
        </div>
      </div>

      <div className="container-default pb-20">
        {images.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">Aún no hay fotos disponibles para {dest.city}.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img, i) => {
              const href = img.slug ? `/${locale}/packages/${img.slug}` : `/${locale}/packages?city=${encodeURIComponent(dest.city)}`;
              return (
                <Link
                  key={`${img.url}-${i}`}
                  href={href}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 block"
                >
                  <Image
                    src={img.url}
                    alt={img.title || dest.city}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
