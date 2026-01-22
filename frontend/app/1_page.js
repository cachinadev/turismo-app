// frontend/app/page.js
import Link from "next/link";
import { mediaUrl } from "@/app/lib/media";
import HeroSearch from "./components/landing/HeroSearch";
import PackagesShowcase from "./components/landing/PackagesShowcase";
import { API_BASE } from "@/app/lib/config";

/* -----------------------------
   SEO metadata & configuration
----------------------------- */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "PEN";
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en-US";

const HERO_VIDEO_MP4 = process.env.NEXT_PUBLIC_HERO_VIDEO || "/video/hero.mp4";
const HERO_VIDEO_WEBM = process.env.NEXT_PUBLIC_HERO_VIDEO_WEBM || "/video/hero.webm";
const HERO_POSTER_IMAGE =
  process.env.NEXT_PUBLIC_HERO_POSTER ||
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000";

export const metadata = {
  title: `${BRAND_NAME} | Unforgettable Experiences in Peru`,
  description: `Discover authentic Peruvian adventures with ${BRAND_NAME}. Trusted bookings, certified local guides, and 24/7 support in Puno, Cusco, Arequipa, and across Peru.`,
  keywords: "Peru travel, adventure tours, Cusco, Machu Picchu, Puno, local guides, sustainable tourism",
  openGraph: {
    title: `${BRAND_NAME} | Unforgettable Experiences in Peru`,
    description: `Discover authentic Peruvian adventures with ${BRAND_NAME}. Trusted bookings, certified local guides, and 24/7 support.`,
    siteName: BRAND_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: HERO_POSTER_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} - Discover Authentic Peruvian Adventures`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} | Unforgettable Experiences in Peru`,
    description: `Discover authentic Peruvian adventures with ${BRAND_NAME}. Trusted bookings, certified local guides, and 24/7 support.`,
    images: [HERO_POSTER_IMAGE],
  },
  robots: { index: true, follow: true },
};

/* -----------------------------
   Utility functions
----------------------------- */
const parsePackageList = (jsonData) => (Array.isArray(jsonData) ? jsonData : jsonData?.items || []);

const parseTotalCount = (jsonData, currentLength) => {
  if (typeof jsonData?.total === "number") return jsonData.total;
  if (Array.isArray(jsonData)) return jsonData.length;
  return currentLength || 0;
};

