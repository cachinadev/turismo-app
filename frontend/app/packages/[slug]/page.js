// frontend/app/packages/[slug]/page.js
import BookingForm from "@/app/components/BookingForm";
import { notFound } from "next/navigation";
import { mediaUrl } from "@/app/lib/media";
import Link from "next/link";
import { API_BASE, SITE_URL } from "@/app/lib/config";
import MediaCarousel from "@/app/components/MediaCarousel";

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const EMAIL_SALES = process.env.NEXT_PUBLIC_EMAIL_SALES || "contact@vicuadvent.com";
const PHONE = process.env.NEXT_PUBLIC_PHONE || "+51 982397386";

const WA_NUMBER = (PHONE.match(/\d+/g) || []).join("") || "51982397386";
const whatsappHref = (title, url) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi! I'm interested in "${title}". ${url || ""}`)}`;

const money = (v, curr = "PEN", locale = "en-US") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: (curr || "PEN").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const normalizeBase = (u = "") => u.replace(/\/+$/, "");

/* ---------- Data helpers ---------- */
async function fetchPackage(slug) {
  try {
    const res = await fetch(`${API_BASE}/api/packages/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();

    const media = Array.isArray(json?.media)
      ? json.media
          .filter((m) => m && m.url && (m.type === "image" || m.type === "video"))
          .map((m) => ({ ...m, url: mediaUrl(m.url) }))
      : [];

    return { ...json, media };
  } catch {
    return null;
  }
}

async function fetchRelated(pkg) {
  try {
    const params = new URLSearchParams();
    if (pkg?.city) params.set("city", pkg.city);
    params.set("limit", "6");
    const res = await fetch(`${API_BASE}/api/packages?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => []);
    const list = Array.isArray(json) ? json : json?.items || [];
    return list
      .filter((p) => p.slug !== pkg.slug)
      .slice(0, 3)
      .map((p) => ({
        ...p,
        media: Array.isArray(p.media) ? p.media.map((m) => ({ ...m, url: mediaUrl(m.url) })) : [],
      }));
  } catch {
    return [];
  }
}

/* ---------- SEO ---------- */
export async function generateMetadata({ params }) {
  const pkg = await fetchPackage(params.slug);
  if (!pkg) return { title: "Package not found" };

  const title = `${pkg.title} | ${BRAND_NAME}`;
  const description =
    (pkg.description || "").replace(/\s+/g, " ").slice(0, 155) ||
    "Guided experiences and day tours in Peru.";
  const image = pkg.media?.[0]?.url;
  const base = normalizeBase(SITE_URL);
  const url = base ? `${base}/packages/${params.slug}` : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
      type: "article",
      ...(url ? { url } : {}),
      siteName: BRAND_NAME,
    },
  };
}

function buildShareLinks({ title, url }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    wa: `https://wa.me/?text=${t}%20${u}`,
    tg: `https://t.me/share/url?url=${u}&text=${t}`,
    fb: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    tw: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  };
}

// Build a contextual message based on package data
function buildContextualMessage({ pkg, hasPromo, discountPct, priceOrig, priceNow, currency }) {
  const langs =
    Array.isArray(pkg.languages) && pkg.languages.length
      ? pkg.languages.join(", ")
      : "Spanish / English";

  if (hasPromo && typeof discountPct === "number") {
    return {
      title: `Limited-time deal: save ${discountPct}%`,
      detail: `Now ${money(priceNow, currency)} (was ${money(priceOrig, currency)}). Daily departures, ${langs}.`,
      tone: "deal",
    };
  }

  if (pkg.city && pkg.durationHours) {
    return {
      title: `Great for a ${pkg.durationHours}h visit in ${pkg.city}`,
      detail: `Available in ${langs}. Small groups • Local certified guides • Easy booking.`,
      tone: "info",
    };
  }

  return {
    title: "Popular experience with great reviews",
    detail: `Available in ${langs}. Flexible changes and 24/7 support.`,
    tone: "info",
  };
}

