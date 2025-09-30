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
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "es-PE";

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
        url:
          process.env.NEXT_PUBLIC_HERO_POSTER ||
          "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200",
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
  },
  robots: {
    index: true,
    follow: true,
  },
};

/* -----------------------------
   Utility functions
----------------------------- */
const parsePackageList = (jsonData) =>
  Array.isArray(jsonData) ? jsonData : jsonData?.items || [];

const parseTotalCount = (jsonData, currentLength) => {
  if (typeof jsonData?.total === "number") return jsonData.total;
  if (Array.isArray(jsonData)) return jsonData.length;
  return currentLength || 0;
};

const formatCurrency = (amount, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
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

/* -----------------------------
   Data fetching
----------------------------- */
async function fetchAllPackages() {
  const PAGE_SIZE = 48;
  const MAX_PAGES = 2;
  let currentPage = 1;
  let allPackages = [];

  try {
    while (currentPage <= MAX_PAGES) {
      const searchParams = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        active: "true",
      });

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 8000);

      // ✅ Use ISR instead of no-store
      const response = await fetch(`${API_BASE}/api/packages?${searchParams}`, {
        next: { revalidate: 60 }, // revalidate every 60 seconds
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`API responded with status ${response.status} for page ${currentPage}`);
        break;
      }

      const responseData = await response.json().catch(() => ({}));
      const packageList = parsePackageList(responseData).map((pkg) => ({
        ...pkg,
        media: Array.isArray(pkg.media)
          ? pkg.media.map((m) => ({ ...m, url: mediaUrl(m?.url) }))
          : [],
      }));

      if (packageList.length === 0) break;

      allPackages = [...allPackages, ...packageList];

      const totalCount = parseTotalCount(responseData, allPackages.length);
      const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
      if (currentPage >= totalPages || packageList.length < PAGE_SIZE) break;

      currentPage += 1;
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Error fetching packages:", error);
    }
  }

  return allPackages;
}
/* -----------------------------
   UI Components
----------------------------- */
function PromotionCard({ package: pkg }) {
  const packageId = pkg?._id || pkg?.id || pkg?.slug;
  const primaryImage = mediaUrl(pkg?.media?.[0]?.url) || "https://picsum.photos/600/400";
  const currency = pkg?.currency || DEFAULT_CURRENCY;
  const hasPromotionalPricing = (pkg?.effectivePrice ?? null) !== null;
  
  const discountPercentage = hasPromotionalPricing
    ? calculateDiscountPercentage(pkg.price, pkg.effectivePrice)
    : Number(pkg?.promoPercent) || 0;

  const durationHours = (pkg?.durationHours && Number(pkg.durationHours)) || 8;

  return (
    <Link
      href={`/packages/${pkg?.slug || ""}`}
      className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-brand-100"
    >
      {/* Image Container */}
      <div className="relative overflow-hidden">
        <img
          src={primaryImage}
          alt={pkg?.title || "Adventure package in Peru"}
          className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
        
        {/* Overlay Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {pkg?.city && (
            <span className="badge bg-white/95 text-gray-800 backdrop-blur-sm border-0 shadow-sm font-medium">
              🌄 {pkg.city}
            </span>
          )}
          <span className="badge bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg font-semibold">
            🎯 {discountPercentage > 0 ? `Save ${discountPercentage}%` : "Special Offer"}
          </span>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="font-bold text-xl text-gray-900 line-clamp-2 leading-tight mb-3 group-hover:text-brand-700 transition-colors">
          {pkg?.title || "Peruvian Adventure Experience"}
        </h3>
        
        {pkg?.description && (
          <p className="text-gray-600 line-clamp-2 text-sm leading-relaxed mb-4">
            {pkg.description}
          </p>
        )}

        {/* Pricing & Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              {hasPromotionalPricing ? (
                <>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(pkg.effectivePrice, currency)}
                  </span>
                  <span className="text-sm text-gray-500 line-through">
                    {formatCurrency(pkg.price, currency)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(pkg.price, currency)}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              ⏱️ {durationHours}h
            </span>
          </div>

          {/* Languages */}
          {Array.isArray(pkg?.languages) && pkg.languages.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium">
                🗣️ Available in: <span className="text-gray-700">{pkg.languages.join(", ")}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function TrustFeature({ icon, title, description }) {
  return (
    <div className="group text-center p-8 rounded-2xl bg-white shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 hover:-translate-y-1">
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-lg">{description}</p>
    </div>
  );
}

function DestinationBadge({ city, count }) {
  return (
    <Link
      href={`/packages?city=${encodeURIComponent(city)}`}
      className="group inline-flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 hover:border-brand-300 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
        {city.charAt(0)}
      </div>
      <div className="text-left">
        <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
          {city}
        </div>
        <div className="text-sm text-gray-500">
          {count} {count === 1 ? 'package' : 'packages'}
        </div>
      </div>
    </Link>
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

  // Filter active packages
  const activePackages = allPackages.filter(pkg => pkg?.active !== false);

  // Find active promotions
  const promotionalPackages = activePackages
    .filter(pkg => pkg?.isPromoActive && (pkg?.effectivePrice ?? null) !== null)
    .slice(0, 6);

  // Featured packages (promotions first, then general)
  const featuredPackages = (promotionalPackages.length > 0 ? promotionalPackages : activePackages)
    .slice(0, 6);

  // Analyze destinations
  const destinationStats = activePackages.reduce((stats, pkg) => {
    const city = pkg?.city || "Other Regions";
    stats[city] = (stats[city] || 0) + 1;
    return stats;
  }, {});

  const popularDestinations = Object.entries(destinationStats)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 6)
    .filter(([city]) => city !== "Other Regions");

  // Media configuration
  const HERO_VIDEO_MP4 = process.env.NEXT_PUBLIC_HERO_VIDEO || "/video/hero.mp4";
  const HERO_VIDEO_WEBM = process.env.NEXT_PUBLIC_HERO_VIDEO_WEBM || "/video/hero.webm";
  const HERO_POSTER_IMAGE = process.env.NEXT_PUBLIC_HERO_POSTER || 
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000";

  // Trust features configuration
  const trustFeatures = [
    {
      icon: "🛡️",
      title: "24/7 Local Support",
      description: `Your ${BRAND_NAME} team is available around the clock throughout your Peruvian adventure.`
    },
    {
      icon: "🏔️",
      title: "Expert Local Guides",
      description: "Explore with certified guides who share deep cultural knowledge and regional expertise."
    },
    {
      icon: "🔄",
      title: "Flexible Planning",
      description: "Easy booking modifications and date changes to accommodate your travel plans."
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Media */}
        <div className="absolute inset-0 -z-10">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={HERO_POSTER_IMAGE}
          >
            {HERO_VIDEO_WEBM && <source src={HERO_VIDEO_WEBM} type="video/webm" />}
            <source src={HERO_VIDEO_MP4} type="video/mp4" />
            <img
              src={HERO_POSTER_IMAGE}
              alt="Majestic landscapes of Peru including Machu Picchu, Rainbow Mountain, and Lake Titicaca"
              className="w-full h-full object-cover"
            />
          </video>
          
          {/* Enhanced Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-purple-900/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
        </div>

        {/* Hero Content */}
        <div className="container-default px-4 text-center relative z-10">
          {/* Welcome Badge */}
          <div className="inline-flex items-center gap-3 text-white/95 text-base bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Welcome to <strong className="font-bold text-amber-200">{BRAND_NAME}</strong>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white max-w-6xl leading-tight mb-6">
            Discover{" "}
            <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
              Authentic Peru
            </span>
            <br />
            <span className="text-3xl md:text-4xl lg:text-5xl font-light text-white/90">
              through unforgettable adventures
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
            Experience Peru like never before with{" "}
            <span className="font-semibold text-amber-200">{BRAND_NAME}</span>. 
            From ancient ruins to vibrant cultures, your journey begins here.
          </p>

          {/* Search Component */}
          <div className="mt-12 w-full max-w-4xl mx-auto">
            <HeroSearch />
          </div>

          {/* Call-to-Action Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/packages"
              className="group btn btn-primary btn-lg px-10 py-5 text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
            >
              <span className="group-hover:scale-110 transition-transform"></span>
              Explore All Adventures
              <span className="group-hover:scale-110 transition-transform"></span>
            </Link>
            
            {promotionalPackages.length > 0 && (
              <Link
                href="#special-offers"
                className="group btn btn-outline btn-lg px-10 py-5 text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-gray-900 backdrop-blur-sm transform hover:scale-105 transition-all duration-300"
              >
                🎁 Special Offers
              </Link>
            )}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Special Offers Section */}
      {promotionalPackages.length > 0 && (
        <section id="special-offers" className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container-default">
            {/* Section Header */}
            <div className="text-center mb-16">
              <span className="badge badge-lg badge-warning mb-4 text-sm font-semibold">
                🎊 LIMITED TIME
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Exclusive <span className="text-brand-600">Adventure Deals</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Don't miss these specially curated experiences at unbeatable prices
              </p>
            </div>

            {/* Promotional Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {promotionalPackages.map((pkg) => (
                <PromotionCard key={pkg._id || pkg.id} package={pkg} />
              ))}
            </div>

            {/* View All CTA */}
            <div className="text-center mt-12">
              <Link
                href="/packages?promo=true"
                className="btn btn-ghost btn-lg text-brand-700 font-bold text-lg hover:bg-brand-50 hover:scale-105 transition-all"
              >
                View All Special Offers →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Popular Destinations */}
      {popularDestinations.length > 0 && (
        <section className="py-20 bg-white">
          <div className="container-default">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Explore <span className="text-brand-600">Peru's Gems</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Discover the most sought-after destinations in our beautiful country
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {popularDestinations.map(([city, count]) => (
                <DestinationBadge key={city} city={city} count={count} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Packages Showcase */}
      {activePackages.length > 0 && (
        <PackagesShowcase featured={featuredPackages} all={activePackages} />
      )}

      {/* Trust & Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-brand-50">
        <div className="container-default">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Why Adventure with <span className="text-brand-600">{BRAND_NAME}</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're committed to making your Peruvian journey safe, memorable, and truly authentic
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {trustFeatures.map((feature, index) => (
              <TrustFeature
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Empty State */}
      {activePackages.length === 0 && (
        <section className="py-32 text-center bg-white">
          <div className="container-default">
            <div className="max-w-2xl mx-auto">
              <div className="text-8xl mb-8">🏔️</div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                Welcome to {BRAND_NAME}
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                We're currently curating extraordinary Peruvian adventures for you. 
                Our team is working hard to bring you authentic experiences that showcase 
                the very best of Peru's rich culture and breathtaking landscapes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/contact" 
                  className="btn btn-primary btn-lg px-8 py-4 text-lg font-semibold"
                >
                  📧 Get In Touch
                </Link>
                <Link 
                  href="/about" 
                  className="btn btn-outline btn-lg px-8 py-4 text-lg font-semibold"
                >
                  ℹ️ Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}