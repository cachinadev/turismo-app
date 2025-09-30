// frontend/app/about/page.js
import Link from "next/link";
import { SITE_URL } from "@/app/lib/config";

const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const ADDRESS = process.env.NEXT_PUBLIC_ADDRESS || "Av. Circunvalación 755, Puno, Peru";
const PHONE   = process.env.NEXT_PUBLIC_PHONE || "+51 982 397 386";
const EMAIL   = process.env.NEXT_PUBLIC_EMAIL_SALES || "contact@vicuadvent.com";

const FB = process.env.NEXT_PUBLIC_FACEBOOK_URL  || "";
const IG = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "";
const LI = process.env.NEXT_PUBLIC_LINKEDIN_URL  || "";

const LOCALES = ["es", "en"]; // keep in sync with next.config.js
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "es";

const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const base = normalizeBase(SITE_URL || "http://localhost:3000");
const canonical = `${base}/about`;

// Helpers
function toTelHref(n = "") {
  // keep + and digits only
  const digits = String(n).replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}
function sameAsList() {
  return [FB, IG, LI].filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
}
function parseAddress(addr = "") {
  // very lightweight parse; customize if you have structured parts
  const country = /peru/i.test(addr) ? "PE" : undefined;
  return {
    "@type": "PostalAddress",
    streetAddress: addr,
    addressCountry: country,
  };
}

/* ---------- SEO ---------- */
export const viewport = {
  title: `${BRAND} | About us`,
  description:
    `${BRAND} is a local operator with certified tour guides, drivers, translators, and cooks. ` +
    `We work with partner hotels and native communities across Peru.`,
  openGraph: {
    title: `${BRAND} | About us`,
    description:
      `${BRAND}: responsible tourism with local alliances, safety, and 24/7 support.`,
    url: canonical,
    type: "website",
    siteName: BRAND,
  },
  alternates: {
    canonical,
    languages: {
      es: `${base}/es/about`,
      en: `${base}/en/about`,
    },
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND} | About us`,
    description: `${BRAND}: local operator with an expert team and agreements throughout Peru.`,
  },
};

export default function AboutPage() {
  // JSON-LD (Organization)
  const ld = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: base,
    description:
      `${BRAND} operates in Peru with a team of tour guides, drivers, translators, and cooks, ` +
      `maintaining agreements with hotels and partnering with native communities.`,
    address: parseAddress(ADDRESS),
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: PHONE,
        email: EMAIL,
        contactType: "customer support",
        areaServed: "PE",
        availableLanguage: LOCALES,
      },
    ],
    numberOfEmployees: { "@type": "QuantitativeValue", minValue: 8 },
    sameAs: sameAsList(),
  };

  return (
    <main>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      {/* Breadcrumbs */}
      <div className="border-b border-slate-100">
        <div className="container-default py-3 text-sm text-slate-600">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800">About us</span>
        </div>
      </div>

      <section className="container-default py-10 space-y-8">
        {/* Hero / Intro */}
        <header className="text-center max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            About {BRAND}
          </span>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold">Local operator, real experiences</h1>
          <p className="mt-3 text-slate-600">
            We’re a field-based team designing and operating authentic trips in Puno, Cusco, Arequipa, and throughout Peru.
            We work hand-in-hand with native communities and a network of partner hotels so you experience each destination safely,
            comfortably, and with respect for local culture.
          </p>
        </header>

        {/* Key numbers */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Tour guides",  value: "4+",  note: "Certified & local" },
            { title: "Drivers",      value: "2",   note: "Safe routes" },
            { title: "Translators",  value: "Team",note: "ES · EN (and more)" },
            { title: "Cooks",        value: "Team",note: "Local menus" },
          ].map((k, i) => (
            <div key={i} className="card text-center">
              <div className="card-body">
                <div className="text-2xl font-extrabold">{k.value}</div>
                <div className="font-semibold">{k.title}</div>
                <div className="text-xs text-slate-500">{k.note}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Partnerships & agreements */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article className="card">
            <div className="card-body">
              <h2 className="text-xl font-semibold">Hotel partnerships</h2>
              <p className="text-slate-600 mt-2">
                We maintain agreements with multiple hotels and lodges in key cities and rural areas.
                This lets us secure competitive rates, high-season availability, and consistent quality standards.
              </p>
              <ul className="list-disc pl-5 text-slate-700 mt-3 space-y-1">
                <li>Curated selection by location, service, and safety</li>
                <li>Options for different budgets</li>
                <li>Direct coordination for changes and special needs</li>
              </ul>
            </div>
          </article>

          <article className="card">
            <div className="card-body">
              <h2 className="text-xl font-semibold">Alliances with native communities</h2>
              <p className="text-slate-600 mt-2">
                We collaborate with native communities to design experiences that respect their rhythm, traditions, and local economy.
                Your visit creates direct impact and fosters responsible tourism.
              </p>
              <ul className="list-disc pl-5 text-slate-700 mt-3 space-y-1">
                <li>Authentic experiences hosted by local leaders</li>
                <li>Cultural respect protocols and best practices</li>
                <li>Reinvestment in community projects and crafts</li>
              </ul>
            </div>
          </article>
        </section>

        {/* Values */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: "Safety first",     d: "Licensed vehicles, trained staff, and clear protocols." },
            { t: "Culture & respect",d: "We honor heritage, customs, and community practices." },
            { t: "Sustainability",   d: "We promote low-impact practices and local economies." },
          ].map((v, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <p className="font-semibold">{v.t}</p>
                <p className="text-slate-600 mt-1">{v.d}</p>
              </div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="rounded-xl bg-slate-50 border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Want to plan your trip with {BRAND}?</p>
            <p className="text-sm text-slate-600">
              Write to us:{" "}
              <a className="underline" href={`mailto:${EMAIL}`} aria-label={`Email ${EMAIL}`}>
                {EMAIL}
              </a>{" "}
              · Tel:{" "}
              <a className="underline" href={toTelHref(PHONE)} aria-label={`Call ${PHONE}`}>
                {PHONE}
              </a>
              <br />
              Visit us: <span className="text-slate-700">{ADDRESS}</span>
            </p>
          </div>
          <Link href="/contact" className="btn btn-primary">Contact us</Link>
        </section>
      </section>
    </main>
  );
}