export default async function PackageDetail({ params }) {
  const { slug } = params;
  const pkg = await fetchPackage(slug);
  if (!pkg) return notFound();

  const base = normalizeBase(SITE_URL);
  const canonical = base ? `${base}/packages/${slug}` : "";
  const share = canonical ? buildShareLinks({ title: pkg.title, url: canonical }) : null;

  // Price / promo
  const currency = (pkg.currency || "PEN").toUpperCase();
  const hasPromo = !!pkg.isPromoActive && typeof pkg.effectivePrice === "number";
  const priceOrig = Number(pkg.price || 0);
  const priceNow = hasPromo ? Number(pkg.effectivePrice || priceOrig) : priceOrig;
  const rawPct = hasPromo && priceOrig > 0 ? Math.round((1 - priceNow / priceOrig) * 100) : null;
  const discountPct = rawPct != null ? Math.max(0, Math.min(100, rawPct)) : null;

  // Contextual message
  const ctx = buildContextualMessage({ pkg, hasPromo, discountPct, priceOrig, priceNow, currency });

  // Related
  const related = await fetchRelated(pkg);

  // Map link
  const hasPoint =
    pkg?.location && typeof pkg.location.lat === "number" && typeof pkg.location.lng === "number";
  const mapsHref = hasPoint
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${pkg.location.lat},${pkg.location.lng}`
      )}`
    : null;

  // JSON-LD (Product + Breadcrumbs)
  const productLD = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.title,
    description: pkg.description,
    ...(pkg.media?.length
      ? { image: pkg.media.filter((m) => m.type === "image").map((m) => m.url) }
      : {}),
    brand: { "@type": "Brand", name: BRAND_NAME },
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: String(priceNow || 0),
      availability: "https://schema.org/InStock",
      url: canonical || "",
    },
  };

  const breadcrumbLD =
    canonical
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: normalizeBase(SITE_URL) || "/" },
            { "@type": "ListItem", position: 2, name: "Packages", item: `${normalizeBase(SITE_URL)}/packages` },
            { "@type": "ListItem", position: 3, name: pkg.title, item: canonical },
          ],
        }
      : null;

  return (
    <main>
      {/* JSON-LD for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLD) }} />
      {breadcrumbLD && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLD) }} />
      )}

      {/* Breadcrumbs */}
      <div className="border-b border-slate-100">
        <div className="container-default py-3 text-sm text-slate-600">
          <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span>
          <Link href="/packages" className="hover:underline">Packages</Link> <span className="mx-1">/</span>
          <span className="text-slate-800">{pkg.title}</span>
        </div>
      </div>

      <section className="container-default py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Detail */}
        <article className="lg:col-span-2 card overflow-hidden">
          {/* Media carousel */}
          <div className="relative">
            <MediaCarousel
              media={(pkg.media || []).map((m) => ({
                ...m,
                alt: m.type === "image" ? (pkg.title || "Package image") : undefined,
              }))}
              heightClass="h-[420px]"
              loop
            />
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              <span className="badge">{pkg.city || "Peru"}</span>
              {hasPromo && (
                <span className="badge bg-amber-500 text-white">
                  {discountPct ? `-${discountPct}%` : "Deal"}
                </span>
              )}
            </div>
          </div>

          <div className="card-body">
            <h1 className="text-2xl md:text-3xl font-bold">{pkg.title}</h1>

            {/* Contextual message */}
            <div
              className={`mt-3 rounded-lg border p-3 text-sm ${
                ctx.tone === "deal" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <p className="font-semibold">{ctx.title}</p>
              <p className="mt-0.5">{ctx.detail}</p>
              {canonical && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    className="btn btn-ghost btn-sm"
                    href={whatsappHref(pkg.title, canonical)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chat on WhatsApp
                  </a>
                  <a className="btn btn-ghost btn-sm" href={`mailto:${EMAIL_SALES}`}>Email us</a>
                </div>
              )}
            </div>

            {/* Description */}
            {pkg.description && <p className="text-slate-600 mt-4">{pkg.description}</p>}

            {/* Quick facts */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">City</p>
                <p className="font-medium">{pkg.city || "—"}</p>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Price</p>
                <p className="font-medium">
                  {hasPromo ? (
                    <>
                      <span className="line-through text-slate-500 mr-2">
                        {money(priceOrig, currency)}
                      </span>
                      <span className="text-brand-700 font-semibold">
                        {money(priceNow, currency)}
                      </span>
                    </>
                  ) : (
                    <span className="text-brand-700 font-semibold">
                      {money(priceNow, currency)}
                    </span>
                  )}
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Duration</p>
                <p className="font-medium">{pkg.durationHours || 8} h</p>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500">Languages</p>
                <p className="font-medium">
                  {Array.isArray(pkg.languages) && pkg.languages.length
                    ? pkg.languages.join(", ")
                    : "Spanish / English"}
                </p>
              </div>

              {/* Location → only show link */}
              {mapsHref && (
                <div className="rounded-lg border p-3 sm:col-span-2">
                  <p className="text-xs text-slate-500">Location</p>
                  <a
                    className="text-brand-700 underline font-medium"
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Maps ↗
                  </a>
                </div>
              )}
            </div>
            {/* Highlights */}
            {Array.isArray(pkg.highlights) && pkg.highlights.length > 0 && (
              <div className="mt-8">
                <p className="text-lg font-semibold mb-2">Highlights</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  {pkg.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 text-brand-700">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Includes / Exclusions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="font-semibold mb-2">Includes</p>
                  <ul className="list-disc pl-5 text-slate-700 space-y-1">
                    {pkg.includes.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(pkg.excludes) && pkg.excludes.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="font-semibold mb-2">Not included</p>
                  <ul className="list-disc pl-5 text-slate-700 space-y-1">
                    {pkg.excludes.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Share (if canonical) */}
            {share && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-500">Share:</span>
                <a className="btn btn-ghost btn-sm" href={share.wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a className="btn btn-ghost btn-sm" href={share.tg} target="_blank" rel="noopener noreferrer">Telegram</a>
                <a className="btn btn-ghost btn-sm" href={share.fb} target="_blank" rel="noopener noreferrer">Facebook</a>
                <a className="btn btn-ghost btn-sm" href={share.tw} target="_blank" rel="noopener noreferrer">X/Twitter</a>
              </div>
            )}

            {/* CTA */}
            <div className="mt-8 rounded-xl bg-slate-50 border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Ready to book this experience?</p>
                <p className="text-sm text-slate-600">Fast confirmation and 24/7 support.</p>
              </div>
              <a href="#book" className="btn btn-primary">Book now</a>
            </div>
          </div>
        </article>

        {/* Sidebar: booking + trust */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div id="book" className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">Book</p>
                  <span className="text-brand-700 font-semibold">
                    {hasPromo ? (
                      <>
                        <span className="line-through text-slate-500 mr-2">
                          {money(priceOrig, currency)}
                        </span>
                        {money(priceNow, currency)}
                      </>
                    ) : (
                      money(priceNow, currency)
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-500 -mt-1">Instant confirmation by email</p>
                <div className="mt-4">
                  <BookingForm pkg={pkg} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body space-y-3">
                <p className="text-sm font-semibold">Why book with us?</p>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex gap-2"><span>✅</span><span>Certified local operators</span></li>
                  <li className="flex gap-2"><span>✅</span><span>24/7 support in your language</span></li>
                  <li className="flex gap-2"><span>✅</span><span>Flexible change policy</span></li>
                  <li className="flex gap-2"><span>✅</span><span>Secure payments</span></li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Questions?</p>
              <p className="text-slate-600 mt-1">
                Message us on WhatsApp or email and we’ll help you plan your trip.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={whatsappHref(pkg.title, canonical)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  WhatsApp
                </a>
                <a href={`mailto:${EMAIL_SALES}`} className="btn btn-ghost btn-sm">Email</a>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Related */}
      {Array.isArray(related) && related.length > 0 && (
        <section className="container-default pb-12">
          <h3 className="text-xl font-semibold mb-4">You may also like</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((p) => {
              const img = mediaUrl(p.media?.[0]?.url) || "https://picsum.photos/600/400";
              const rHasPromo = !!p.isPromoActive && typeof p.effectivePrice === "number";
              const cur = (p.currency || "PEN").toUpperCase();
              const rPrice = money(rHasPromo ? p.effectivePrice : p.price, cur);
              return (
                <Link key={p.slug} href={`/packages/${p.slug}`} className="group card overflow-hidden">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={p.title || "Related package"}
                      className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="badge">{p.city || "Peru"}</span>
                      {rHasPromo && <span className="badge bg-amber-500 text-white">Deal</span>}
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="font-semibold line-clamp-1">{p.title}</p>
                    <p className="text-sm text-slate-600">{rPrice}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
