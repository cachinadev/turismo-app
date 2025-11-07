// frontend/app/packages/[slug]/page.js
/* eslint-disable @next/next/no-img-element */

import BookingForm from "@/app/components/BookingForm";
import { notFound } from "next/navigation";
import { mediaUrl } from "@/app/lib/media";
import Link from "next/link";
import { API_BASE, SITE_URL } from "@/app/lib/config";
import MediaCarousel from "@/app/components/MediaCarousel";

/* -------------------------------------------------------
 * 🧊 Disable caching so locale strings always match UI
 * ------------------------------------------------------- */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- Branding & Contact ---------- */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const EMAIL_SALES = process.env.NEXT_PUBLIC_EMAIL_SALES || "contact@vicuadvent.com";
const PHONE = process.env.NEXT_PUBLIC_PHONE || "+51 953858267";
const WA_NUMBER = (PHONE.match(/\d+/g) || []).join("") || "51953858267";

/* ---------- i18n helpers ---------- */
const SUPPORTED = ["es", "en", "fr", "pt", "ru"];
const DEFAULT_LOCALE = "es";

const LOCALE_TO_INTL = {
  es: "es-PE",
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-PT",
  ru: "ru-RU",
};

async function loadMsgs(locale) {
  try {
    const mod = await import(`@/messages/${locale}.json`);
    return mod.default || {};
  } catch {
    console.warn(`⚠️ Missing messages for locale "${locale}"`);
    return {};
  }
}

const tr = (dict, path, fallback) => {
  const parts = path.split(".");
  let cur = dict;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return fallback ?? parts[parts.length - 1];
    cur = cur[p];
  }
  return cur ?? (fallback ?? parts[parts.length - 1]);
};

/* ---------- Utils ---------- */
const money = (v, curr = "PEN", locale = "en-US") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: (curr || "PEN").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const normalizeBase = (u = "") => u.replace(/\/+$/, "");