const formatCurrency = (amount, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: String(currency || DEFAULT_CURRENCY).toUpperCase(),
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toFixed(2)} ${currency}`;
  }
};

const calculateDiscountPercentage = (originalPrice, effectivePrice) => {
  const original = Number(originalPrice);
  const effective = Number(effectivePrice);
  if (!original || !effective || original <= effective) return 0;
  const percentage = Math.round((1 - effective / original) * 100);
  return Math.max(0, Math.min(100, percentage));
};

function safeText(s) {
  return typeof s === "string" ? s : "";
}

/* -----------------------------
   Data fetching (ISR)
----------------------------- */
async function fetchAllPackages() {
  const PAGE_SIZE = 48;
  const MAX_PAGES = 2;
  let currentPage = 1;
  let allPackages = [];

  while (currentPage <= MAX_PAGES) {
    const searchParams = new URLSearchParams({
      page: String(currentPage),
      limit: String(PAGE_SIZE),
      active: "true",
    });

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000);

    try {
      const response = await fetch(`${API_BASE}/api/packages?${searchParams}`, {
        next: { revalidate: 60 },
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) break;

      const responseData = await response.json().catch(() => ({}));
      const raw = parsePackageList(responseData);

      const packageList = raw.map((pkg) => {
        const mediaArr = Array.isArray(pkg?.media) ? pkg.media : [];
        // IMPORTANT: do NOT double mediaUrl() if it's already absolute
        const normalizedMedia = mediaArr
          .filter((m) => m && m.url)
          .map((m) => ({
            ...m,
            url: mediaUrl(m.url),
          }));

        return {
          ...pkg,
          media: normalizedMedia,
        };
      });

      if (packageList.length === 0) break;

      allPackages = [...allPackages, ...packageList];

      const totalCount = parseTotalCount(responseData, allPackages.length);
      const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
      if (currentPage >= totalPages || packageList.length < PAGE_SIZE) break;

      currentPage += 1;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error?.name !== "AbortError") console.error("Error fetching packages:", error);
      break;
    }
  }

  return allPackages;
}

/* -----------------------------
   UI Components
----------------------------- */
function PromotionCard({ pkg }) {
  const packageId = pkg?._id || pkg?.id || pkg?.slug || Math.random().toString(36).slice(2);
  const primaryImage = pkg?.media?.[0]?.url || "https://picsum.photos/600/400";
  const currency = pkg?.currency || DEFAULT_CURRENCY;

  const hasPromotionalPricing = typeof pkg?.effectivePrice === "number" && Number(pkg.effectivePrice) < Number(pkg.price || 0);
  const discountPercentage = hasPromotionalPricing
    ? calculateDiscountPercentage(pkg.price, pkg.effectivePrice)
    : Number(pkg?.promoPercent) || 0;

  const durationHours = (pkg?.durationHours && Number(pkg.durationHours)) || 8;

  return (
    <Link
      href={`/packages/${pkg?.slug || ""}`}
      className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-slate-200"
    >
      <div className="relative overflow-hidden">
        <img
          src={primaryImage}
          alt={pkg?.title || "Adventure package in Peru"}
          className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {pkg?.city && (
            <span className="px-3 py-1.5 rounded-full bg-white/95 text-gray-800 backdrop-blur-sm shadow-sm text-sm font-semibold">
              🌄 {pkg.city}
            </span>
          )}
          <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg text-sm font-bold">
            🎯 {discountPercentage > 0 ? `Save ${discountPercentage}%` : "Special Offer"}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-6">
        <h3 className="font-extrabold text-xl text-gray-900 line-clamp-2 leading-tight mb-3 group-hover:text-slate-900 transition-colors">
          {pkg?.title || "Peruvian Adventure Experience"}
        </h3>

        {pkg?.description ? (
          <p className="text-gray-600 line-clamp-2 text-sm leading-relaxed mb-4">{safeText(pkg.description)}</p>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              {hasPromotionalPricing ? (
                <>
                  <span className="text-lg font-extrabold text-gray-900">
                    {formatCurrency(pkg.effectivePrice, currency)}
                  </span>
                  <span className="text-sm text-gray-500 line-through">{formatCurrency(pkg.price, currency)}</span>
                </>
              ) : (
                <span className="text-lg font-extrabold text-gray-900">{formatCurrency(pkg.price, currency)}</span>
              )}
            </div>

            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              ⏱️ {durationHours}h
            </span>
          </div>

          {Array.isArray(pkg?.languages) && pkg.languages.length > 0 ? (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-semibold">
                🗣️ Available in: <span className="text-gray-700">{pkg.languages.join(", ")}</span>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function DestinationBadge({ city, count }) {
  return (
    <Link
      href={`/packages?city=${encodeURIComponent(city)}`}
      className="group inline-flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 hover:border-slate-300 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center text-white font-extrabold text-lg">
        {city.charAt(0)}
      </div>
      <div className="text-left">
        <div className="font-extrabold text-gray-900 group-hover:text-slate-900 transition-colors">{city}</div>
        <div className="text-sm text-gray-500 font-semibold">{count} {count === 1 ? "package" : "packages"}</div>
      </div>
    </Link>
  );
}

function TrustCard({ title, desc }) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-8 shadow-md hover:bg-white/15 transition-all duration-300 hover:-translate-y-1">
      <h3 className="text-xl font-extrabold text-amber-200 mb-2">{title}</h3>
      <p className="text-white/90 text-sm md:text-base leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

/* -----------------------------
   Main Page Component
----------------------------- */
export default async function HomePage() {
  let allPackages = [];

  try {
    allPackages = await fetchAllPackages();
  } catch (error) {
    console.error("Failed to load packages:", error);
  }

  const activePackages = allPackages.filter((pkg) => pkg?.active !== false);

  const promotionalPackages = activePackages
    .filter((pkg) => pkg?.isPromoActive && typeof pkg?.effectivePrice === "number" && Number(pkg.effectivePrice) < Number(pkg.price || 0))
    .slice(0, 6);

  const featuredPackages = (promotionalPackages.length > 0 ? promotionalPackages : activePackages).slice(0, 6);

  const destinationStats = activePackages.reduce((stats, pkg) => {
    const city = pkg?.city || "Other Regions";
    stats[city] = (stats[city] || 0) + 1;
    return stats;
  }, {});

  const popularDestinations = Object.entries(destinationStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .filter(([city]) => city !== "Other Regions");

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={HERO_POSTER_IMAGE}
            style={{ filter: "brightness(0.9) saturate(1.1)" }}
          >
            {HERO_VIDEO_WEBM ? <source src={HERO_VIDEO_WEBM} type="video/webm" /> : null}
            {HERO_VIDEO_MP4 ? <source src={HERO_VIDEO_MP4} type="video/mp4" /> : null}
            <img
              src={HERO_POSTER_IMAGE}
              alt="Majestic landscapes of Peru including Machu Picchu, Rainbow Mountain, and Lake Titicaca"
              className="w-full h-full object-cover"
            />
          </video>

          {/* overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
        </div>

        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-3 text-white/95 text-base bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Welcome to <strong className="font-extrabold text-amber-200">{BRAND_NAME}</strong>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white max-w-6xl leading-tight mb-6">
            Discover{" "}
            <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
              Authentic Peru
            </span>
            <br />
            <span className="text-3xl md:text-4xl lg:text-5xl font-medium text-white/90">
              through unforgettable adventures
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
            Experience Peru like never before with{" "}
            <span className="font-extrabold text-amber-200">{BRAND_NAME}</span>. From ancient ruins to vibrant cultures, your journey begins here.
          </p>

          <div className="mt-10 w-full max-w-4xl mx-auto">
            <HeroSearch />
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center bg-gradient-to-r from-[#0086C0] to-[#0E374A] text-white
                         px-10 py-5 text-lg font-extrabold rounded-full shadow-2xl
                         hover:shadow-[#0086C0]/30 hover:-translate-y-1 hover:scale-[1.03] transition-all duration-300"
            >
              Explore All Adventures →
            </Link>

            {promotionalPackages.length > 0 ? (
              <Link
                href="#special-offers"
                className="inline-flex items-center justify-center px-10 py-5 text-lg font-extrabold rounded-full
                           border-2 border-white text-white bg-white/10 backdrop-blur
                           hover:bg-white hover:text-slate-900 hover:-translate-y-1 hover:scale-[1.03]
                           transition-all duration-300"
              >
                🎁 Special Offers
              </Link>
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      {/* SPECIAL OFFERS */}
      {promotionalPackages.length > 0 ? (
        <section id="special-offers" className="py-20 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-extrabold text-sm">
                🎊 LIMITED TIME
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mt-4">
                Exclusive <span className="text-[#0086C0]">Adventure Deals</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mt-3">
                Don't miss these specially curated experiences at unbeatable prices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {promotionalPackages.map((pkg) => (
                <PromotionCard key={pkg?._id || pkg?.id || pkg?.slug} pkg={pkg} />
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/packages?promo=true"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full font-extrabold text-[#0E374A]
                           hover:bg-[#0E374A]/5 transition-all"
              >
                View All Special Offers →
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* DESTINATIONS */}
      {popularDestinations.length > 0 ? (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">
                Explore <span className="text-[#0086C0]">Peru's Gems</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mt-3">
                Discover the most sought-after destinations in our beautiful country.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {popularDestinations.map(([city, count]) => (
                <DestinationBadge key={city} city={city} count={count} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* PACKAGES SHOWCASE */}
      {activePackages.length > 0 ? <PackagesShowcase featured={featuredPackages} all={activePackages} /> : null}

      {/* TRUST */}
      <section
        className="relative py-16 md:py-20 text-white"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=2000')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="mb-10 md:mb-14">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-3 drop-shadow-md">
              Why Adventure with <span className="text-amber-300">{BRAND_NAME}</span>?
            </h2>
            <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
              We’re dedicated to making every Peruvian journey safe, authentic, and unforgettable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <TrustCard
              title="24/7 Local Support"
              desc={`Your ${BRAND_NAME} team is always available to assist you throughout your trip.`}
            />
            <TrustCard
              title="Expert Local Guides"
              desc="Explore with certified guides who share true cultural knowledge and passion for their homeland."
            />
            <TrustCard
              title="Flexible Planning"
              desc="Adjust your dates or itinerary with ease — travel on your terms, stress-free."
            />
          </div>
        </div>
      </section>

      {/* EMPTY STATE */}
      {activePackages.length === 0 ? (
        <section className="py-28 text-center bg-white">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-7xl mb-6">🏔️</div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-5">
              Welcome to {BRAND_NAME}
            </h2>
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
              We're currently curating extraordinary Peruvian adventures for you. Come back soon!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center bg-gradient-to-r from-[#0086C0] to-[#0E374A] text-white
                           px-8 py-4 text-lg font-extrabold rounded-full shadow-xl hover:scale-[1.03] transition-all"
              >
                📧 Get In Touch
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center border-2 border-slate-300 text-slate-900
                           px-8 py-4 text-lg font-extrabold rounded-full hover:bg-slate-50 hover:scale-[1.03] transition-all"
              >
                ℹ️ Learn More
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
