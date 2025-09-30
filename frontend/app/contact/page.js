//frontend/app/contect/page.js
import Link from "next/link";
import ContactForm from "./ContactForm"; // ✅ client component

// --- Branding & business info from env ---
const BRAND_NAME   = process.env.NEXT_PUBLIC_BRAND_NAME   || "Vicuña Adventures";
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Vicuña Adventures S.A.C.";
const CONTACT_EMAIL= process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@vicuadvent.com";
const CONTACT_PHONE= process.env.NEXT_PUBLIC_CONTACT_PHONE || "+51 989 765 432";
const WHATSAPP_LINK= process.env.NEXT_PUBLIC_WHATSAPP_LINK || "";
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL     || "";

// Helpers
const normalizeBase = (u = "") => u.replace(/\/+$/, "");
const digits = (s = "") => s.replace(/[^\d]/g, "");

// WhatsApp link
const waHref = WHATSAPP_LINK || `https://wa.me/${digits(CONTACT_PHONE)}`;

/* ------------------ Metadata ------------------ */
export const metadata = {
  title: `${BRAND_NAME} | Contact`,
  description: `Get in touch with ${COMPANY_NAME}. Plan your trip with ${BRAND_NAME}: 24/7 support, certified guides, and reliable bookings.`,
  alternates: {
    canonical: SITE_URL ? `${normalizeBase(SITE_URL)}/contact` : undefined,
  },
  openGraph: {
    title: `${BRAND_NAME} | Contact`,
    description: `Reach ${COMPANY_NAME} for authentic experiences across Peru. Plan your trip with ${BRAND_NAME}.`,
    url: SITE_URL ? `${normalizeBase(SITE_URL)}/contact` : undefined,
    type: "website",
    siteName: BRAND_NAME,
  },
  twitter: {
    card: "summary",
    title: `${BRAND_NAME} | Contact`,
    description: `Reach ${COMPANY_NAME} for authentic experiences across Peru. Plan your trip with ${BRAND_NAME}.`,
  },
};

/* ------------------ Viewport ------------------ */
export const viewport = {
  themeColor: "#31a02d", // ✅ brand primary
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* ------------------ Page ------------------ */
export default function ContactPage() {
  return (
    <main>
      <section className="container-default py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Contact info */}
        <aside className="space-y-4">
          {/* Intro */}
          <div className="card">
            <div className="card-body">
              <h1 className="text-2xl font-bold">Contact Us</h1>
              <p className="text-slate-600 mt-2">
                Have questions about a tour or need a custom itinerary?
                Write to us and we’ll respond as soon as possible.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                {COMPANY_NAME} — authentic experiences across Peru with{" "}
                <span className="font-semibold">{BRAND_NAME}</span>.
              </p>
            </div>
          </div>

          {/* Contact channels */}
          <div className="card">
            <div className="card-body space-y-2 text-sm">
              <p>
                <span className="font-medium">Email:</span>{" "}
                <a
                  className="text-brand-700 underline font-bold"
                  href={`mailto:${CONTACT_EMAIL}`}
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p>
                <span className="font-medium">Phone / WhatsApp:</span>{" "}
                <a
                  className="text-brand-700 underline font-semibold"
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {CONTACT_PHONE}
                </a>
              </p>
              <div className="flex gap-2 pt-2">
                <a
                  className="btn btn-primary"
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Message on WhatsApp
                </a>
                <a className="btn btn-ghost" href={`mailto:${CONTACT_EMAIL}`}>
                  Send Email
                </a>
              </div>
            </div>
          </div>
        </aside>

        {/* Contact form */}
        <section className="lg:col-span-2">
          <div className="card">
            <div className="card-body">
              <h2 className="text-lg font-semibold">Send Us a Message</h2>
              <p className="text-sm text-slate-600 mb-4">
                Share your travel dates, number of travelers, and interests. 
                Our team will reply with tailored proposals and next steps.
              </p>
              <ContactForm />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
