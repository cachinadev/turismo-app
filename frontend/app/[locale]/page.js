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
