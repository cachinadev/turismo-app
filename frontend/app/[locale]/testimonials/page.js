// frontend/app/testimonials/page.js
import Link from "next/link";
import { SITE_URL } from "@/app/lib/config";
import SubmitTestimonialForm from "./SubmitTestimonialForm";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const FB_PAGE_URL = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_URL || "";
const TRIPADVISOR_EMBED_URL = process.env.NEXT_PUBLIC_TRIPADVISOR_EMBED_URL || "";

const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const canonicalBase = normalizeBase(SITE_URL) || "";
const fbPluginUrl = FB_PAGE_URL
  ? `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(
      FB_PAGE_URL
    )}&tabs=timeline&width=340&height=420&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true`
  : "";

/* ---------- SEO ---------- */
export async function generateMetadata({ params }) {
  const locale = params?.locale || "es";
  const canonical = canonicalBase ? `${canonicalBase}/${locale}/testimonials` : "";
  return {
    title: `${BRAND} | Testimonials`,
    description: `Read real traveler reviews about ${BRAND}: certified guides, flexible bookings, and 24/7 support.`,
    openGraph: {
      title: `${BRAND} | Testimonials`,
      description: `Real traveler reviews and experiences with ${BRAND}.`,
      url: canonical || undefined,
      type: "website",
      siteName: BRAND,
    },
    alternates: canonical ? { canonical } : undefined,
    twitter: {
      card: "summary_large_image",
      title: `${BRAND} | Testimonials`,
      description: `Real traveler reviews and experiences with ${BRAND}.`,
    },
  };
}

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
      source: t.source || "",
      sourceUrl: t.sourceUrl || "",
      packageSlug: t.packageSlug || "",
      verified: !!t.verified,
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

const fmtDate = (d, locale = "es-PE") =>
  d ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d) : "";

