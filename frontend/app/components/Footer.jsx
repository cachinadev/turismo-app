// frontend/app/components/Footer.jsx
import Link from "next/link";

// Customize via NEXT_PUBLIC_* env vars
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME || "Vicuña Adventures S.A.C.";
const ADDRESS =
  process.env.NEXT_PUBLIC_ADDRESS || "Av. Circunvalación 755 – Puno, Peru";
const RUC = process.env.NEXT_PUBLIC_RUC || "21010101010";
const PHONE = process.env.NEXT_PUBLIC_PHONE || "+51 989 765 432";
const EMAIL_SALES =
  process.env.NEXT_PUBLIC_EMAIL_SALES || "contact@vicuadvent.com";
const EMAIL_247 =
  process.env.NEXT_PUBLIC_EMAIL_247 || "24-7@vicuadvent.com";

const SOCIAL_FACEBOOK = process.env.NEXT_PUBLIC_FACEBOOK_URL || "#";
const SOCIAL_INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#";
const SOCIAL_LINKEDIN = process.env.NEXT_PUBLIC_LINKEDIN_URL || "#";

// Branding colors (synced with NavBar)
const BRAND_COLORS = {
  primary: "#118a0dff", // dark green
  background: "#ffffff", // white surface for contrast
  accent: "#FCFD97",     // yellow
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer role="contentinfo" className="mt-auto">
      {/* Middle section (white surface) */}
      <div
        className="border-t shadow-inner"
        style={{ backgroundColor: BRAND_COLORS.background }}
      >
        <div className="container-default py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-sm">
            {/* Brand / About */}
            <div className="md:col-span-4">
              <p className="text-xl font-semibold text-slate-900">{BRAND}</p>
              <p className="text-slate-700 mt-2">
                Authentic experiences on the Altiplano and beyond.
              </p>

              {/* Social */}
              <div className="mt-4">
                <p className="font-semibold mb-2 text-slate-900">Follow us</p>
                <div className="flex items-center gap-4 text-slate-700">
                  <a
                    href={SOCIAL_FACEBOOK}
                    aria-label="Facebook"
                    target={SOCIAL_FACEBOOK.startsWith("http") ? "_blank" : undefined}
                    rel={SOCIAL_FACEBOOK.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="hover:text-green-700"
                  >
                    Facebook
                  </a>
                  <a
                    href={SOCIAL_INSTAGRAM}
                    aria-label="Instagram"
                    target={SOCIAL_INSTAGRAM.startsWith("http") ? "_blank" : undefined}
                    rel={SOCIAL_INSTAGRAM.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="hover:text-green-700"
                  >
                    Instagram
                  </a>
                  <a
                    href={SOCIAL_LINKEDIN}
                    aria-label="LinkedIn"
                    target={SOCIAL_LINKEDIN.startsWith("http") ? "_blank" : undefined}
                    rel={SOCIAL_LINKEDIN.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="hover:text-green-700"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>

            {/* Explore */}
            <nav className="md:col-span-3" aria-label="Explore">
              <p className="font-semibold mb-2 text-slate-900">Explore</p>
              <ul className="space-y-1 text-slate-700">
                <li><Link href="/packages" className="hover:text-green-700">Packages</Link></li>
                <li><Link href="/packages?city=Puno" className="hover:text-green-700">Puno</Link></li>
                <li><Link href="/packages?city=Cusco" className="hover:text-green-700">Cusco</Link></li>
                <li><Link href="/packages?city=Arequipa" className="hover:text-green-700">Arequipa</Link></li>
              </ul>
            </nav>

            {/* Support */}
            <nav className="md:col-span-3" aria-label="Support">
              <p className="font-semibold mb-2 text-slate-900">Support</p>
              <ul className="space-y-1 text-slate-700">
                <li><Link href="#" className="hover:text-green-700">FAQs</Link></li>
                <li><Link href="#" className="hover:text-green-700">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-green-700">Terms & Conditions</Link></li>
                <li><Link href="#" className="hover:text-green-700">Complaints Book</Link></li>
              </ul>
            </nav>

            {/* Contact */}
            <div className="md:col-span-2">
              <p className="font-semibold mb-2 text-slate-900">Contact us</p>
              <address className="not-italic text-slate-700 space-y-1">
                <p>{ADDRESS}</p>
                <p>
                  <span className="font-semibold">Business name:</span> {COMPANY_NAME}
                </p>
                <p>
                  <span className="font-semibold">Tax ID (RUC):</span> {RUC}
                </p>
                <p>
                  Tel:{" "}
                  <a
                    className="hover:text-green-700"
                    href={`tel:${PHONE.replace(/\s+/g, "")}`}
                  >
                    {PHONE}
                  </a>
                </p>
                <p>
                  {/* Highlighted main email */}
                  <a
                    className="font-bold text-white px-2 py-1 rounded"
                    style={{ backgroundColor: BRAND_COLORS.primary }}
                    href={`mailto:${EMAIL_SALES}`}
                  >
                    {EMAIL_SALES}
                  </a>
                </p>
                <p>
                  <a
                    className="hover:text-green-700"
                    href={`mailto:${EMAIL_247}`}
                  >
                    {EMAIL_247}
                  </a>
                </p>
              </address>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar (brand strip) */}
      <div style={{ backgroundColor: BRAND_COLORS.primary }}>
        <div className="container-default py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white">
          <p>© {year} {BRAND}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:underline">Privacy</Link>
            <Link href="#" className="hover:underline">Terms</Link>
            <Link href="#" className="hover:underline">Cookies</Link>
            <a href="#" className="hover:underline">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
