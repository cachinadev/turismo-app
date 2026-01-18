<<<<<<< HEAD
//frontend/app/layout.jsx
import "./globals.css";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import WhatsAppFloat from "./components/WhatsAppFloat";
import { Bree_Serif } from 'next/font/google'
import { Playfair_Display } from 'next/font/google'

/* ------------------------------------------------------
 *  Fonts
 * ------------------------------------------------------ */
// Bree Serif para títulos
const breeSerif = Bree_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bree-serif',
  display: 'swap',
});

// Playfair Display como alternativa a Tequilla (similar estilo serif elegante)
const playfairDisplay = Playfair_Display({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

/* ------------------------------------------------------
 *  Branding & Site Config
 * ------------------------------------------------------ */
const SITE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
  "http://localhost:3000";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "es";
const OG_IMAGE = process.env.NEXT_PUBLIC_OG_IMAGE || "/og.jpg";

const BRAND_COLORS = {
  primary: "#A3B117", // mint green
  background: "#f5f5ebff", // soft beige
  accent: "#0E374A", // muted yellow
};

/* ------------------------------------------------------
 *  Metadata
 * ------------------------------------------------------ */
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
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

/* ------------------------------------------------------
 * 📱 Viewport
 * ------------------------------------------------------ */
export const viewport = {
  themeColor: BRAND_COLORS.primary,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/* ------------------------------------------------------
 * 🧱 Root Layout (Global Shell)
 * ------------------------------------------------------ */
export default function RootLayout({ children }) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning className={`${breeSerif.variable} ${playfairDisplay.variable}`}>
      <body
        className="min-h-screen flex flex-col antialiased font-playfair"
        style={{ backgroundColor: BRAND_COLORS.background }}
      >
        {/* 🧭 Accessibility: Skip link for keyboard users */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white border rounded px-3 py-2 shadow font-bree-serif font-bold"
        >
          Ir al contenido principal
        </a>

        {/* --- Global Header --- */}
        <header className="relative z-40">
          <NavBar />
        </header>

        {/* --- Main Content --- */}
        <main id="content" className="flex-1 relative z-0">
          {children}
        </main>

        {/* --- Global Footer --- */}
        <Footer />

        {/* --- Floating Widgets --- */}
        <WhatsAppFloat />
      </body>
    </html>
  );
=======
//frontend/app/layout.jsx
import "./globals.css";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import WhatsAppFloat from "./components/WhatsAppFloat";
import { Plus_Jakarta_Sans } from "next/font/google";

/* ------------------------------------------------------
 *  Fonts
 * ------------------------------------------------------ */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

/* ------------------------------------------------------
 *  Branding & Site Config
 * ------------------------------------------------------ */
const SITE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
  "http://localhost:3000";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "es";
const OG_IMAGE = process.env.NEXT_PUBLIC_OG_IMAGE || "/og.jpg";

const BRAND_COLORS = {
  primary: "#31a02dff", // mint green
  background: "#f5f5ebff", // soft beige
  accent: "#dcddb0ff", // muted yellow
};

/* ------------------------------------------------------
 *  Metadata
 * ------------------------------------------------------ */
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
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

/* ------------------------------------------------------
 * 📱 Viewport
 * ------------------------------------------------------ */
export const viewport = {
  themeColor: BRAND_COLORS.primary,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/* ------------------------------------------------------
 * 🧱 Root Layout (Global Shell)
 * ------------------------------------------------------ */
export default function RootLayout({ children }) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <body
        className={`min-h-screen flex flex-col antialiased ${plusJakarta.variable}`}
        style={{ backgroundColor: BRAND_COLORS.background }}
      >
        {/* 🧭 Accessibility: Skip link for keyboard users */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white border rounded px-3 py-2 shadow"
        >
          Ir al contenido principal
        </a>

        {/* --- Global Header --- */}
        <header className="relative z-40">
          <NavBar />
        </header>

        {/* --- Main Content --- */}
        <main id="content" className="flex-1 relative z-0">
          {children}
        </main>

        {/* --- Global Footer --- */}
        <Footer />

        {/* --- Floating Widgets --- */}
        <WhatsAppFloat />
      </body>
    </html>
  );
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
}