/* ---------- Page ---------- */
export default async function TestimonialsPage({ params }) {
  const locale = params?.locale || "es";
  const lang = String(locale || "en").toLowerCase();
  const labels = {
    es: {
      shareTitle: "Comparte tu experiencia",
      shareSubtitle: "Ayuda a otros viajeros con una reseña rápida. Las reservas verificadas muestran una insignia al instante.",
      tips: "✅ Toma 1 minuto · ⭐ 1–5 estrellas · 🏷️ Se verifica si agregas tu ID de reserva",
      shareCta: "Comparte tu experiencia",
    },
    en: {
      shareTitle: "Share your experience",
      shareSubtitle: "Help other travelers with a quick review. Verified bookings show a badge instantly.",
      tips: "✅ Takes 1 minute · ⭐ 1–5 rating · 🏷️ Verified if you add your reservation ID",
      shareCta: "Share your experience",
    },
    pt: {
      shareTitle: "Compartilhe sua experiência",
      shareSubtitle: "Ajude outros viajantes com uma avaliação rápida. Reservas verificadas exibem um selo instantaneamente.",
      tips: "✅ Leva 1 minuto · ⭐ 1–5 estrelas · 🏷️ Verificado se você adicionar seu ID de reserva",
      shareCta: "Compartilhe sua experiência",
    },
    fr: {
      shareTitle: "Partagez votre expérience",
      shareSubtitle: "Aidez d’autres voyageurs avec un avis rapide. Les réservations vérifiées affichent un badge instantanément.",
      tips: "✅ 1 minute · ⭐ 1–5 étoiles · 🏷️ Vérifié si vous ajoutez votre ID de réservation",
      shareCta: "Partagez votre expérience",
    },
    ru: {
      shareTitle: "Поделитесь впечатлением",
      shareSubtitle: "Помогите другим путешественникам быстрым отзывом. Проверенные бронирования сразу получают значок.",
      tips: "✅ 1 минута · ⭐ 1–5 звёзд · 🏷️ Проверено при добавлении ID бронирования",
      shareCta: "Поделитесь впечатлением",
    },
  };
  const ui = labels[["es", "en", "pt", "fr", "ru"].includes(lang) ? lang : "en"];
  const canonical = canonicalBase ? `${canonicalBase}/${locale}/testimonials` : "";
  const testimonials = await fetchTestimonials();
  const approvedSorted = [...testimonials].sort((a, b) => {
    const av = a?.verified ? 1 : 0;
    const bv = b?.verified ? 1 : 0;
    if (bv !== av) return bv - av;
    const ad = a?.date ? new Date(a.date).getTime() : 0;
    const bd = b?.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });

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
          <Link href={`/${locale}`} className="hover:underline">Inicio</Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800">Testimonials</span>
        </div>
      </div>

      <section className="container-default py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Traveler Testimonials</h1>
            <div className="text-slate-600 text-sm flex flex-wrap items-center gap-2">
              {total > 0 ? (
                <>
                  <Stars rating={Math.round(avg)} className="text-amber-500" />
                  <span>{avg}/5 · {total} review{total === 1 ? "" : "s"}</span>
                </>
              ) : (
                <span>Be the first to share your experience!</span>
              )}
            </div>
          </div>
          <Link href={`/${locale}/contact`} className="btn btn-primary">Write to us</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {total === 0 ? (
              <div className="card">
                <div className="card-body">
                  <p className="text-slate-600">
                    We don’t have public testimonials yet. Meanwhile, check our{" "}
                    <Link href={`/${locale}/packages`} className="underline">tour packages</Link> or{" "}
                    <Link href={`/${locale}/contact`} className="underline">contact us</Link>—we’d love to help.
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
                  <Link href={`/${locale}/packages`} className="btn btn-ghost">Explore packages</Link>
                </div>

                {/* Trust embeds */}
                {(fbPluginUrl || TRIPADVISOR_EMBED_URL) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    {fbPluginUrl && (
                      <div className="card">
                        <div className="card-body">
                          <div className="text-sm font-semibold mb-3">Verified Facebook reviews</div>
                          <div className="rounded-lg overflow-hidden border bg-white">
                            <iframe
                              title="Facebook Reviews"
                              src={fbPluginUrl}
                              width="100%"
                              height="420"
                              style={{ border: "none", overflow: "hidden" }}
                              scrolling="no"
                              frameBorder="0"
                              loading="lazy"
                              allow="encrypted-media"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {TRIPADVISOR_EMBED_URL && (
                      <div className="card">
                        <div className="card-body">
                          <div className="text-sm font-semibold mb-3">TripAdvisor traveler ratings</div>
                          <div className="rounded-lg overflow-hidden border bg-white">
                            <iframe
                              title="TripAdvisor Reviews"
                              src={TRIPADVISOR_EMBED_URL}
                              width="100%"
                              height="420"
                              style={{ border: "none", overflow: "hidden" }}
                              scrolling="no"
                              frameBorder="0"
                              loading="lazy"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                  {approvedSorted.map((t) => (
                    <article key={t.id} className="card">
                      <div className="card-body">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
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
                            <div className="min-w-0">
                              <p className="font-medium leading-tight break-words">
                                {t.name} {t.country ? <span className="text-slate-500">· {t.country}</span> : null}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                {(t.verified || t.source) && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200">
                                    ✔ Verified traveler
                                  </span>
                                )}
                                {t.source ? (
                                  t.sourceUrl ? (
                                    <a
                                      href={t.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full bg-slate-50 text-slate-600 px-2 py-0.5 border border-slate-200 hover:text-slate-900"
                                    >
                                      {t.source}
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 text-slate-600 px-2 py-0.5 border border-slate-200">
                                      {t.source}
                                    </span>
                                  )
                                ) : null}
                                {t.date && <span>{fmtDate(t.date, locale === "en" ? "en-US" : "es-PE")}</span>}
                              </div>
                            </div>
                          </div>
                          <Stars rating={t.rating} className="text-amber-500" />
                        </div>

                        {t.title && <p className="mt-2 font-semibold">{t.title}</p>}
                        {t.message && <p className="text-slate-700 mt-1">{t.message}</p>}
                        {t.packageSlug ? (
                          <Link
                            href={`/${locale}/packages/${t.packageSlug}`}
                            className="inline-flex text-sm mt-3 text-brand-700 underline"
                          >
                            View package
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>

                {/* CTA */}
                <div className="text-center pt-6">
                  <Link href={`/${locale}/contact`} className="btn btn-primary">
                    {ui.shareCta}
                  </Link>
                </div>
              </>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="card border-2 border-[#0086C0]/20 shadow-sm">
              <div className="card-body space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0E374A]">{ui.shareTitle}</h2>
                  <p className="text-sm text-slate-600">{ui.shareSubtitle}</p>
                </div>
                <div className="rounded-xl bg-[#0086C0]/5 border border-[#0086C0]/15 p-3 text-sm text-slate-700 leading-relaxed">
                  {ui.tips}
                </div>
                <SubmitTestimonialForm locale={locale} />
              </div>
            </div>
          </aside>
        </div>

      </section>
    </main>
  );
}
