// frontend/app/admin/packages/[id]/brochure/page.jsx
/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { API_BASE } from "@/app/lib/config";
import { mediaUrl } from "@/app/lib/media";

/* -----------------------------
   Helpers
----------------------------- */
const money = (v, curr = "PEN", locale = "en-US") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: curr,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

async function fetchPkg(id) {
  try {
    const res = await fetch(`${API_BASE}/api/packages/id/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

/* -----------------------------
   Page
----------------------------- */
export default async function BrochurePage({ params }) {
  const { id } = params || {};
  const p = await fetchPkg(id);

  if (!p) {
    return (
      <main className="container-default py-8">
        <p className="text-slate-600">❌ Package not found.</p>
        <Link href="/admin/packages" className="btn btn-ghost mt-3">
          ← Back
        </Link>
      </main>
    );
  }

  const hero = mediaUrl(p.media?.[0]?.url) || "https://picsum.photos/1200/800";
  const gallery = (p.media || []).slice(1, 7);

  // Content
  const overview = p.description || "";
  const highlights = Array.isArray(p.highlights) ? p.highlights : [];
  const includes = Array.isArray(p.includes) ? p.includes : [];
  const excludes = Array.isArray(p.excludes) ? p.excludes : [];
  const langs = Array.isArray(p.languages) ? p.languages.join(", ") : "—";
  const priceNow = Number(p.effectivePrice ?? p.price);
  const showPromo = p.isPromoActive && p.effectivePrice != null;
  const discountPct = p.discountPercent || 0;

  return (
    <main className="mx-auto max-w-5xl bg-white shadow print:shadow-none">
      <style>{`
        @page { size: A4; margin: 16mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* Top bar (hidden in print) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b">
        <div className="container-default py-2 flex items-center justify-between">
          <Link href="/admin/packages" className="text-sm text-slate-600 hover:underline">
            ← Back to Admin
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/packages/${p.slug}`}
              className="btn btn-ghost"
              target="_blank"
            >
              View public ↗
            </Link>
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Brochure content */}
      <article className="p-6 md:p-10 print:p-0">
        {/* Cover */}
        <section className="relative rounded-xl overflow-hidden border">
          <img
            src={hero}
            alt={p.title || "Package cover"}
            className="w-full h-80 object-cover"
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
            <h1 className="text-3xl font-extrabold drop-shadow">
              {p.title || "Untitled Package"}
            </h1>
            <p className="mt-1 text-sm opacity-90">
              {p.city || "Peru"} • {p.durationHours || 8} h • Languages: {langs}
            </p>
            <div className="mt-2">
              {showPromo ? (
                <div className="inline-flex items-center gap-2">
                  <span className="line-through opacity-80">
                    {money(p.price, p.currency)}
                  </span>
                  <span className="text-2xl font-bold">
                    {money(priceNow, p.currency)}
                  </span>
                  {discountPct > 0 && (
                    <span className="ml-1 text-xs bg-amber-500 px-2 py-0.5 rounded">
                      -{discountPct}%
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-2xl font-bold">
                  {money(priceNow, p.currency)}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="mt-8 grid md:grid-cols-3 gap-8">
          {/* Left: main text */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="text-slate-700 mt-2 whitespace-pre-wrap">{overview}</p>

            {!!highlights.length && (
              <>
                <h3 className="text-lg font-semibold mt-6">Highlights</h3>
                <ul className="mt-2 list-disc pl-5 text-slate-700 space-y-1">
                  {highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </>
            )}

            {!!gallery.length && (
              <>
                <h3 className="text-lg font-semibold mt-6">Gallery</h3>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gallery.map((m, i) => (
                    <img
                      key={i}
                      src={mediaUrl(m.url)}
                      alt={`Gallery image ${i + 1}`}
                      className="w-full h-32 object-cover rounded border"
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: fact card */}
          <aside className="border rounded-xl p-4 h-fit bg-slate-50">
            <h3 className="text-lg font-semibold">At a glance</h3>
            <dl className="mt-2 text-sm text-slate-700 space-y-1">
              <div className="flex justify-between">
                <dt>City</dt>
                <dd className="font-medium">{p.city || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Duration</dt>
                <dd className="font-medium">{p.durationHours || 8} h</dd>
              </div>
              <div className="flex justify-between">
                <dt>Languages</dt>
                <dd className="font-medium">{langs}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Category</dt>
                <dd className="font-medium">{p.category || "Tour"}</dd>
              </div>
              {p.location?.lat != null && p.location?.lng != null && (
                <div className="pt-2">
                  <div className="text-slate-500">Meeting area (map):</div>
                  <div className="font-mono text-[12px]">
                    {p.location.lat}, {p.location.lng}
                  </div>
                </div>
              )}
            </dl>

            {includes?.length > 0 && (
              <>
                <h4 className="text-sm font-semibold mt-4">Includes</h4>
                <ul className="text-sm list-disc pl-5 mt-1 space-y-1">
                  {includes.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </>
            )}

            {excludes?.length > 0 && (
              <>
                <h4 className="text-sm font-semibold mt-3">Doesn’t include</h4>
                <ul className="text-sm list-disc pl-5 mt-1 space-y-1">
                  {excludes.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t pt-4 text-xs text-slate-600">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="font-semibold">
                {process.env.NEXT_PUBLIC_COMPANY_NAME || "Vicuña Adventures"}
              </div>
              <div>{process.env.NEXT_PUBLIC_ADDRESS || "Puno, Perú"}</div>
            </div>
            <div className="md:text-right">
              <div>{process.env.NEXT_PUBLIC_PHONE || "+51 ..."}</div>
              <div>{process.env.NEXT_PUBLIC_EMAIL_SALES || "sales@example.com"}</div>
              <div className="opacity-80">
                {process.env.NEXT_PUBLIC_BRAND_NAME || "Brand"}
              </div>
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}
