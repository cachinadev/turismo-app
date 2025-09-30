// frontend/app/testimonials/page.js
import Link from "next/link";
import { SITE_URL } from "@/app/lib/config";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const canonical = `${normalizeBase(SITE_URL) || ""}/testimonials`;

/* ---------- SEO ---------- */
export const viewport = {
  title: `${BRAND} | Testimonials`,
  description: `Read real traveler reviews about ${BRAND}: certified guides, flexible bookings, and 24/7 support.`,
  openGraph: {
    title: `${BRAND} | Testimonials`,
    description: `Real traveler reviews and experiences with ${BRAND}.`,
    url: canonical,
    type: "website",
    siteName: BRAND,
  },
  alternates: { canonical },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND} | Testimonials`,
    description: `Real traveler reviews and experiences with ${BRAND}.`,
  },
};

/* ---------- Data helpers ---------- */
async function fetchTestimonials() {
  try {
    const res = await fetch(`${API_BASE}/api/testimonials`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => []);
    const list = Array.isArray(json) ? json : json?.items || [];
    // Normalize minimal shape
    return list.map((t, i) => ({
      id: t._id || t.id || i,
      name: t.name || "Traveler",
      country: t.country || "",
      rating: Math.max(1, Math.min(5, Number(t.rating || 5))),
      title: t.title || "",
      message: t.message || "",
      date: t.date ? new Date(t.date) : null,
      avatar: t.avatar || "",
      media: t.media || [], // optional: [{url,type:'image'|'video'}]
    }));
  } catch {
    return [];
  }
}

const Stars = ({ rating = 5, className = "" }) => {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={`${r} out of 5 stars`}
      title={`${r}/5`}
    >
      {"★".repeat(r)}
      <span className="text-slate-300">{"★".repeat(5 - r)}</span>
    </span>
  );
};

const fmtDate = (d) =>
  d ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(d) : "";

/* ---------- Page ---------- */
export default async function TestimonialsPage() {
  const testimonials = await fetchTestimonials();

  const total = testimonials.length;
  const avg =
    total > 0
      ? Math.round(
          (testimonials.reduce((s, t) => s + (Number(t.rating) || 0), 0) / total) * 10
        ) / 10
      : 5;

  // JSON-LD (AggregateRating + a few reviews to avoid bloat)
  const ld = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(avg || 5),
      reviewCount: String(total || 0),
      bestRating: "5",
      worstRating: "1",
    },
    review: testimonials.slice(0, 10).map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.name || "Traveler" },
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(t.rating || 5),
        bestRating: "5",
        worstRating: "1",
      },
      reviewBody: t.message || "",
      name: t.title || "",
      datePublished: t.date ? new Date(t.date).toISOString() : undefined,
    })),
  };

  return (
    <main>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      {/* Breadcrumbs */}
      <div className="border-b border-slate-100">
        <div className="container-default py-3 text-sm text-slate-600">
          <Link href="/" className="hover:underline">Inicio</Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800">Testimonials</span>
        </div>
      </div>

      <section className="container-default py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Traveler Testimonials</h1>
            <p className="text-slate-600 text-sm">
              {total > 0 ? (
                <>
                  <Stars rating={Math.round(avg)} className="text-amber-500 mr-2" />
                  {avg}/5 · {total} review{total === 1 ? "" : "s"}
                </>
              ) : (
                "Be the first to share your experience!"
              )}
            </p>
          </div>
          <Link href="/contact" className="btn btn-primary">Write to us</Link>
        </div>

        {/* Content */}
        {total === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">
                We don’t have public testimonials yet. Meanwhile, check our{" "}
                <Link href="/packages" className="underline">tour packages</Link> or{" "}
                <Link href="/contact" className="underline">contact us</Link>—we’d love to help.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Highlights */}
            <div className="rounded-xl bg-slate-50 border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Why travelers recommend {BRAND}</p>
                <p className="text-sm text-slate-600">
                  Certified local guides, flexible dates, and 24/7 assistance—tailored to you.
                </p>
              </div>
              <Link href="/packages" className="btn btn-ghost">Explore packages</Link>
            </div>

            {/* Reviews grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {testimonials.map((t) => (
                <article key={t.id} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar (initials fallback) */}
                        {t.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.avatar}
                            alt={t.name}
                            className="h-10 w-10 rounded-full object-cover border"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold">
                            {String(t.name || "T").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium leading-tight">
                            {t.name} {t.country ? <span className="text-slate-500">· {t.country}</span> : null}
                          </p>
                          {t.date && (
                            <p className="text-xs text-slate-500">{fmtDate(t.date)}</p>
                          )}
                        </div>
                      </div>
                      <Stars rating={t.rating} className="text-amber-500" />
                    </div>

                    {t.title && <p className="mt-2 font-semibold">{t.title}</p>}
                    {t.message && <p className="text-slate-700 mt-1">{t.message}</p>}
                  </div>
                </article>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center pt-6">
              <Link href="/contact" className="btn btn-primary">
                Share your experience
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
