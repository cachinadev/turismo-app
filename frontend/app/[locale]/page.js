<<<<<<< HEAD
// frontend/app/[locale]/page.js
import Link from "next/link";
import NextDynamic from "next/dynamic";
import { mediaUrl } from "@/app/lib/media";
import { API_BASE } from "@/app/lib/config";

// Importar iconos de Lucide (o tu librería preferida)
import { Download, Users, Star, MapPin, Phone, Calendar, Award, Compass } from 'lucide-react';

/* =============================================================================
 * CONFIGURATION & CONSTANTS
 * ============================================================================= */
const CONFIG = {
  brand: {
    name: process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures",
    logo: process.env.NEXT_PUBLIC_BRAND_LOGO || '/brand/logo.png',
  },
  locale: {
    supported: ["es", "en", "fr", "pt", "ru"],
    default: "en",
  },
  currency: {
    default: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "PEN",
    locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en-US",
  },
  video: {
    //mp4: process.env.NEXT_PUBLIC_HERO_VIDEO || "/video/hero3.mp4",
    webm: process.env.NEXT_PUBLIC_HERO_VIDEO_WEBM || "/video/hero.webm",
    poster: process.env.NEXT_PUBLIC_HERO_POSTER || "/video/hero-poster.jpg",
  },
  packages: {
    pageSize: 48,
    maxPages: 2,
    timeout: 7000,
    revalidate: 60,
  },
  colors: {
    primary: "#0086C0",
    secondary: "#0E374A",
    accent: "#A3B117",
    light: "#F8FAFC",
    neutral: "#64748B",
  }
};

const DynamicComponents = {
  HeroSearch: NextDynamic(
    () => import("@/app/components/landing/HeroSearch"),
    { ssr: false, loading: () => <LoadingSpinner /> }
  ),
  InteractivePeruMap: NextDynamic(
    () => import("@/app/components/landing/InteractivePeruMap"),
    { ssr: false, loading: () => <LoadingSpinner /> }
  ),
  HeroLanding: NextDynamic(
    () => import("@/app/components/landing/HeroLanding"),
    { ssr: false, loading: () => <LoadingSpinner /> }
  ),
  TourGuide3D: NextDynamic(
    () => import("@/app/components/landing/TourGuide3D"),
    { ssr: false, loading: () => <LoadingSpinner /> }
  ),
  promotioncarousellocale: NextDynamic(
    () => import("@/app/components/PromotionCarouselLocale"),
    { ssr: false, loading: () => <LoadingSpinner /> }
  ),
};

/* =============================================================================
 * RUNTIME CONFIGURATION
 * ============================================================================= */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =============================================================================
 * UTILITY CLASSES
 * ============================================================================= */
class LocaleManager {
  static async loadMessages(locale) {
    try {
      const mod = await import(`@/messages/${locale}.json`);
      return mod.default?.Home || {};
    } catch (error) {
      console.error(`Failed to load messages for locale: ${locale}`, error);
      return {};
    }
  }

  static translate(dictionary, key, fallback = "") {
    const parts = key.split(".");
    let value = dictionary;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    const result = typeof value === "string" ? value : fallback;
    
    return result
      .replaceAll("{brand}", CONFIG.brand.name)
      .replaceAll("{year}", String(new Date().getFullYear()));
  }
}

class PriceFormatter {
  static format(amount, currency = CONFIG.currency.default) {
    try {
      return new Intl.NumberFormat(CONFIG.currency.locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(amount || 0));
    } catch (error) {
      console.error("Price formatting error:", error);
      return String(amount || "");
    }
  }

  static calculateDiscount(originalPrice, effectivePrice) {
    const original = Number(originalPrice);
    const effective = Number(effectivePrice);
    
    if (!original || !effective || effective >= original) return 0;
    
    return Math.min(100, Math.max(0, Math.round((1 - effective / original) * 100)));
  }
}

