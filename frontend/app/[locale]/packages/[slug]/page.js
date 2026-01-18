// frontend/app/packages/[slug]/page.js
/* eslint-disable @next/next/no-img-element */

import BookingForm from "@/app/components/BookingForm";
import { notFound } from "next/navigation";
import { mediaUrl } from "@/app/lib/media";
import Link from "next/link";
import { API_BASE, SITE_URL } from "@/app/lib/config";
import MediaCarousel from "@/app/components/MediaCarousel";
import {
  MapPin,
  Clock,
  Globe,
  CheckCircle,
  XCircle,
  MessageCircle,
  Mail,
  ArrowLeft,
  Star,
  Users,
  Shield,
  Calendar,
  ChevronRight,
  Info,
  Tag
} from 'lucide-react';

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
// FORZAR formato consistente usando siempre 'en-US' para evitar diferencias
const money = (v, curr = "PEN") => {
  const value = Number(v || 0);
  const currency = (curr || "PEN").toUpperCase();
  
  // Siempre usar 'en-US' para consistencia entre servidor y cliente
  const formatter = new Intl.NumberFormat('en-US', {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
};

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
        `Now ${money(priceNow, currency)} (was ${money(
          priceOrig,
          currency
        )}). Daily departures, ${langs}.`
      )
        .replace("{now}", money(priceNow, currency))
        .replace("{was}", money(priceOrig, currency))
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

/* ---------- Small Reusable Components ---------- */
function FactCard({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all duration-300 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5 border border-slate-200">
          <Icon className="w-5 h-5 text-[#0086C0]" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-1" style={{ fontFamily: "'Bree Serif', serif" }}>
            {label}
          </div>
          <div className="font-bold text-[#0E374A] text-sm" style={{ fontFamily: "'Bree Serif', serif" }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function FactList({ title, items, type = "includes" }) {
  const Icon = type === "includes" ? CheckCircle : XCircle;
  const iconColor = type === "includes" ? "#A3B117" : "#64748B";
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-all duration-300">
      <h3 className="font-bold text-[#0E374A] mb-4 flex items-center gap-2" style={{ fontFamily: "'Bree Serif', serif" }}>
        <div className="p-1 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5">
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-slate-700">
            <div className="mt-0.5 flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white to-slate-50 border border-slate-200 flex items-center justify-center">
                <Icon className="w-3 h-3" style={{ color: iconColor }} />
              </div>
            </div>
            <span className="text-sm" style={{ fontFamily: "'Bree Serif', serif" }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookingCard({ pkg, priceNow, priceOrig, hasPromo, currency, dict }) {
  const t = (k, fb) => tr(dict, `PackageDetail.${k}`, fb);
  
  // Precios formateados
  const formattedPriceNow = money(priceNow, currency);
  const formattedPriceOrig = money(priceOrig, currency);
  
  return (
    <div id="book" className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-bold text-[#0E374A]" style={{ fontFamily: "'Bree Serif', serif" }}>
              {t("bookNow", "Reserve now")}
            </div>
            <div className="text-right">
              {hasPromo ? (
                <>
                  <div className="text-lg font-bold text-[#0086C0]" style={{ fontFamily: "'Bree Serif', serif" }}>
                    {formattedPriceNow}
                  </div>
                  <div className="text-xs text-slate-500 line-through">
                    {formattedPriceOrig}
                  </div>
                </>
              ) : (
                <div className="text-lg font-bold text-[#0086C0]" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {formattedPriceNow}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500" style={{ fontFamily: "'Bree Serif', serif" }}>
            {t("fastConfirmation", "Fast confirmation and 24/7 support.")}
          </div>
        </div>
        <div className="mt-4">
          {/* Pasa los precios formateados al BookingForm */}
          <BookingForm 
            pkg={pkg} 
            formattedPriceNow={formattedPriceNow}
            formattedPriceOrig={formattedPriceOrig}
            hasPromo={hasPromo}
          />
        </div>
      </div>
    </div>
  );
}

function TrustBox({ dict }) {
  const t = (k, fb) => tr(dict, `PackageDetail.${k}`, fb);
  
  return (
    <div className="bg-gradient-to-br from-[#0086C0]/5 to-[#0E374A]/5 rounded-2xl border border-[#0086C0]/20 p-6">
      <div className="font-bold text-[#0E374A] mb-4 flex items-center gap-2" style={{ fontFamily: "'Bree Serif', serif" }}>
        <Shield className="w-5 h-5 text-[#0086C0]" />
        {t("whyBook", "Why book with us?")}
      </div>
      <ul className="space-y-3">
        {[
          t("trust1", "Certified local operators"),
          t("trust2", "24/7 multilingual support"),
          t("trust3", "Flexible date changes"),
          t("trust4", "Secure payments")
        ].map((item, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#A3B117]/20 to-[#0086C0]/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-3 h-3 text-[#A3B117]" />
            </div>
            <span style={{ fontFamily: "'Bree Serif', serif" }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HelpBox({ title, canonical, dict }) {
  const t = (k, fb) => tr(dict, `PackageDetail.${k}`, fb);
  
  return (
    <div className="bg-gradient-to-br from-[#A3B117]/5 to-[#0086C0]/5 rounded-2xl border border-[#A3B117]/20 p-6">
      <div className="font-bold text-[#0E374A] mb-2 flex items-center gap-2" style={{ fontFamily: "'Bree Serif', serif" }}>
        <MessageCircle className="w-5 h-5 text-[#A3B117]" />
        {t("questions", "Questions?")}
      </div>
      <div className="text-sm text-slate-600 mb-4" style={{ fontFamily: "'Bree Serif', serif" }}>
        {t("helpText", "Message us on WhatsApp or email — we'll help you plan your trip.")}
      </div>
      <div className="flex flex-col gap-3">
        <a
          href={whatsappHref(title, canonical)}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white rounded-xl border border-slate-200 p-3 hover:border-[#A3B117] hover:shadow-md transition-all duration-300 flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#A3B117]/10 to-[#0086C0]/5">
            <MessageCircle className="w-5 h-5 text-[#A3B117]" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-[#0E374A]" style={{ fontFamily: "'Bree Serif', serif" }}>
              {t("chat", "Chat on WhatsApp")}
            </div>
            <div className="text-xs text-slate-500" style={{ fontFamily: "'Bree Serif', serif" }}>
              Quick response • 24/7
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#A3B117] group-hover:translate-x-1 transition-all" />
        </a>
        <a
          href={`mailto:${EMAIL_SALES}`}
          className="group bg-white rounded-xl border border-slate-200 p-3 hover:border-[#0086C0] hover:shadow-md transition-all duration-300 flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5">
            <Mail className="w-5 h-5 text-[#0086C0]" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-[#0E374A]" style={{ fontFamily: "'Bree Serif', serif" }}>
              {t("email", "Email us")}
            </div>
            <div className="text-xs text-slate-500" style={{ fontFamily: "'Bree Serif', serif" }}>
              Detailed inquiries • Attachments
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0086C0] group-hover:translate-x-1 transition-all" />
        </a>
      </div>
    </div>
  );
}

/* ---------- Page Component ---------- */
export default async function PackageDetail({ params }) {
  const locale = SUPPORTED.includes(params.locale) ? params.locale : DEFAULT_LOCALE;

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
    <main className="min-h-screen bg-gradient-to-b from-white via-[#F8FAFC] to-white">
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLD) }}
      />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600" style={{ fontFamily: "'Bree Serif', serif" }}>
            <Link 
              href={`/${locale}`} 
              className="hover:text-[#A3B117] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              {tr(dict, "NavBar.home", "Home")}
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <Link 
              href={`/${locale}/packages`} 
              className="hover:text-[#A3B117] transition-colors"
            >
              {tr(dict, "NavBar.packages", "Packages")}
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <div className="text-[#0E374A] font-semibold truncate">{pkg.title}</div>
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ---------- Package Details ---------- */}
        <article className="lg:col-span-2">
          {/* Media carousel */}
          <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-slate-200 mb-6">
            <MediaCarousel
              media={(pkg.media || []).map((m) => ({
                ...m,
                alt: m.type === "image" ? pkg.title : undefined,
              }))}
              heightClass="h-[420px]"
              loop
            />
          </div>

          {/* Package Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-[#0086C0]/10 to-[#0E374A]/10 rounded-full text-xs font-bold text-[#0086C0]" style={{ fontFamily: "'Bree Serif', serif" }}>
                    {pkg.category || t("category", "Adventure")}
                  </span>
                  {hasPromo && discountPct && (
                    <span className="px-3 py-1 bg-red-600 rounded-full text-xs font-bold text-white border border-amber-200 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      -{discountPct}% OFF
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-[#0E374A] leading-tight" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {pkg.title}
                </h1>
              </div>
            </div>

            {/* Context message - Versión más sutil para ofertas */}
            {hasPromo && discountPct ? (
              <div className="rounded-2xl mb-6 border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100">
                        <Tag className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-bold text-amber-700 text-sm" style={{ fontFamily: "'Bree Serif', serif" }}>
                          {tr(dict, "PackageDetail.dealTitle", `Limited-time deal: save ${discountPct}%`).replace("{pct}", String(discountPct))}
                        </div>
                        <div className="text-slate-600 text-xs mt-1">
                          Now {money(priceNow, currency)} (was {money(priceOrig, currency)}). Daily departures, {Array.isArray(pkg.languages) && pkg.languages.length ? pkg.languages.join(", ") : "Spanish / English"}.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-slate-500 text-sm line-through">
                        {money(priceOrig, currency)}
                      </div>
                      <div className="font-bold text-lg text-[#0086C0]">
                        {money(priceNow, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-5 mb-6 bg-gradient-to-r from-blue-50 to-slate-50 border border-slate-200">
                <div className="font-bold text-[#0E374A] mb-2 flex items-center gap-2" style={{ fontFamily: "'Bree Serif', serif" }}>
                  <div className="p-1 rounded-lg bg-gradient-to-br from-[#0086C0]/20 to-[#0E374A]/10">
                    <Info className="w-4 h-4 text-[#0086C0]" />
                  </div>
                  {ctx.title}
                </div>
                <div className="text-slate-700 text-sm" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {ctx.detail}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {pkg.description && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[#0E374A] mb-4 flex items-center gap-2" style={{ fontFamily: "'Bree Serif', serif" }}>
                <div className="p-1 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5">
                  <Calendar className="w-5 h-5 text-[#0086C0]" />
                </div>
                {t("overview", "Overview")}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="text-slate-700 leading-relaxed whitespace-pre-line" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {pkg.description}
                </div>
              </div>
            </div>
          )}

          {/* Key Facts Grid */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#0E374A] mb-4" style={{ fontFamily: "'Bree Serif', serif" }}>
              {t("keyDetails", "Key Details")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FactCard 
                icon={MapPin} 
                label={t("location", "Location")} 
                value={pkg.city || "—"}
              />
              <FactCard 
                icon={Clock} 
                label={t("duration", "Duration")} 
                value={`${pkg.durationHours || 8}h`}
              />
              <FactCard 
                icon={Users} 
                label={t("groupSize", "Group Size")} 
                value={pkg.groupSize || "Small groups"}
              />
              <FactCard 
                icon={Globe} 
                label={t("languages", "Languages")} 
                value={
                  Array.isArray(pkg.languages) && pkg.languages.length
                    ? pkg.languages.slice(0, 2).join(", ")
                    : "ES/EN"
                }
              />
            </div>
          </div>

          {/* Includes & Excludes */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#0E374A] mb-4" style={{ fontFamily: "'Bree Serif', serif" }}>
              {t("whatsIncluded", "What's Included")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pkg.includes?.length > 0 && (
                <FactList 
                  title={t("includes", "Includes")} 
                  items={pkg.includes}
                  type="includes"
                />
              )}
              {pkg.excludes?.length > 0 && (
                <FactList 
                  title={t("notIncludes", "Not included")} 
                  items={pkg.excludes}
                  type="excludes"
                />
              )}
            </div>
          </div>

          {/* Share & Map */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
            {share && (
              <div className="flex items-center gap-3">
                <div className="text-slate-700 font-medium" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {t("share", "Share")}:
                </div>
                <div className="flex gap-2">
                  <a
                    href={share.wa}
                    className="p-2 rounded-full bg-gradient-to-br from-[#A3B117]/10 to-[#0086C0]/5 border border-slate-200 hover:border-[#A3B117] hover:shadow-md transition-all duration-300"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-slate-600" />
                  </a>
                  <a
                    href={share.fb}
                    className="p-2 rounded-full bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5 border border-slate-200 hover:border-[#0086C0] hover:shadow-md transition-all duration-300"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook"
                  >
                    <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                </div>
              </div>
            )}
            
            {mapsHref && (
              <a
                href={mapsHref}
                className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0086C0] to-[#0E374A] text-white rounded-full font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="w-4 h-4" />
                <span style={{ fontFamily: "'Bree Serif', serif" }}>
                  {t("openInMaps", "Open in Maps")}
                </span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            )}
          </div>
        </article>

        {/* ---------- Sidebar ---------- */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <BookingCard
              pkg={pkg}
              priceNow={priceNow}
              priceOrig={priceOrig}
              hasPromo={hasPromo}
              currency={currency}
              dict={dict}
            />
            <TrustBox dict={dict} />
            <HelpBox title={pkg.title} canonical={canonical} dict={dict} />
          </div>
        </aside>
      </section>

      {/* ---------- Related Experiences ---------- */}
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="border-t border-slate-200 pt-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#0E374A]" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {t("related", "Related experiences")}
                </h2>
                <div className="text-slate-600 mt-1" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {t("moreOptions", "You might also like these options")}
                </div>
              </div>
              <Link 
                href={`/${locale}/packages`}
                className="group flex items-center gap-2 text-[#0086C0] hover:text-[#0E374A] transition-colors font-bold"
                style={{ fontFamily: "'Bree Serif', serif" }}
              >
                {t("viewAll", "View all")}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((p) => {
                const img = mediaUrl(p.media?.[0]?.url) || "https://picsum.photos/600/400";
                const rHasPromo = !!p.isPromoActive && typeof p.effectivePrice === "number";
                const cur = (p.currency || "PEN").toUpperCase();
                const rPrice = money(rHasPromo ? p.effectivePrice : p.price, cur);
                
                return (
                  <Link
                    key={p.slug}
                    href={`/${locale}/packages/${p.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={img}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      {p.city && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                          <div className="text-xs text-white flex items-center gap-1" style={{ fontFamily: "'Bree Serif', serif" }}>
                            <MapPin className="w-3 h-3" />
                            {p.city}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="font-bold text-[#0E374A] line-clamp-2 mb-2 group-hover:text-[#0086C0] transition-colors" style={{ fontFamily: "'Bree Serif', serif" }}>
                        {p.title}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0086C0]" style={{ fontFamily: "'Bree Serif', serif" }}>
                          {rPrice}
                        </span>
                        <div className="text-xs text-slate-500 flex items-center gap-1" style={{ fontFamily: "'Bree Serif', serif" }}>
                          <Clock className="w-3 h-3" />
                          {p.durationHours || 8}h
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}