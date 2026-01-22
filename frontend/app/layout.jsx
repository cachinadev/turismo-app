// frontend/app/layout.jsx
import "./globals.css";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import WhatsAppFloat from "./components/WhatsAppFloat";
import TelegramFloat from "./components/TelegramFloat";
import { Bree_Serif, Playfair_Display } from "next/font/google";

/* ------------------------------------------------------
 *  Fonts
 * ------------------------------------------------------ */
const breeSerif = Bree_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bree-serif",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

/* ------------------------------------------------------
 *  Branding & Site Config
 * ------------------------------------------------------ */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "es";
const OG_IMAGE = process.env.NEXT_PUBLIC_OG_IMAGE || "/og.jpg";

/**
 * NOTE:
 * - "primary" used for themeColor, buttons
 * - "background" is the body bg
 */
const BRAND_COLORS = {
  primary: "#0086C0",
  background: "#F8FAFC",
  accent: "#0E374A",
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
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
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
    <html
      lang={DEFAULT_LOCALE}
      suppressHydrationWarning
      className={`${breeSerif.variable} ${playfairDisplay.variable}`}
    >
      <body
        className="min-h-screen flex flex-col antialiased font-playfair text-slate-900"
        style={{ backgroundColor: BRAND_COLORS.background }}
      >
        {/* Accessibility: Skip link */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-[9999]
                     bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-lg
                     font-bree-serif font-bold text-slate-900"
        >
          Ir al contenido principal
        </a>

        {/* Global Header */}
        <header className="relative z-50">
          <NavBar />
        </header>

        {/* Main Content */}
        <main id="content" className="flex-1 relative z-0">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="relative z-10">
          <Footer />
        </footer>

        {/* Floating Widgets */}
        <div className="relative z-[60]">
          <WhatsAppFloat />
          <TelegramFloat />
        </div>
      </body>
    </html>
  );
}
