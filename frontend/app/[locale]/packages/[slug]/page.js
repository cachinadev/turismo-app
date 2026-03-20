// frontend/app/[locale]/packages/[slug]/page.js
import BookingForm from "@/app/components/BookingForm";
import { notFound } from "next/navigation";
import { mediaUrl } from "@/app/lib/media";
import Link from "next/link";
import Image from "next/image";
import {
  API_BASE,
  SITE_URL,
  CONTACT_PHONE,
  WHATSAPP_NUMBER,
} from "@/app/lib/config";
import MediaCarousel from "@/app/components/MediaCarousel";
import ShareButtonsClient from "./ShareButtonsClient";
import HelpBoxClient from "./HelpBoxClient";
import {
  MapPin,
  Clock,
  Globe,
  CheckCircle,
  XCircle,
  MessageCircle,
  Mail,
  ArrowLeft,
  Users,
  Shield,
  Calendar,
  ChevronRight,
  Info,
  Tag,
  Route,
  Backpack,
  Sparkles,
  Navigation,
  AlertTriangle,
} from "lucide-react";

/* -------------------------------------------------------
 * 🧊 Disable caching so locale strings always match UI
 * ------------------------------------------------------- */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- Branding & Contact ---------- */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
// keep compatible with both env naming styles you used previously
const EMAIL_SALES =
  process.env.NEXT_PUBLIC_EMAIL_SALES ||
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
  "contact@vicuadvent.com";
const WA_NUMBER =
  (String(WHATSAPP_NUMBER || CONTACT_PHONE).match(/\d+/g) || []).join("") ||
  "51953858267";

