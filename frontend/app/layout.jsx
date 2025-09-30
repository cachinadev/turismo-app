//frontend/app/layout.jsx
import "./globals.css";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import WhatsAppFloat from "./components/WhatsAppFloat";
import { Plus_Jakarta_Sans } from "next/font/google";

// --- Fonts ---
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

// --- Site/brand config ---
const SITE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
  "http://localhost:3000";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "es";
const OG_IMAGE = process.env.NEXT_PUBLIC_OG_IMAGE || "/og.jpg";

// --- Branding palette (sync with globals.css) ---
const BRAND_COLORS = {
  primary: "#31a02dff",     // mint green
  background: "#f5f5ebff",  // soft beige
  accent: "#dcddb0ff",      // muted yellow
};

/* ------------------ Metadata ------------------ */
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND,
    template: `%s | ${BRAND}`,
  },
  description: `${BRAND}: authentic experiences across Puno, Cusco, Arequipa, and all of Peru. Reliable bookings, certified guides, 24/7 support.`,
  alternates: {
    canonical: "/",
    languages: {
      es: "/es",
      en: "/en",
      fr: "/fr",
      pt: "/pt",
      ru: "/ru",
    },
  },
  openGraph: {
    type: "website",
    siteName: BRAND,
    title: BRAND,
    description: `Unforgettable experiences in Peru with ${BRAND}: 24/7 support, local operators, and secure bookings.`,
    url: SITE_URL,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND} — Peru travel`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND,
    description: `Unforgettable experiences in Peru with ${BRAND}: 24/7 support, local operators, and secure bookings.`,
    images: [OG_IMAGE],
  },
  icons: {
    icon: "/favicon.png",      // ✅ favicon in public/
    shortcut: "/favicon.png",  // ✅ legacy shortcut
    apple: "/favicon.png",     // ✅ iOS fallback
  },
};

/* ------------------ Viewport ------------------ */
export const viewport = {
  themeColor: BRAND_COLORS.primary,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/* ------------------ Layout ------------------ */
export default function RootLayout({ children }) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <body
        className={`min-h-screen flex flex-col antialiased ${plusJakarta.variable}`}
        style={{ backgroundColor: BRAND_COLORS.background }}
      >
        {/* Skip link for accessibility */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white border rounded px-3 py-2 shadow"
        >
          Skip to content
        </a>

        {/* Global header */}
        <NavBar />

        {/* Page content */}
        <main id="content" className="flex-1">
          {children}
        </main>

        {/* Global footer */}
        <Footer />

        {/* Floating WhatsApp chat */}
        <WhatsAppFloat />
      </body>
    </html>
  );
}
