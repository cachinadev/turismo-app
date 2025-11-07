// frontend/app/components/Footer.jsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'Vicuña Adventures';
const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME || 'VICUÑA ADVENTURES S.A.C.';
const ADDRESS =
  process.env.NEXT_PUBLIC_ADDRESS || 'Av. Circunvalación 755 – Puno, Perú';
const RUC = process.env.NEXT_PUBLIC_RUC || '20614912228';
const PHONE = process.env.NEXT_PUBLIC_PHONE || '+51 989 765 432';
const EMAIL_SALES =
  process.env.NEXT_PUBLIC_EMAIL_SALES || 'contact@vicuadvent.com';

const SOCIAL_FACEBOOK = process.env.NEXT_PUBLIC_FACEBOOK_URL || '#';
const SOCIAL_INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#';
const SOCIAL_LINKEDIN = process.env.NEXT_PUBLIC_LINKEDIN_URL || '#';

const BRAND_COLORS = {
  dark: '#111111',
  gold: '#F4B400',
  lightGold: '#FFD54F',
  gray: '#d1d5db',
};

const LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];
const DEFAULT_LOCALE = 'es';

function useLocalTranslations(locale) {
  const [messages, setMessages] = useState({});
  useEffect(() => {
    import(`@/messages/${locale}.json`)
      .then((m) => setMessages(m.Footer || {}))
      .catch(() => setMessages({}));
  }, [locale]);
  return (key) => messages[key] || key;
}

export default function Footer() {
  const pathname = usePathname() || '/';
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    const segment = pathname.split('/')[1] || '';
    setLocale(LOCALES.includes(segment) ? segment : DEFAULT_LOCALE);
  }, [pathname]);

  const t = useLocalTranslations(locale);
  const year = new Date().getFullYear();
  const buildHref = (path) =>
    `/${locale}${path.startsWith('/') ? path : `/${path}`}`;

  return (
    <footer role="contentinfo" className="mt-auto text-sm">
      <div
        className="text-gray-200"
        style={{ backgroundColor: BRAND_COLORS.dark }}
      >
        <div className="container-default px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Brand */}
            <div className="md:col-span-4">
              <h2
                className="text-2xl font-bold mb-3"
                style={{ color: BRAND_COLORS.gold }}
              >
                {BRAND}
              </h2>
              <p className="leading-relaxed text-gray-300">
                {t('about') ||
                  'Ofrecemos experiencias culturales y de aventura auténticas en Puno, Cusco, Arequipa y más allá.'}
              </p>

              <div className="mt-6">
                <p className="font-semibold mb-2">{t('followUs') || 'Síguenos'}</p>
                <div className="flex gap-5 text-gray-300">
                  <a href={SOCIAL_FACEBOOK} className="hover:text-yellow-400">
                    Facebook
                  </a>
                  <a href={SOCIAL_INSTAGRAM} className="hover:text-yellow-400">
                    Instagram
                  </a>
                  <a href={SOCIAL_LINKEDIN} className="hover:text-yellow-400">
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>

            {/* Explore */}
            <nav className="md:col-span-3">
              <h3
                className="text-base font-semibold mb-3"
                style={{ color: BRAND_COLORS.gold }}
              >
                {t('explore') || 'Explora'}
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <Link href={buildHref('/packages')} className="hover:text-yellow-400">
                    {t('packages') || 'Paquetes'}
                  </Link>
                </li>
                <li>
                  <Link href={buildHref('/packages?city=Puno')} className="hover:text-yellow-400">
                    Puno
                  </Link>
                </li>
                <li>
                  <Link href={buildHref('/packages?city=Cusco')} className="hover:text-yellow-400">
                    Cusco
                  </Link>
                </li>
                <li>
                  <Link href={buildHref('/packages?city=Arequipa')} className="hover:text-yellow-400">
                    Arequipa
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Support + Libro de Reclamaciones */}
            <div className="md:col-span-3">
              <h3
                className="text-base font-semibold mb-3"
                style={{ color: BRAND_COLORS.gold }}
              >
                {t('support') || 'Soporte'}
              </h3>
              <ul className="space-y-2 text-gray-300 mb-5">
                <li>
                  <Link href={buildHref('/faqs')} className="hover:text-yellow-400">
                    {t('faqs') || 'Preguntas Frecuentes'}
                  </Link>
                </li>
                <li>
                  <Link href={buildHref('/privacy')} className="hover:text-yellow-400">
                    {t('privacy') || 'Política de Privacidad'}
                  </Link>
                </li>
                <li>
                  <Link href={buildHref('/terms')} className="hover:text-yellow-400">
                    {t('terms') || 'Términos y Condiciones'}
                  </Link>
                </li>
                <li>
                  <Link href={buildHref('/cookies')} className="hover:text-yellow-400">
                    {t('cookies') || 'Política de Cookies'}
                  </Link>
                </li>
                <li>
                  <Link href={buildHref('/sitemap')} className="hover:text-yellow-400">
                    {t('sitemap') || 'Mapa del sitio'}
                  </Link>
                </li>
              </ul>

              {/* Libro de Reclamaciones inline here */}
              <Link
                href={buildHref('/complaints')}
                className="inline-block hover:opacity-90 transition-transform transform hover:scale-105"
                aria-label="Libro de Reclamaciones"
              >
                <Image
                  src="/reclamos.jpg"
                  alt="Libro de Reclamaciones"
                  width={110}
                  height={55}
                  className="rounded-md shadow-md border border-yellow-300"
                  priority
                />
              </Link>
            </div>

            {/* Contact */}
            <div className="md:col-span-2">
              <h3
                className="text-base font-semibold mb-3"
                style={{ color: BRAND_COLORS.gold }}
              >
                {t('contact') || 'Contáctanos'}
              </h3>
              <address className="not-italic text-gray-300 space-y-1 leading-relaxed">
                <p>{ADDRESS}</p>
                <p>
                  <span className="font-semibold">{t('business') || 'Razón Social'}:</span>{' '}
                  {COMPANY_NAME}
                </p>
                <p>
                  <span className="font-semibold">{t('ruc') || 'RUC'}:</span> {RUC}
                </p>
                <p>
                  Tel:{' '}
                  <a
                    href={`tel:${PHONE.replace(/\s+/g, '')}`}
                    className="hover:text-yellow-400"
                  >
                    {PHONE}
                  </a>
                </p>
                <p className="pt-2">
                  <a
                    href={`mailto:${EMAIL_SALES}`}
                    className="inline-block font-semibold px-3 py-1.5 rounded-md shadow-sm hover:opacity-90 transition"
                    style={{
                      backgroundColor: BRAND_COLORS.gold,
                      color: '#111',
                    }}
                  >
                    {EMAIL_SALES}
                  </a>
                </p>
              </address>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="text-xs"
        style={{
          backgroundColor: BRAND_COLORS.lightGold,
          color: '#111',
        }}
      >
        <div className="container-default py-3 text-center font-medium">
          © {year} {BRAND}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