/* ---------- i18n helpers ---------- */
const SUPPORTED = ["es", "en", "fr", "pt", "ru"];
const DEFAULT_LOCALE = "es";

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
// Force consistent format using 'en-US' to avoid server/client locale differences
const money = (v, curr = "PEN") => {
  const value = Number(v || 0);
  const currency = (curr || "PEN").toUpperCase();
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

const normalizeBase = (u = "") => String(u || "").replace(/\/+$/, "");

const whatsappHref = (title, url) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Hi! I'm interested in "${title}". ${url || ""}`
  )}`;

const parseLines = (v) =>
  Array.from(
    new Set(String(v || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean))
  );

const normalizeStringArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);
  return parseLines(v);
};

const safeText = (v, max = 200) =>
  String(v || "").replace(/\s+/g, " ").trim().slice(0, max);

// ✅ FIX for your runtime error
const nonEmpty = (v) => {
  if (v === null || v === undefined) return false;
  return String(v).trim().length > 0;
};

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

    // Normalize newer fields coming from the updated backend/schema
    const itinerary = Array.isArray(json?.itinerary) ? json.itinerary : [];
    const whatToBring = normalizeStringArray(json?.whatToBring);
    const recommendations = normalizeStringArray(json?.recommendations);

    const startTimes = Array.isArray(json?.startTimes)
      ? json.startTimes
      : typeof json?.startTimes === "string"
      ? json.startTimes.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const availableDays = Array.isArray(json?.availableDays)
      ? json.availableDays
      : typeof json?.availableDays === "string"
      ? json.availableDays.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    return {
      ...json,
      media,
      itinerary,
      whatToBring,
      recommendations,
      startTimes,
      availableDays,
    };
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

  const city = safeText(pkg.city, 60);
  const category = safeText(pkg.category, 60);
  const titleBits = [pkg.title, city, category].filter(Boolean);
  const title = `${titleBits.join(" · ")} | ${BRAND_NAME}`;
  const description =
    (pkg.description || "").replace(/\s+/g, " ").slice(0, 155) ||
    `Book ${pkg.title} in ${city || "Peru"} with local operators, secure checkout and 24/7 support.`;
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
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
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
function buildContextualMessage({ pkg, hasPromo, discountPct, priceOrig, priceNow, currency, dict }) {
  const langs =
    Array.isArray(pkg.languages) && pkg.languages.length
      ? pkg.languages.join(", ")
      : "Spanish / English";

  if (hasPromo && typeof discountPct === "number") {
    return {
      title: tr(dict, "PackageDetail.dealTitle", `Limited-time deal: save ${discountPct}%`).replace(
        "{pct}",
        String(discountPct)
      ),
      detail: tr(
        dict,
        "PackageDetail.dealDetail",
        `Now ${money(priceNow, currency)} (was ${money(priceOrig, currency)}). Daily departures, ${langs}.`
      )
        .replace("{now}", money(priceNow, currency))
        .replace("{was}", money(priceOrig, currency))
        .replace("{langs}", langs),
      tone: "deal",
    };
  }

  if (pkg.city && pkg.durationHours) {
    return {
      title: tr(dict, "PackageDetail.contextShort", `Great for a ${pkg.durationHours}h visit in ${pkg.city}`)
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
    <div
      className={`bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all duration-300 ${className}`}
    >
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
      <h3
        className="font-bold text-[#0E374A] mb-4 flex items-center gap-2"
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
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
            <span className="text-sm" style={{ fontFamily: "'Bree Serif', serif" }}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chips({ icon: Icon, label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-all duration-300">
      <h3
        className="font-bold text-[#0E374A] mb-4 flex items-center gap-2"
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
        <div className="p-1 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5">
          <Icon className="w-5 h-5 text-[#0086C0]" />
        </div>
        {label}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 30).map((x, i) => (
          <span
            key={`${x}-${i}`}
            className="px-3 py-1 rounded-full text-xs font-bold bg-slate-50 border border-slate-200 text-[#0E374A]"
            style={{ fontFamily: "'Bree Serif', serif" }}
          >
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

function Itinerary({ dict, itinerary = [], mapsUrl }) {
  const t = (k, fb) => tr(dict, `PackageDetail.${k}`, fb);
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3
          className="font-bold text-[#0E374A] flex items-center gap-2"
          style={{ fontFamily: "'Bree Serif', serif" }}
        >
          <div className="p-1 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5">
            <Route className="w-5 h-5 text-[#0086C0]" />
          </div>
          {t("itinerary", "Itinerary")}
        </h3>

        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#0086C0] hover:text-[#0E374A] underline flex items-center gap-1"
            style={{ fontFamily: "'Bree Serif', serif" }}
          >
            <Navigation className="w-4 h-4" />
            {t("viewRoute", "View route")}
          </a>
        ) : null}
      </div>

      <ol className="space-y-4">
        {itinerary.slice(0, 40).map((s, idx) => {
          const time = safeText(s?.time, 20);
          const title = safeText(s?.title, 140);
          const details = String(s?.details || "").trim();
          const loc = safeText(s?.location, 180);
          const stepMaps = nonEmpty(s?.mapsUrl) ? String(s.mapsUrl) : "";
          const durationMin =
            Number.isFinite(Number(s?.durationMin)) && Number(s.durationMin) > 0
              ? Number(s.durationMin)
              : null;
          const durationHours =
            Number.isFinite(Number(s?.durationHours)) && Number(s.durationHours) >= 0
              ? Number(s.durationHours)
              : null;
          const durationMinutes =
            Number.isFinite(Number(s?.durationMinutes)) && Number(s.durationMinutes) >= 0
              ? Number(s.durationMinutes)
              : null;
          const dayValue =
            Number.isFinite(Number(s?.day)) && Number(s.day) > 0 ? Number(s.day) : null;
          const stepTransport = safeText(s?.transport, 200);
          const guideLanguages =
            Array.isArray(s?.guideLanguages) && s.guideLanguages.length
              ? s.guideLanguages.map((l) => String(l || "").trim()).filter(Boolean)
              : typeof s?.guideLanguages === "string" && s.guideLanguages.trim()
              ? s.guideLanguages.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)
              : [];
          const guideNotes = safeText(s?.guideNotes, 400);
          const durationParts = [
            durationHours ? `${durationHours}h` : null,
            durationMinutes ? `${durationMinutes}m` : null,
          ].filter(Boolean);

          return (
            <li key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5 border border-slate-200 flex items-center justify-center text-xs font-black text-[#0086C0]">
                  {idx + 1}
                </div>
                {idx !== itinerary.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-2" />}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {dayValue ? (
                    <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                      {t("day", "Day")} {dayValue}
                    </span>
                  ) : null}
                  {time ? (
                    <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                      {time}
                    </span>
                  ) : null}
                  {durationParts.map((part) => (
                    <span
                      key={part}
                      className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full"
                    >
                      {part}
                    </span>
                  ))}
                  {durationMin ? (
                    <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                      {durationMin} min
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 font-bold text-[#0E374A]" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {title || t("stop", "Stop")}
                </div>

                {(loc || stepMaps) && (
                  <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-2">
                    {loc ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {loc}
                      </span>
                    ) : null}
                    {stepMaps ? (
                      <a
                        href={stepMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#0086C0] hover:text-[#0E374A] underline font-bold"
                      >
                        <Navigation className="w-3 h-3" />
                        {t("open", "Open")}
                      </a>
                    ) : null}
                  </div>
                )}
                {(stepTransport || guideLanguages.length) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                    {stepTransport ? (
                      <span className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50">
                        🚐 {stepTransport}
                      </span>
                    ) : null}
                    {guideLanguages.length ? (
                      <span className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50">
                        🎙️ {guideLanguages.join(', ')}
                      </span>
                    ) : null}
                  </div>
                )}
                {guideNotes ? (
                  <p className="mt-2 text-sm text-slate-500">{guideNotes}</p>
                ) : null}

                {details ? (
                  <div
                    className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                    style={{ fontFamily: "'Bree Serif', serif" }}
                  >
                    {details}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function BookingCard({ pkg, priceNow, priceOrig, hasPromo, currency, dict }) {
  const t = (k, fb) => tr(dict, `PackageDetail.${k}`, fb);

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
                  <div className="text-xs text-slate-500 line-through">{formattedPriceOrig}</div>
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
          t("trust4", "Secure payments"),
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
          onClick={() =>
            trackEvent("cta_whatsapp_click", {
              source: "package_help_box",
              packageSlug: canonical?.split("/").pop() || "",
            })
          }
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#A3B117]/10 to-[#0086C0]/5">
            <MessageCircle className="w-5 h-5 text-[#A3B117]" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-[#0E374A]" style={{ fontFamily: "'Bree Serif', serif" }}>
              {t("chat", "Chat on WhatsApp")}
            </div>
            <div className="text-xs text-slate-500" style={{ fontFamily: "'Bree Serif', serif" }}>
              {t("quickResponse", "Quick response • 24/7")}
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
              {t("emailDetail", "Detailed inquiries • Attachments")}
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
  const discountPct = hasPromo && priceOrig > 0 ? Math.round((1 - priceNow / priceOrig) * 100) : null;

  const ctx = buildContextualMessage({ pkg, hasPromo, discountPct, priceOrig, priceNow, currency, dict });
  const related = await fetchRelated(pkg);

  // Map links:
  // 1) Prefer pkg.mapsUrl from backend (admin form field)
  // 2) Otherwise fallback to coordinates
  const hasPoint = pkg?.location && typeof pkg.location.lat === "number" && typeof pkg.location.lng === "number";

  const mapsHref =
    (typeof pkg.mapsUrl === "string" && pkg.mapsUrl.startsWith("http") && pkg.mapsUrl) ||
    (hasPoint
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${pkg.location.lat},${pkg.location.lng}`
        )}`
      : null);

  // JSON-LD (Product + optional Tour/Trip-ish fields)
  const productLD = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.title,
    description: pkg.description,
    ...(pkg.media?.length ? { image: pkg.media.filter((m) => m.type === "image").map((m) => m.url) } : {}),
    brand: { "@type": "Brand", name: BRAND_NAME },
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: String(priceNow || 0),
      availability: "https://schema.org/InStock",
      url: canonical,
    },
  };
  const breadcrumbLD = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("NavBar.home", "Home"), item: `${base}/${locale}` },
      { "@type": "ListItem", position: 2, name: t("NavBar.packages", "Packages"), item: `${base}/${locale}/packages` },
      { "@type": "ListItem", position: 3, name: pkg.title, item: canonical },
    ],
  };
  const tripLD = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: pkg.title,
    description: pkg.description || "",
    ...(pkg.city ? { touristType: pkg.city } : {}),
    ...(canonical ? { url: canonical } : {}),
    ...(pkg.media?.length ? { image: pkg.media.filter((m) => m.type === "image").map((m) => m.url) } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: String(priceNow || 0),
      availability: "https://schema.org/InStock",
      url: canonical,
    },
  };

  // Nice “quick facts” from new fields
  const difficulty = pkg.difficulty || "";
  const ageMin = Number.isFinite(Number(pkg.ageMin)) ? Number(pkg.ageMin) : null;
  const minPeople = Number.isFinite(Number(pkg.minPeople)) ? Number(pkg.minPeople) : null;
  const maxPeople = Number.isFinite(Number(pkg.maxPeople)) ? Number(pkg.maxPeople) : null;

  const groupSizeHuman =
    minPeople && maxPeople
      ? `${minPeople}–${maxPeople}`
      : maxPeople
      ? `Up to ${maxPeople}`
      : minPeople
      ? `Min ${minPeople}`
      : t("smallGroups", "Small groups");

  const startTimes = Array.isArray(pkg.startTimes) ? pkg.startTimes : [];
  const availableDays = Array.isArray(pkg.availableDays) ? pkg.availableDays : [];

  const includes = Array.isArray(pkg.includes) ? pkg.includes : [];
  const excludes = Array.isArray(pkg.excludes) ? pkg.excludes : [];
  const whatToBring = Array.isArray(pkg.whatToBring) ? pkg.whatToBring : [];
  const recommendations = Array.isArray(pkg.recommendations) ? pkg.recommendations : [];
  const itinerary = Array.isArray(pkg.itinerary) ? pkg.itinerary : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#F8FAFC] to-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tripLD) }} />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div
            className="flex items-center gap-2 text-sm text-slate-600"
            style={{ fontFamily: "'Bree Serif', serif" }}
          >
            <Link href={`/${locale}`} className="hover:text-[#A3B117] transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              {tr(dict, "NavBar.home", "Home")}
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <Link href={`/${locale}/packages`} className="hover:text-[#A3B117] transition-colors">
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

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className="px-3 py-1 bg-gradient-to-r from-[#0086C0]/10 to-[#0E374A]/10 rounded-full text-xs font-bold text-[#0086C0]"
                    style={{ fontFamily: "'Bree Serif', serif" }}
                  >
                    {pkg.category || t("category", "Adventure")}
                  </span>

                  {difficulty ? (
                    <span
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700"
                      style={{ fontFamily: "'Bree Serif', serif" }}
                    >
                      {t("difficulty", "Difficulty")}: {difficulty}
                    </span>
                  ) : null}

                  {hasPromo && discountPct ? (
                    <span className="px-3 py-1 bg-red-600 rounded-full text-xs font-bold text-white border border-amber-200 flex items-center gap-1">
                      <Tag className="w-3 h-3" />-{discountPct}% OFF
                    </span>
                  ) : null}
                </div>

                <h1
                  className="text-3xl md:text-4xl font-black text-[#0E374A] leading-tight"
                  style={{ fontFamily: "'Bree Serif', serif" }}
                >
                  {pkg.title}
                </h1>

                {pkg.city || pkg.country ? (
                  <div
                    className="mt-2 text-sm text-slate-600 flex flex-wrap items-center gap-2"
                    style={{ fontFamily: "'Bree Serif', serif" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      {[pkg.city, pkg.country].filter(Boolean).join(", ")}
                    </span>
                    {mapsHref ? (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#0086C0] hover:text-[#0E374A] underline font-bold"
                      >
                        <Navigation className="w-4 h-4" />
                        {t("openInMaps", "Open in Maps")}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Context message */}
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
                          {tr(dict, "PackageDetail.dealTitle", `Limited-time deal: save ${discountPct}%`).replace(
                            "{pct}",
                            String(discountPct)
                          )}
                        </div>
                        <div className="text-slate-600 text-xs mt-1">
                          Now {money(priceNow, currency)} (was {money(priceOrig, currency)}).{" "}
                          {startTimes?.length
                            ? `Start times: ${startTimes.slice(0, 3).join(", ")}.`
                            : "Daily departures."}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-slate-500 text-sm line-through">{money(priceOrig, currency)}</div>
                      <div className="font-bold text-lg text-[#0086C0]">{money(priceNow, currency)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-5 mb-6 bg-gradient-to-r from-blue-50 to-slate-50 border border-slate-200">
                <div
                  className="font-bold text-[#0E374A] mb-2 flex items-center gap-2"
                  style={{ fontFamily: "'Bree Serif', serif" }}
                >
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

          {/* Key Facts Grid */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#0E374A] mb-4" style={{ fontFamily: "'Bree Serif', serif" }}>
              {t("keyDetails", "Key Details")}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FactCard icon={Clock} label={t("duration", "Duration")} value={`${pkg.durationHours || 8}h`} />
              <FactCard icon={Users} label={t("groupSize", "Group size")} value={groupSizeHuman} />
              <FactCard
                icon={Globe}
                label={t("languages", "Languages")}
                value={
                  Array.isArray(pkg.languages) && pkg.languages.length ? pkg.languages.slice(0, 3).join(", ") : "ES/EN"
                }
              />
              <FactCard
                icon={Calendar}
                label={t("availability", "Availability")}
                value={
                  availableDays.length
                    ? availableDays.slice(0, 3).join(", ") + (availableDays.length > 3 ? "…" : "")
                    : t("askDates", "Ask for dates")
                }
              />
            </div>

            {(ageMin || difficulty || startTimes.length) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {ageMin ? <FactCard icon={AlertTriangle} label={t("minAge", "Minimum age")} value={`${ageMin}+`} /> : null}
                {difficulty ? <FactCard icon={Sparkles} label={t("difficulty", "Difficulty")} value={difficulty} /> : null}
                {startTimes.length ? (
                  <FactCard icon={Calendar} label={t("startTimes", "Start times")} value={startTimes.slice(0, 2).join(" • ")} />
                ) : null}
              </div>
            )}
          </div>

          {/* Overview / Description */}
          {pkg.description ? (
            <div className="mb-8">
              <h2
                className="text-xl font-bold text-[#0E374A] mb-4 flex items-center gap-2"
                style={{ fontFamily: "'Bree Serif', serif" }}
              >
                <div className="p-1 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5">
                  <Info className="w-5 h-5 text-[#0086C0]" />
                </div>
                {t("overview", "Overview")}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="text-slate-700 leading-relaxed whitespace-pre-line" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {pkg.description}
                </div>
              </div>
            </div>
          ) : null}

          {/* Itinerary */}
          <div className="mb-8">
            <Itinerary dict={dict} itinerary={itinerary} mapsUrl={mapsHref} />
          </div>

          {/* Includes / Excludes */}
          {(includes.length || excludes.length) ? (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[#0E374A] mb-4" style={{ fontFamily: "'Bree Serif', serif" }}>
                {t("whatsIncluded", "What's Included")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {includes.length ? <FactList title={t("includes", "Includes")} items={includes} type="includes" /> : null}
                {excludes.length ? <FactList title={t("notIncludes", "Not included")} items={excludes} type="excludes" /> : null}
              </div>
            </div>
          ) : null}

          {/* What to bring + Recommendations */}
          {(whatToBring.length || recommendations.length) ? (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Chips icon={Backpack} label={t("whatToBring", "What to bring")} items={whatToBring} />
              <Chips icon={Sparkles} label={t("recommendations", "Recommendations")} items={recommendations} />
            </div>
          ) : null}

          {/* Meeting / Dropoff points */}
          {(pkg.meetingPoint || pkg.dropoffPoint) ? (
            <div className="mb-8">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-all duration-300">
                <h3
                  className="font-bold text-[#0E374A] mb-4 flex items-center gap-2"
                  style={{ fontFamily: "'Bree Serif', serif" }}
                >
                  <div className="p-1 rounded-lg bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/5">
                    <MapPin className="w-5 h-5 text-[#0086C0]" />
                  </div>
                  {t("meetingInfo", "Meeting & drop-off")}
                </h3>
                <div className="text-sm text-slate-700 space-y-2" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {pkg.meetingPoint ? (
                    <div>
                      <span className="font-bold text-slate-900">{t("meetingPoint", "Meeting point")}:</span>{" "}
                      {pkg.meetingPoint}
                    </div>
                  ) : null}
                  {pkg.dropoffPoint ? (
                    <div>
                      <span className="font-bold text-slate-900">{t("dropoffPoint", "Drop-off")}:</span>{" "}
                      {pkg.dropoffPoint}
                    </div>
                  ) : null}
                  {mapsHref ? (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#0086C0] hover:text-[#0E374A] underline font-bold"
                    >
                      <Navigation className="w-4 h-4" />
                      {t("openInMaps", "Open in Maps")}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* Share + Map */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
            {share ? (
              <ShareButtonsClient
                share={share}
                label={t("share", "Share")}
                packageSlug={canonical?.split("/").pop() || ""}
              />
            ) : null}

            {mapsHref ? (
              <a
                href={mapsHref}
                className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0086C0] to-[#0E374A] text-white rounded-full font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="w-4 h-4" />
                <span style={{ fontFamily: "'Bree Serif', serif" }}>{t("openInMaps", "Open in Maps")}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            ) : null}
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
            <HelpBoxClient
              title={pkg.title}
              canonical={canonical}
              labels={{
                questions: t("questions", "Questions?"),
                helpText: t("helpText", "Message us on WhatsApp or email — we'll help you plan your trip."),
                chat: t("chat", "Chat on WhatsApp"),
                email: t("email", "Email us"),
                quickResponse: t("quickResponse", "Quick response • 24/7"),
                emailDetail: t("emailDetail", "Detailed inquiries • Attachments"),
              }}
              email={EMAIL_SALES}
              waNumber={WA_NUMBER}
            />
          </div>
        </aside>
      </section>

      {/* ---------- Related Experiences ---------- */}
      {related.length > 0 ? (
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
                // p.media already normalized in fetchRelated, but keep safe
                const img =
                  (Array.isArray(p.media) && p.media.length ? p.media[0]?.url : "") || "https://picsum.photos/600/400";
                const rHasPromo = !!p.isPromoActive && typeof p.effectivePrice === "number";
                const cur = (p.currency || "PEN").toUpperCase();
                const rPrice = money(rHasPromo ? p.effectivePrice : p.price, cur);
                const rSummary = safeText(p.description, 160);

                return (
                  <Link
                    key={p.slug}
                    href={`/${locale}/packages/${p.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={img}
                        alt={p.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      {p.city ? (
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                          <div className="text-xs text-white flex items-center gap-1" style={{ fontFamily: "'Bree Serif', serif" }}>
                            <MapPin className="w-3 h-3" />
                            {p.city}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="p-4">
                      <div
                        className="font-bold text-[#0E374A] line-clamp-2 mb-2 group-hover:text-[#0086C0] transition-colors"
                        style={{ fontFamily: "'Bree Serif', serif" }}
                      >
                        {p.title}
                      </div>
                      {rSummary ? (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3" style={{ fontFamily: "'Bree Serif', serif" }}>
                          {rSummary}
                        </p>
                      ) : null}
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
      ) : null}
    </main>
  );
}