const whatsappHref = (title, url) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Hi! I'm interested in "${title}". ${url || ""}`
  )}`;

/* ---------- Fetch helpers ---------- */
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

    const res = await fetch(`${API_BASE}/api/packages?${params}`, { cache: "no-store" });
    if (!res.ok) return [];

    const json = await res.json().catch(() => []);
    const list = Array.isArray(json) ? json : json?.items || [];

    return list
      .filter((p) => p.slug !== pkg.slug)
      .slice(0, 3)
      .map((p) => ({
        ...p,
        media: Array.isArray(p.media)
          ? p.media.map((m) => ({ ...m, url: mediaUrl(m.url) }))
          : [],
      }));
  } catch {
    return [];
  }
}

/* ---------- SEO Metadata ---------- */
export async function generateMetadata({ params }) {
  const locale = SUPPORTED.includes(params.locale) ? params.locale : DEFAULT_LOCALE;
  const pkg = await fetchPackage(params.slug);
  if (!pkg) return { title: "Package not found" };

  const title = `${pkg.title} | ${BRAND_NAME}`;
  const description =
    (pkg.description || "").replace(/\s+/g, " ").slice(0, 155) ||
    "Guided experiences and day tours in Peru.";
  const image = pkg.media?.[0]?.url;
  const base = normalizeBase(SITE_URL);
  const url = base ? `${base}/${locale}/packages/${params.slug}` : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        es: `/es/packages/${params.slug}`,
        en: `/en/packages/${params.slug}`,
        fr: `/fr/packages/${params.slug}`,
        pt: `/pt/packages/${params.slug}`,
        ru: `/ru/packages/${params.slug}`,
      },
    },
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

/* ---------- Social Sharing ---------- */
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

/* ---------- Contextual message ---------- */
function buildContextualMessage({
  pkg,
  hasPromo,
  discountPct,
  priceOrig,
  priceNow,
  currency,
  localeIntl,
  dict,
}) {
  const langs = Array.isArray(pkg.languages) && pkg.languages.length
    ? pkg.languages.join(", ")
    : "Spanish / English";

  if (hasPromo && typeof discountPct === "number") {
    return {
      title: tr(
        dict,
        "PackageDetail.dealTitle",
        `Limited-time deal: save ${discountPct}%`
      ).replace("{pct}", String(discountPct)),
      detail: tr(
        dict,
        "PackageDetail.dealDetail",
        `Now ${money(priceNow, currency, localeIntl)} (was ${money(
          priceOrig,
          currency,
          localeIntl
        )}). Daily departures, ${langs}.`
      )
        .replace("{now}", money(priceNow, currency, localeIntl))
        .replace("{was}", money(priceOrig, currency, localeIntl))
        .replace("{langs}", langs),
      tone: "deal",
    };
  }

  if (pkg.city && pkg.durationHours) {
    return {
      title: tr(
        dict,
        "PackageDetail.contextShort",
        `Great for a ${pkg.durationHours}h visit in ${pkg.city}`
      )
        .replace("{hours}", String(pkg.durationHours))
        .replace("{city}", String(pkg.city)),
      detail: tr(
        dict,
        "PackageDetail.contextDetail",
        `Available in ${langs}. Small groups • Local certified guides • Easy booking.`
      ).replace("{langs}", langs),
      tone: "info",
    };
  }

  return {
    title: tr(dict, "PackageDetail.popular", "Popular experience with great reviews"),
    detail: tr(
      dict,
      "PackageDetail.popularDetail",
      `Available in ${langs}. Flexible changes and 24/7 support.`
    ).replace("{langs}", langs),
    tone: "info",
  };
}

/* ---------- Page Component ---------- */
export default async function PackageDetail({ params }) {
  const locale = SUPPORTED.includes(params.locale) ? params.locale : DEFAULT_LOCALE;
  const localeIntl = LOCALE_TO_INTL[locale] || LOCALE_TO_INTL[DEFAULT_LOCALE];

  const dict = await loadMsgs(locale);
  const t = (key, fb) => tr(dict, `PackageDetail.${key}`, fb);

  const { slug } = params;
  const pkg = await fetchPackage(slug);
  if (!pkg) return notFound();

  const base = normalizeBase(SITE_URL);
  const canonical = base ? `${base}/${locale}/packages/${slug}` : "";
  const share = canonical ? buildShareLinks({ title: pkg.title, url: canonical }) : null;

  // Prices
  const currency = (pkg.currency || "PEN").toUpperCase();
  const hasPromo = !!pkg.isPromoActive && typeof pkg.effectivePrice === "number";
  const priceOrig = Number(pkg.price || 0);
  const priceNow = hasPromo ? Number(pkg.effectivePrice || priceOrig) : priceOrig;
  const discountPct =
    hasPromo && priceOrig > 0 ? Math.round((1 - priceNow / priceOrig) * 100) : null;

  const ctx = buildContextualMessage({
    pkg,
    hasPromo,
    discountPct,
    priceOrig,
    priceNow,
    currency,
    localeIntl,
    dict,
  });
  const related = await fetchRelated(pkg);

  const hasPoint =
    pkg?.location &&
    typeof pkg.location.lat === "number" &&
    typeof pkg.location.lng === "number";
  const mapsHref = hasPoint
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${pkg.location.lat},${pkg.location.lng}`
      )}`
    : null;

  // JSON-LD
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
      url: canonical,
    },
  };

  return (
    <main>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLD) }}
      />

      {/* Breadcrumbs */}
      <div className="border-b border-slate-100">
        <div className="container-default py-3 text-sm text-slate-600">
          <Link href={`/${locale}`} className="hover:underline">
            {tr(dict, "NavBar.home", "Home")}
          </Link>
          <span className="mx-1">/</span>
          <Link href={`/${locale}/packages`} className="hover:underline">
            {tr(dict, "NavBar.packages", "Packages")}
          </Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800">{pkg.title}</span>
        </div>
      </div>

      <section className="container-default py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ---------- Package Details ---------- */}
        <article className="lg:col-span-2 card overflow-hidden">
          {/* Media carousel */}
          <MediaCarousel
            media={(pkg.media || []).map((m) => ({
              ...m,
              alt: m.type === "image" ? pkg.title : undefined,
            }))}
            heightClass="h-[420px]"
            loop
          />

          <div className="card-body">
            <h1 className="text-2xl md:text-3xl font-bold">{pkg.title}</h1>

            {/* Context message */}
            <div
              className={`mt-3 rounded-lg border p-3 text-sm ${
                ctx.tone === "deal"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <p className="font-semibold">{ctx.title}</p>
              <p>{ctx.detail}</p>
              <div className="mt-2 flex gap-2">
                <a
                  href={whatsappHref(pkg.title, canonical)}
                  className="btn btn-ghost btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tr(dict, "PackageDetail.chat", "WhatsApp")}
                </a>
                <a href={`mailto:${EMAIL_SALES}`} className="btn btn-ghost btn-sm">
                  {tr(dict, "PackageDetail.email", "Email")}
                </a>
              </div>
            </div>

            {pkg.description && <p className="mt-4 text-slate-700">{pkg.description}</p>}

            {/* Facts */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Fact label={t("location", "Location")} value={pkg.city || "—"} />
              <Fact
                label={t("price", "Price")}
                value={
                  hasPromo ? (
                    <>
                      <span className="line-through text-slate-500 mr-2">
                        {money(priceOrig, currency, localeIntl)}
                      </span>
                      <span className="text-brand-700 font-semibold">
                        {money(priceNow, currency, localeIntl)}
                      </span>
                    </>
                  ) : (
                    <span className="text-brand-700 font-semibold">
                      {money(priceNow, currency, localeIntl)}
                    </span>
                  )
                }
              />
              <Fact
                label={t("duration", "Duration")}
                value={`${pkg.durationHours || 8} ${tr(dict, "PackageDetail.hours", "h")}`}
              />
              <Fact
                label={t("languages", "Languages")}
                value={
                  Array.isArray(pkg.languages) && pkg.languages.length
                    ? pkg.languages.join(", ")
                    : "Spanish / English"
                }
              />
              {mapsHref && (
                <Fact
                  label={t("location", "Location")}
                  value={
                    <a
                      href={mapsHref}
                      className="text-brand-700 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("openInMaps", "Open in Maps ↗")}
                    </a>
                  }
                />
              )}
            </div>

            {/* Includes / Excludes */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {pkg.includes?.length > 0 && (
                <FactList title={t("includes", "Includes")} items={pkg.includes} />
              )}
              {pkg.excludes?.length > 0 && (
                <FactList title={t("notIncludes", "Not included")} items={pkg.excludes} />
              )}
            </div>

            {/* Share */}
            {share && (
              <div className="mt-8 flex flex-wrap gap-3 text-sm">
                <span>{t("share", "Share")}:</span>
                <a
                  href={share.wa}
                  className="btn btn-ghost btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
                <a
                  href={share.fb}
                  className="btn btn-ghost btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </a>
                <a
                  href={share.tw}
                  className="btn btn-ghost btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twitter/X
                </a>
              </div>
            )}
          </div>
        </article>

        {/* ---------- Sidebar ---------- */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <BookingCard
              pkg={pkg}
              priceNow={priceNow}
              priceOrig={priceOrig}
              hasPromo={hasPromo}
              currency={currency}
              localeIntl={localeIntl}
              dict={dict}
            />
            <TrustBox dict={dict} />
            <HelpBox title={pkg.title} canonical={canonical} dict={dict} />
          </div>
        </aside>
      </section>

      {/* ---------- Related ---------- */}
      {related.length > 0 && (
        <section className="container-default pb-12">
          <h3 className="text-xl font-semibold mb-4">{t("related", "Related experiences")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((p) => {
              const img = mediaUrl(p.media?.[0]?.url) || "https://picsum.photos/600/400";
              const rHasPromo = !!p.isPromoActive && typeof p.effectivePrice === "number";
              const cur = (p.currency || "PEN").toUpperCase();
              const rPrice = money(rHasPromo ? p.effectivePrice : p.price, cur, localeIntl);
              return (
                <Link
                  key={p.slug}
                  href={`/${locale}/packages/${p.slug}`}
                  className="group card overflow-hidden"
                >
                  <img
                    src={img}
                    alt={p.title}
                    className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
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

/* ---------- Small Reusable Components ---------- */
function Fact({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function FactList({ title, items }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="font-semibold mb-2">{title}</p>
      <ul className="list-disc pl-5 text-slate-700 space-y-1">
        {items.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>
    </div>
  );
}

function BookingCard({ pkg, priceNow, priceOrig, hasPromo, currency, localeIntl, dict }) {
  const t = (k, fb) => tr(dict, `PackageDetail.${k}`, fb);
  return (
    <div id="book" className="card">
      <div className="card-body">
        <div className="flex justify-between">
          <p className="text-lg font-semibold">{t("bookNow", "Reserve now")}</p>
          <span className="text-brand-700 font-semibold">
            {hasPromo ? (
              <>
                <span className="line-through text-slate-500 mr-2">
                  {money(priceOrig, currency, localeIntl)}
                </span>
                {money(priceNow, currency, localeIntl)}
              </>
            ) : (
              money(priceNow, currency, localeIntl)
            )}
          </span>
        </div>
        <p className="text-xs text-slate-500 -mt-1">
          {t("fastConfirmation", "Fast confirmation and 24/7 support.")}
        </p>
        <div className="mt-4">
          <BookingForm pkg={pkg} />
        </div>
      </div>
    </div>
  );
}

function TrustBox({ dict }) {
  const t = (k, fb) => tr(dict, `PackageDetail.${k}`, fb);
  return (
    <div className="card">
      <div className="card-body space-y-2 text-sm text-slate-700">
        <p className="font-semibold">{t("whyBook", "Why book with us?")}</p>
        <ul className="space-y-1">
          <li>✓ {t("trust1", "Certified local operators")}</li>
          <li>✓ {t("trust2", "24/7 multilingual support")}</li>
          <li>✓ {t("trust3", "Flexible date changes")}</li>
          <li>✓ {t("trust4", "Secure payments")}</li>
        </ul>
      </div>
    </div>
  );
}

function HelpBox({ title, canonical, dict }) {
  const t = (k, fb) => tr(dict, `PackageDetail.${k}`, fb);
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="font-medium">{t("questions", "Questions?")}</p>
      <p className="text-slate-600 mt-1">
        {t("helpText", "Message us on WhatsApp or email — we’ll help you plan your trip.")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={whatsappHref(title, canonical)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
        >
          {t("chat", "Chat on WhatsApp")}
        </a>
        <a href={`mailto:${EMAIL_SALES}`} className="btn btn-ghost btn-sm">
          {t("email", "Email")}
        </a>
      </div>
    </div>
  );
}