class PackageService {
  static async fetchAll() {
    const { pageSize, maxPages, timeout, revalidate } = CONFIG.packages;
    const packages = [];
    
    try {
      for (let page = 1; page <= maxPages; page++) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          active: "true",
        });

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(`${API_BASE}/api/packages?${params}`, {
            next: { revalidate },
            signal: controller.signal,
          });

          clearTimeout(timer);

          if (!response.ok) break;

          const data = await response.json();
          const items = Array.isArray(data) ? data : data.items || [];

          const enriched = items.map(pkg => ({
            ...pkg,
            media: (pkg.media || []).map(m => ({
              ...m,
              url: mediaUrl(m.url),
            })),
          }));

          if (enriched.length === 0) break;
          
          packages.push(...enriched);

          if (items.length < pageSize) break;
        } catch (error) {
          console.error(`Error fetching page ${page}:`, error);
          break;
        }
      }
    } catch (error) {
      console.error("Package fetching failed:", error);
    }

    return packages;
  }

  static filterActive(packages) {
    return packages.filter(pkg => pkg?.active !== false);
  }

  static filterPromotional(packages) {
    return packages.filter(pkg => pkg?.isPromoActive && pkg.effectivePrice);
  }
}

/* =============================================================================
 * UI COMPONENTS
 * ============================================================================= */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0086C0]" />
    </div>
  );
}


function SectionTitle({ children }) {
  return (
    <h2
      className="text-3xl md:text-4xl lg:text-5xl font-black text-[#0E374A] leading-tight mb-6 text-center"
      style={{ fontFamily: "'Bree Serif', serif" }}
    >
      {children}
    </h2>
  );
}

function SectionDescription({ children }) {
  return (
    <p
      className="text-l text-[#64748B] max-w-3xl mx-auto mb-16 text-center leading-relaxed"
      style={{ fontFamily: "'Bree Serif', serif" }}
    >
      {children}
    </p>
  );
}

