<<<<<<< HEAD
// frontend/app/components/Footer.jsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Facebook, Instagram, Linkedin } from 'lucide-react';

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'Vicuña Adventures';
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'VICUÑA ADVENTURES S.A.C.';
const ADDRESS = process.env.NEXT_PUBLIC_ADDRESS || 'Av. Circunvalación 755 – Puno, Perú';
const RUC = process.env.NEXT_PUBLIC_RUC || '20614912228';
const PHONE = process.env.NEXT_PUBLIC_PHONE || '+51 989 765 432';
const EMAIL_SALES = process.env.NEXT_PUBLIC_EMAIL_SALES || 'contact@vicuadvent.com';
const SOCIAL_FACEBOOK = process.env.NEXT_PUBLIC_FACEBOOK_URL || '#';
const SOCIAL_INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#';
const SOCIAL_LINKEDIN = process.env.NEXT_PUBLIC_LINKEDIN_URL || '#';

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
  const buildHref = (path) => `/${locale}${path.startsWith('/') ? path : `/${path}`}`;

  const navLinks = [
    { label: t('packages') || 'Packages', href: '/packages' },
    { label: 'Puno', href: '/packages?city=Puno' },
    { label: 'Cusco', href: '/packages?city=Cusco' },
    { label: 'Arequipa', href: '/packages?city=Arequipa' }
  ];

  const supportLinks = [
    { label: t('faqs') || 'FAQs', href: '/faqs' },
    { label: t('privacy') || 'Privacy Policy', href: '/privacy' },
    { label: t('terms') || 'Terms & Conditions', href: '/terms' },
    { label: t('cookies') || 'Cookies Policy', href: '/cookies' },
    { label: t('sitemap') || 'Sitemap', href: '/sitemap' }
  ];

  return (
    <footer className="relative bg-gradient-to-br from-[#0E374A] via-[#0E374A] to-[#0a2a38] text-gray-100 overflow-hidden">
      
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-[#A3B117] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-40 w-80 h-80 bg-[#0086C0] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-40 w-80 h-80 bg-[#A3B117] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#A3B117] via-[#0086C0] to-[#A3B117] bg-clip-text text-transparent font-reguilla animate-gradient" style={{ fontFamily: "'Reguilla', cursive, serif", backgroundSize: '200% auto' }}>
                {BRAND}
              </h2>
              <div className="relative h-1 w-24 mb-6 overflow-hidden rounded-full bg-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-[#A3B117] to-[#0086C0] animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
              </div>
              <p className="text-lg leading-relaxed text-gray-300 font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                {t('about') || 'We offer authentic cultural and adventure experiences in Puno, Cusco, Arequipa and beyond.'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-4 text-[#A3B117] uppercase tracking-wider font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                {t('followUs') || 'Follow us on'}
              </p>
              <div className="flex gap-4">
                {[
                  { icon: Facebook, href: SOCIAL_FACEBOOK, color: 'from-[#A3B117] to-[#8a9614]' },
                  { icon: Instagram, href: SOCIAL_INSTAGRAM, color: 'from-[#0086C0] to-[#006a9a]' },
                  { icon: Linkedin, href: SOCIAL_LINKEDIN, color: 'from-[#A3B117] via-[#0086C0] to-[#A3B117]' }
                ].map(({ icon: Icon, href, color }, idx) => (
                  <a key={idx} href={href} className="group relative" aria-label={`Social media ${idx + 1}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${color} rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500`}></div>
                    <div className="relative w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 group-hover:scale-110 transition-all duration-300">
                      <Icon className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <Link href={buildHref('/complaints')} className="group inline-block" aria-label="Libro de Reclamaciones">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#A3B117] to-[#0086C0] rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>
                <Image src="/reclamos.jpg" alt="Libro de Reclamaciones" width={130} height={65} className="relative rounded-2xl shadow-2xl border-2 border-white/20 group-hover:border-[#A3B117] group-hover:scale-105 transition-all duration-300" priority />
              </div>
            </Link>
          </div>

          <nav className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-white relative inline-block font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
              <span className="relative z-10">{t('explore') || 'Explore'}</span>
              <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-[#A3B117] to-transparent rounded-full"></div>
            </h3>
            <ul className="space-y-3">
              {navLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={buildHref(href)} className="group flex items-center gap-3 text-gray-300 hover:text-white transition-all duration-300 font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                    <span className="w-0 h-px bg-gradient-to-r from-[#A3B117] to-[#0086C0] group-hover:w-8 transition-all duration-300 rounded-full"></span>
                    <span className="group-hover:translate-x-2 transition-transform duration-300">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-white relative inline-block font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
              <span className="relative z-10">{t('support') || 'Support'}</span>
              <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-[#0086C0] to-transparent rounded-full"></div>
            </h3>
            <ul className="space-y-3">
              {supportLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={buildHref(href)} className="group flex items-center gap-3 text-gray-300 hover:text-white transition-all duration-300 font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                    <span className="w-0 h-px bg-gradient-to-r from-[#0086C0] to-[#A3B117] group-hover:w-8 transition-all duration-300 rounded-full"></span>
                    <span className="group-hover:translate-x-2 transition-transform duration-300">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <address className="lg:col-span-3 not-italic space-y-6">
            <h3 className="text-xl font-bold text-white relative inline-block font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
              <span className="relative z-10">{t('contact') || 'Contact Us'}</span>
              <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-[#A3B117] to-transparent rounded-full"></div>
            </h3>
            
            <div className="space-y-5">
              <div className="group flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <MapPin className="w-5 h-5 text-[#0086C0] mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <p className="text-sm text-gray-300 leading-relaxed font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>{ADDRESS}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 space-y-2 text-sm">
                <p className="font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                  <span className="font-bold text-[#A3B117]">{t('business') || 'Business Name'}:</span>
                  <br />
                  <span className="text-gray-300">{COMPANY_NAME}</span>
                </p>
                <p className="font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                  <span className="font-bold text-[#A3B117]">{t('ruc') || 'RUC'}:</span> <span className="text-gray-300">{RUC}</span>
                </p>
              </div>

              <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <Phone className="w-5 h-5 text-[#0086C0] flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <a href={`tel:${PHONE.replace(/\s+/g, '')}`} className="text-sm text-gray-300 hover:text-[#A3B117] transition-colors duration-300 font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                  {PHONE}
                </a>
              </div>

              <a href={`mailto:${EMAIL_SALES}`} className="group relative inline-flex items-center gap-3 px-6 py-4 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#A3B117] to-[#0086C0]"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#0086C0] to-[#A3B117] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Mail className="w-5 h-5 relative z-10 text-white group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10 text-sm font-semibold text-white">{EMAIL_SALES}</span>
              </a>
            </div>
          </address>
        </div>
      </div>

      <div className="relative border-t border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
              © {year} <span className="font-bold bg-gradient-to-r from-[#A3B117] to-[#0086C0] bg-clip-text text-transparent">{BRAND}</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-full text-xs bg-white/5 backdrop-blur-sm border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-300 font-bree" style={{ fontFamily: "'Bree Serif', serif" }}>
                Made with ❤️ in Peru
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-gradient { animation: gradient 3s ease infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </footer>
  );
}
=======
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
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
