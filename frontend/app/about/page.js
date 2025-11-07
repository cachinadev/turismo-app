// frontend/app/about/page.js
import Link from "next/link";
import { SITE_URL } from "@/app/lib/config";

/* ------------------------------------------------------
 * 🔧 Branding & Contact
 * ------------------------------------------------------ */
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const ADDRESS = process.env.NEXT_PUBLIC_ADDRESS || "Av. Circunvalación 755, Puno, Peru";
const PHONE   = process.env.NEXT_PUBLIC_PHONE || "+51 982 397 386";
const EMAIL   = process.env.NEXT_PUBLIC_EMAIL_SALES || "contact@vicuadvent.com";

const FB = process.env.NEXT_PUBLIC_FACEBOOK_URL  || "";
const IG = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "";
const LI = process.env.NEXT_PUBLIC_LINKEDIN_URL  || "";

const LOCALES = ["es", "en"];
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "es";

const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const base = normalizeBase(SITE_URL || "http://localhost:3000");
const canonical = `${base}/about`;

/* ------------------------------------------------------
 * 🧭 Helpers
 * ------------------------------------------------------ */
function toTelHref(n = "") {
  return `tel:${String(n).replace(/[^\d+]/g, "")}`;
}

function sameAsList() {
  return [FB, IG, LI].filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
}

function parseAddress(addr = "") {
  const country = /peru/i.test(addr) ? "PE" : undefined;
  return {
    "@type": "PostalAddress",
    streetAddress: addr,
    addressCountry: country,
  };
}

/* ------------------------------------------------------
 * 🌐 Metadata
 * ------------------------------------------------------ */
export const viewport = {
  title: `${BRAND} | About us`,
  description:
    `${BRAND} is a local operator with certified tour guides, drivers, translators, and cooks. We partner with hotels and native communities across Peru.`,
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
};

/* ------------------------------------------------------
 * 🏕️ Page Component
 * ------------------------------------------------------ */
export default function AboutPage() {
  // Structured data
  const ld = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: base,
    description:
      `${BRAND} operates in Peru with a team of certified tour guides, drivers, translators, and cooks, maintaining agreements with hotels and partnering with native communities.`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      {/* Breadcrumbs */}
      <div className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="container-default py-3 text-sm text-slate-600">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800 font-medium">About us</span>
        </div>
      </div>

      {/* Hero / Intro */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-slate-50 to-white" />
        <div className="container-default relative py-14 text-center max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase bg-green-100 text-green-800 px-3 py-1 rounded-full">
            About {BRAND}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900">
            Local operator, real experiences
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            We’re a field-based team designing and operating authentic trips in Puno, Cusco,
            Arequipa, and throughout Peru. We work hand-in-hand with native communities and a network
            of partner hotels so you experience each destination safely, comfortably, and with respect
            for local culture.
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <section className="container-default py-12 space-y-12">
        {/* Key numbers */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: "Tour guides", value: "4+", note: "Certified & local" },
            { title: "Drivers", value: "2", note: "Safe routes" },
            { title: "Translators", value: "Team", note: "ES · EN (and more)" },
            { title: "Cooks", value: "Team", note: "Local menus" },
          ].map((k, i) => (
            <div
              key={i}
              className="card text-center hover:shadow-lg transition-shadow duration-200"
            >
              <div className="card-body">
                <div className="text-3xl font-extrabold text-green-700">{k.value}</div>
                <div className="font-semibold text-slate-800">{k.title}</div>
                <div className="text-xs text-slate-500">{k.note}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Partnerships & agreements */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <article className="card hover:shadow-md transition-shadow duration-200">
            <div className="card-body">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                🏨 Hotel partnerships
              </h2>
              <p className="text-slate-600 mt-2 leading-relaxed">
                We maintain agreements with multiple hotels and lodges in key cities and rural areas,
                ensuring high-season availability, competitive rates, and consistent quality.
              </p>
              <ul className="list-disc pl-5 text-slate-700 mt-3 space-y-1">
                <li>Curated selection by location, service, and safety</li>
                <li>Options for different budgets</li>
                <li>Direct coordination for changes and special needs</li>
              </ul>
            </div>
          </article>

          <article className="card hover:shadow-md transition-shadow duration-200">
            <div className="card-body">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                🪶 Native community alliances
              </h2>
              <p className="text-slate-600 mt-2 leading-relaxed">
                We collaborate with native communities to design experiences that respect their
                rhythm, traditions, and local economy. Your visit creates direct impact and fosters
                responsible tourism.
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
            { t: "Safety first", d: "Licensed vehicles, trained staff, and clear protocols." },
            { t: "Culture & respect", d: "We honor heritage, customs, and community practices." },
            { t: "Sustainability", d: "We promote low-impact practices and local economies." },
          ].map((v, i) => (
            <div
              key={i}
              className="rounded-xl border p-5 bg-white hover:bg-green-50 transition-colors duration-200"
            >
              <p className="font-semibold text-slate-900">{v.t}</p>
              <p className="text-slate-600 mt-1 text-sm leading-relaxed">{v.d}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <p className="font-semibold text-lg">Plan your trip with {BRAND}</p>
            <p className="text-sm opacity-90">
              Write to us:&nbsp;
              <a className="underline hover:text-white/80" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>{" "}
              · Tel:&nbsp;
              <a className="underline hover:text-white/80" href={toTelHref(PHONE)}>
                {PHONE}
              </a>
              <br />
              Visit us: <span className="font-medium">{ADDRESS}</span>
            </p>
          </div>
          <Link
            href="/contact"
            className="bg-white text-green-700 font-semibold px-5 py-2.5 rounded-md shadow hover:bg-green-50 transition"
          >
            ✉️ Contact us
          </Link>
        </section>
      </section>
    </main>
  );
}