function BenefitCard({ title, description, index }) {
  return (
    <div className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-[#0086C0]/30 transition-all duration-500 hover:-translate-y-2">
      <div className="flex items-start gap-5">
        <div 
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0086C0] to-[#0E374A] flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300"
        >
          <span 
            className="text-white text-xl font-black"
            style={{ fontFamily: "'Bree Serif', serif" }}
          >
            {index}
          </span>
        </div>
        <div className="flex-1">
          <h3 
            className="font-black text-[#0E374A] mb-3 text-l"
            style={{ fontFamily: "'Bree Serif', serif" }}
          >
            {title}
          </h3>
          <p 
            className="text-[#64748B] leading-relaxed font-medium"
            style={{ fontFamily: "'Bree Serif', serif" }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="group text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-[#0086C0]/30 transition-all duration-500 hover:-translate-y-2">
      <div 
        className="text-4xl font-black bg-gradient-to-r from-[#0086C0] to-[#A3B117] bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform"
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
        {value}
      </div>
      <div 
        className="text-[#64748B] text-base font-bold"
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
        {label}
      </div>
    </div>
  );
}

function HeroSection({ lang, t, hasPromotions }) {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={CONFIG.video.poster}
        style={{ filter: "brightness(0.85) saturate(1.15)" }}
      >
        {CONFIG.video.webm && <source src={CONFIG.video.webm} type="video/webm" />}
        <source src={CONFIG.video.mp4} type="video/mp4" />
      </video>

      <div className="absolute inset-0 " />

      <div className="relative h-full flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto text-center">

          <h1
          className="text-6xl md:text-6xl lg:text-8xl mb-8 leading-tight font-black animate-fade-in-up"
          style={{
            fontFamily: "'Bree Serif', serif",
            color: "#F8FAFC",
            textShadow: "0 6px 50px rgba(0,0,0,0.65)",
          }}
        >
          {CONFIG.brand.name}
        </h1>

          <p
            className="text-2xl md:text-3xl mb-12 max-w-4xl mx-auto text-white font-semibold animate-fade-in-up-delay"
            style={{
              fontFamily: "'Bree Serif', serif",
              textShadow: "0 2px 30px rgba(0,0,0,0.6)",
              lineHeight: 1.5,
            }}
          >
            {t("headline1", "Explora. Descubre.")}{" "}
            <span style={{ color: "#A3B117" }}>
              {t("headline2", "Vive tu próxima aventura")}
            </span>
          </p>

          <div className="max-w-3xl mx-auto mb-12 animate-fade-in-up-delay-2">
            <DynamicComponents.HeroSearch locale={lang} />
          </div>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center animate-fade-in-up-delay-3">
            <Link
              href={`/${lang}/packages`}
              className="group inline-flex items-center justify-center bg-gradient-to-r from-[#0086C0] to-[#0E374A] hover:to-[#0E374A] transition-all duration-100 text-white px-10 py-5 text-lg font-black rounded-full shadow-lg hover:shadow-[#0086C0]/30 hover:-translate-y-1 hover:scale-105"
              style={{ fontFamily: "'Bree Serif', serif" }}
            >
              {t("ctaExplore", "Ver Paquetes")}
              <svg className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce-slow">
            <div className="w-8 h-12 border-2 border-[#A3B117] rounded-full flex items-start justify-center p-2 bg-white/20 backdrop-blur-sm shadow-lg">
              <div className="w-2 h-3 bg-[#A3B117] rounded-full animate-scroll"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =============================================================================
 * MAIN PAGE COMPONENT
 * ============================================================================= */
export default async function HomePage({ params: { locale } }) {
  const lang = CONFIG.locale.supported.includes(locale) ? locale : CONFIG.locale.default;
  const messages = await LocaleManager.loadMessages(lang);
  const t = (key, fallback) => LocaleManager.translate(messages, key, fallback);

  const allPackages = await PackageService.fetchAll();
  const activePackages = PackageService.filterActive(allPackages);
  const promotionalPackages = PackageService.filterPromotional(activePackages);

  return (
    <>
      <HeroSection 
        lang={lang} 
        t={t} 
        hasPromotions={promotionalPackages.length > 0} 
      />

{/* Discover Peru Section */}
<section className="relative pt-24 my-2 bg-gradient-to-b from-white via-[#F8FAFC] to-white overflow-hidden">
  <div className="absolute inset-0 opacity-40">
    <div className="absolute top-20 left-20 w-96 h-96 bg-[#0086C0]/10 rounded-full blur-3xl animate-float"></div>
    <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#A3B117]/10 rounded-full blur-3xl animate-float-delay-2"></div>
  </div>

  <div className="container mx-auto px-6 relative z-10">
    <div className="text-center mb-16">
      <SectionTitle>
        <span className="block">{t("experienceEvery", "Cada Experiencia")}</span>
        <span className="text-[#A3B117]">
          {t("destitle", "Tiene Una Riqueza Escondida")}
        </span>
      </SectionTitle>
      <SectionDescription>
        {t("desdesc", "Explora las tres regiones únicas del Perú: Sierra, Costa y Selva. Cada una con su propia magia, historia y aventura.")}
      </SectionDescription>
    </div>
    
    <DynamicComponents.HeroLanding />
  </div>
</section>

{/* Interactive Map Section */}
<section className="relative py-32 bg-gradient-to-b from-[#F8FAFC] via-white to-slate-50 overflow-hidden">
  <div className="absolute inset-0 opacity-30">
    <div className="absolute top-40 right-20 w-96 h-96 bg-[#0086C0]/10 rounded-full blur-3xl animate-float-delay-2"></div>
    <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#A3B117]/10 rounded-full blur-3xl animate-float-delay-4"></div>
  </div>

  <div className="container mx-auto px-6 relative z-10">
    <div className="text-center mb-20">
      <SectionTitle>
        <span className="block">{t("explorePeru", "Explora Perú de")}</span>
        <span className="block text-[#A3B117]">
          {t("maptitle", "Forma Interactiva")}
        </span>
      </SectionTitle>
      <SectionDescription>
        {t("mapdesc", "Haz clic en las regiones para explorar destinos y experiencias únicas")}
      </SectionDescription>
    </div>
    
    <div className="flex items-center justify-center">
      <DynamicComponents.InteractivePeruMap />
    </div>
  </div>
</section>

{/* Special Offers Section */}
<section className="relative pb-16 bg-gradient-to-b from-white via-[#F8FAFC] to-white overflow-hidden">
  <div className="absolute inset-0 opacity-40">
    <div className="absolute top-20 left-20 w-96 h-96 bg-[#0086C0]/10 rounded-full blur-3xl animate-float"></div>
    <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#A3B117]/10 rounded-full blur-3xl animate-float-delay-2"></div>
  </div>

  <div className="container mx-auto px-6 relative z-10">
    <div className="text-center mb-20">
      <SectionTitle>
        <span className="block">{t("takeAdvantage", "Aprovecha Nuestras")}</span>
        <span className="block text-[#A3B117]">
          {t("specialPromotions", "Promociones Especiales")}
        </span>
      </SectionTitle>
      <SectionDescription>
        {t("promoDescription", "Tours con descuentos exclusivos disponibles por tiempo limitado")}
      </SectionDescription>
    </div>
    
    {/* Special Offers Section */}
    {promotionalPackages.length > 0 && (
      <DynamicComponents.promotioncarousellocale 
        promotionalPackages={promotionalPackages} 
        lang={lang} 
      />
    )}
    
    <div className="text-center mt-16">
      <Link
        href={`/${lang}/packages`}
        className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#0086C0] to-[#0E374A] text-white rounded-full font-black text-sm md:text-lg hover-md hover:scale-105 transition-all shadow-xl hover:shadow-2xl"
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
        <Compass className="w-6 h-6" />
        {t("viewAllPackages", "Ver Todos los Paquetes")}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  </div>
</section>
    </>
  );
}
=======
// frontend/app/[locale]/page.js
import Link from "next/link";
import NextDynamic from "next/dynamic";
import { mediaUrl } from "@/app/lib/media";
import { API_BASE } from "@/app/lib/config";

/* -----------------------------------------------------
 * 🧩 Client Components (disable SSR)
 * ----------------------------------------------------- */
const HeroSearch = NextDynamic(() => import("@/app/components/landing/HeroSearch"), {
  ssr: false,
  loading: () => <div className="text-white">Loading search...</div>,
});

const PackagesShowcase = NextDynamic(
  () => import("@/app/components/landing/PackagesShowcase"),
  {
    ssr: false,
    loading: () => <div className="text-center text-gray-500 py-10">Loading packages...</div>,
  }
);

/* -----------------------------------------------------
 * ⚙️ Runtime Config
 * ----------------------------------------------------- */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPPORTED_LOCALES = ["es", "en", "fr", "pt", "ru"];
const DEFAULT_LOCALE = "en";
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "PEN";
const DEFAULT_INTL = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en-US";

/* -----------------------------------------------------
 * 🌍 Helpers
 * ----------------------------------------------------- */
async function loadMsgs(locale) {
  try {
    const mod = await import(`@/messages/${locale}.json`);
    return mod.default?.Home || {};
  } catch {
    return {};
  }
}

function tr(dict, key, fb = "") {
  const parts = key.split(".");
  let val = dict;
  for (const p of parts) val = val?.[p];
  const out = typeof val === "string" ? val : fb;
  return out
    .replaceAll("{brand}", BRAND_NAME)
    .replaceAll("{year}", String(new Date().getFullYear()));
}

function formatPrice(n, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat(DEFAULT_INTL, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
}

function calcDiscount(original, effective) {
  const o = Number(original);
  const e = Number(effective);
  if (!o || !e || e >= o) return 0;
  return Math.min(100, Math.max(0, Math.round((1 - e / o) * 100)));
}

/* -----------------------------------------------------
 * 📡 Fetch packages with pagination & timeout
 * ----------------------------------------------------- */
async function fetchPackages() {
  const PAGE_SIZE = 48;
  let currentPage = 1;
  const MAX_PAGES = 2;
  const all = [];

  try {
    while (currentPage <= MAX_PAGES) {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        active: "true",
      });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`${API_BASE}/api/packages?${params}`, {
        next: { revalidate: 60 },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) break;

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.items || [];
      const enriched = list.map((p) => ({
        ...p,
        media: (p.media || []).map((m) => ({ ...m, url: mediaUrl(m.url) })),
      }));
      if (enriched.length === 0) break;

      all.push(...enriched);
      if (list.length < PAGE_SIZE) break;
      currentPage += 1;
    }
  } catch {
    // Fail silently
  }

  return all;
}

/* -----------------------------------------------------
 * 🧱 UI Components
 * ----------------------------------------------------- */
function DestinationBadge({ city, count, lang }) {
  return (
    <Link
      href={`/${lang}/packages?city=${encodeURIComponent(city)}`}
      className="group inline-flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 hover:border-brand-400 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
        {city.charAt(0)}
      </div>
      <div className="text-left">
        <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
          {city}
        </div>
        <div className="text-sm text-gray-500">
          {count} {count === 1 ? "package" : "packages"}
        </div>
      </div>
    </Link>
  );
}

function PromotionCard({ pkg, lang }) {
  const img = mediaUrl(pkg?.media?.[0]?.url) || "/brand/default.jpg";
  const hasPromo = pkg?.effectivePrice && pkg.effectivePrice < pkg.price;
  const pct = hasPromo ? calcDiscount(pkg.price, pkg.effectivePrice) : 0;

  return (
    <Link
      href={`/${lang}/packages/${pkg?.slug || ""}`}
      className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl overflow-hidden border border-gray-100 transition-all duration-500"
    >
      <div className="relative">
        <img
          src={img}
          alt={pkg?.title || "Tour in Peru"}
          className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {pkg?.city && (
            <span className="badge bg-white/90 text-gray-800 shadow-sm">
              🌄 {pkg.city}
            </span>
          )}
          {pct > 0 && (
            <span className="badge bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md font-semibold">
              🎯 Save {pct}%
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-bold text-xl text-gray-900 line-clamp-2 mb-2 group-hover:text-brand-700 transition">
          {pkg?.title || "Peru Adventure"}
        </h3>
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
          {pkg?.description || ""}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            {hasPromo ? (
              <>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(pkg.effectivePrice, pkg.currency)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(pkg.price, pkg.currency)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(pkg.price, pkg.currency)}
              </span>
            )}
          </div>
          <span className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-gray-600">
            ⏱ {pkg.durationHours || 8}h
          </span>
        </div>
      </div>
    </Link>
  );
}

/* -----------------------------------------------------
 * 🏠 Home Page
 * ----------------------------------------------------- */
export default async function HomePage({ params: { locale } }) {
  const lang = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const msgs = await loadMsgs(lang);
  const t = (k, fb) => tr(msgs, k, fb);

  let packages = [];
  try {
    packages = await fetchPackages();
  } catch {
    packages = [];
  }

  const active = packages.filter((p) => p?.active !== false);
  const promo = active.filter((p) => p?.isPromoActive && p.effectivePrice).slice(0, 6);
  const featured = (promo.length ? promo : active).slice(0, 6);

  const stats = active.reduce((acc, p) => {
    const city = p?.city || "Other Regions";
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});
  const topCities = Object.entries(stats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .filter(([c]) => c !== "Other Regions");

  const HERO_MP4 = process.env.NEXT_PUBLIC_HERO_VIDEO || "/video/hero.mp4";
  const HERO_WEBM = process.env.NEXT_PUBLIC_HERO_VIDEO_WEBM || "/video/hero.webm";
  const HERO_POSTER =
    process.env.NEXT_PUBLIC_HERO_POSTER || "/video/hero-poster.jpg";

  /* ======================= RENDER ======================= */
  return (
    <>
      {/* ---------- HERO SECTION ---------- */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover -z-10"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_POSTER}
        >
          {HERO_WEBM && <source src={HERO_WEBM} type="video/webm" />}
          <source src={HERO_MP4} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-black/50 mix-blend-multiply" />

        <div className="relative text-center text-white px-4">
          <p className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 border border-white/20 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {t("welcome", `Welcome to ${BRAND_NAME}`)}
          </p>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            {t("headline1", "Discover")}{" "}
            <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              {t("headline2", "Authentic Peru")}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed mb-10">
            {t(
              "subheading",
              `Experience the magic of Peru with ${BRAND_NAME}. From the Andes to the Amazon, your adventure starts here.`
            )}
          </p>

          <div className="max-w-3xl mx-auto">
            <HeroSearch locale={lang} />
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${lang}/packages`}
              className="btn btn-primary btn-lg px-10 py-4 font-semibold text-lg shadow-lg hover:shadow-xl transition"
            >
              {t("ctaExplore", "Explore Adventures")}
            </Link>
            {promo.length > 0 && (
              <Link
                href="#special-offers"
                className="btn btn-outline btn-lg px-10 py-4 font-semibold text-lg border-2 border-white text-white hover:bg-white hover:text-gray-900 transition"
              >
                🎁 {t("ctaOffers", "Special Offers")}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ---------- OFFERS ---------- */}
      {promo.length > 0 && (
        <section id="special-offers" className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container-default text-center">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">
              {t("offers.title", "Exclusive Adventure Deals")}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-12">
              {t("offers.desc", "Don’t miss these limited-time offers")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {promo.map((p) => (
                <PromotionCard key={p._id || p.slug} pkg={p} lang={lang} />
              ))}
            </div>

            <div className="mt-10">
              <Link
                href={`/${lang}/packages?promo=true`}
                className="btn btn-ghost text-brand-700 hover:bg-brand-50 font-bold"
              >
                {t("offers.ctaAll", "View All Offers →")}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---------- DESTINATIONS ---------- */}
      {topCities.length > 0 && (
        <section className="py-20 bg-white">
          <div className="container-default text-center">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              {t("destinations.title", "Explore Peru’s Top Destinations")}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-12">
              {t("destinations.desc", "From the highlands to the jungle, discover your next adventure.")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {topCities.map(([city, count]) => (
                <DestinationBadge key={city} city={city} count={count} lang={lang} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- FEATURED SHOWCASE ---------- */}
      {active.length > 0 && (
        <PackagesShowcase featured={featured} all={active} locale={lang} />
      )}

      {/* ---------- TRUST / BENEFITS ---------- */}
      <section
        className="relative py-20 text-white"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=2000')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="container-default relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8">
            {t("whyTitle", `Why Travel with ${BRAND_NAME}?`)}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { title: t("trust1.title", "24/7 Local Support"), desc: t("trust1.desc", "Always connected during your trip.") },
              { title: t("trust2.title", "Certified Local Guides"), desc: t("trust2.desc", "Discover with passionate, licensed experts.") },
              { title: t("trust3.title", "Flexible Itineraries"), desc: t("trust3.desc", "Change dates or adjust plans easily.") },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white/10 border border-white/20 rounded-2xl px-6 py-8 shadow-md hover:bg-white/15 transition-all hover:-translate-y-1"
              >
                <h3 className="text-xl font-semibold text-amber-200 mb-2">{item.title}</h3>
                <p className="text-white/90 text-sm md:text-base leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- EMPTY STATE ---------- */}
      {active.length === 0 && (
        <section className="py-32 text-center bg-white">
          <div className="container-default">
            <div className="max-w-2xl mx-auto">
              <div className="text-8xl mb-8">🏔️</div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                {t("welcome", `Welcome to ${BRAND_NAME}`)}
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                {t(
                  "empty.desc",
                  "We’re curating amazing Peruvian adventures just for you."
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={`/${lang}/contact`} className="btn btn-primary btn-lg">
                  {t("empty.cta1", "📧 Contact Us")}
                </Link>
                <Link href={`/${lang}/about`} className="btn btn-outline btn-lg">
                  {t("empty.cta2", "ℹ️ Learn More")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
