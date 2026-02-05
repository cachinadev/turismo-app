// frontend/app/components/Footer.jsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Building2,
  BadgeCheck,
  Map,
  Music2, // TikTok icon
} from 'lucide-react';

// ============================================================================
// ENV
// ============================================================================

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'Vicuña Adventures';
const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME ||
  process.env.NEXT_PUBLIC_LEGAL_NAME ||
  'VICUÑA ADVENTURES S.A.C.';
const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME || COMPANY_NAME;

const RUC = process.env.NEXT_PUBLIC_RUC || '20614912228';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@vicuadvent.com';

// Phones
const PHONE_OFFICIAL =
  process.env.NEXT_PUBLIC_CONTACT_PHONE_OFFICIAL ||
  process.env.NEXT_PUBLIC_CONTACT_PHONE ||
  '+51953858267';
const PHONE_SECONDARY = process.env.NEXT_PUBLIC_CONTACT_PHONE_SECONDARY || '+51982397386';
const PHONE_SUPPORT = process.env.NEXT_PUBLIC_CONTACT_PHONE_SUPPORT || '+51999069352';

// WhatsApp (official)
const WHATSAPP_OFFICIAL =
  process.env.NEXT_PUBLIC_WHATSAPP_OFFICIAL ||
  process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT ||
  PHONE_OFFICIAL;

// Address (text)
const ADDRESS_LINE =
  process.env.NEXT_PUBLIC_ADDRESS_LINE ||
  process.env.NEXT_PUBLIC_ADDRESS ||
  'CAL.LEONCIO PRADO NRO. 194 URB. CHACARILLA DEL LAGO 2';
const ADDRESS_CITY = process.env.NEXT_PUBLIC_ADDRESS_CITY || 'PUNO';
const ADDRESS_REGION = process.env.NEXT_PUBLIC_ADDRESS_REGION || 'PUNO';
const ADDRESS_COUNTRY = process.env.NEXT_PUBLIC_ADDRESS_COUNTRY || 'PERU';
const ZIP_CODE = process.env.NEXT_PUBLIC_ZIP_CODE || '21001';

// ✅ Fixed Maps URL (precise location)
const GOOGLE_MAPS_URL =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL ||
  'https://www.google.com/maps/search/CAL.LEONCIO+PRADO+NRO.+194+URB.+CHACARILLA+DEL+LAGO+2+%7C+PUNO+-+PUNO+-+PERU/@-15.8513313,-70.0191831,173m/data=!3m1!1e3?entry=ttu&g_ep=EgoyMDI2MDExMy4wIKXMDSoASAFQAw%3D%3D';

// Social (updated)
const SOCIAL_FACEBOOK =
  process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/profile.php?id=61583924999557';
const SOCIAL_INSTAGRAM =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
  'https://www.instagram.com/vicuadventures?igsh=MXh6ZTc1enYwMm84bw==';
const SOCIAL_TIKTOK =
  process.env.NEXT_PUBLIC_TIKTOK_URL || 'https://www.tiktok.com/@vicua.adventures?_r=1&_t=ZS-934om3AF9k2';
const SOCIAL_LINKEDIN = process.env.NEXT_PUBLIC_LINKEDIN_URL || '#';

// ============================================================================
// I18N
// ============================================================================

const LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es';

// Fallbacks so you don't see keys like "officialPhone" on UI
const FALLBACK_TEXT = {
  about: 'We offer authentic cultural and adventure experiences in Puno, Cusco, Arequipa and beyond.',
  followUs: 'Follow us on',
  explore: 'Explore',
  support: 'Support',
  contact: 'Contact Us',
  packages: 'Packages',
  faqs: 'FAQs',
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  cookies: 'Cookies Policy',
  sitemap: 'Sitemap',
  rights: 'All rights reserved.',
  madeIn: 'Made with ❤️ in Peru',
  openMaps: 'Open Maps',
  business: 'Business Name',
  ruc: 'RUC',
  officialPhone: 'Official number',
  secondaryPhone: 'Secondary number',
  whatsapp: 'WhatsApp',
  chatWhatsapp: 'Chat WhatsApp',
};

function useLocalTranslations(locale) {
  const [messages, setMessages] = useState({});
  useEffect(() => {
    if (!locale) return;
    import(`@/messages/${locale}.json`)
      .then((m) => setMessages(m.Footer || {}))
      .catch(() => setMessages({}));
  }, [locale]);

  return (key) => messages[key] || FALLBACK_TEXT[key] || key;
}

// ============================================================================
// HELPERS
// ============================================================================

const safeExternal = (url) => (url && url !== '#' ? url : '#');
const normalizePhone = (p) => (p || '').toString().replace(/[^\d+]/g, '');
const toTelHref = (p) => `tel:${normalizePhone(p).replace(/\s+/g, '')}`;

const buildWhatsAppHref = (p, message) => {
  const cleaned = normalizePhone(p).replace('+', '').replace(/[^\d]/g, '');
  if (!cleaned) return '#';
  const msg = encodeURIComponent(message || `Hola, quisiera información sobre ${BRAND}.`);
  return `https://wa.me/${cleaned}?text=${msg}`;
};

// Keep your address text stable (for UI) while maps uses fixed URL
const getFullAddress = () => {
  const legacy = process.env.NEXT_PUBLIC_ADDRESS;
  if (legacy) return legacy;

  const parts = [
    ADDRESS_LINE,
    `${ADDRESS_CITY} - ${ADDRESS_REGION} - ${ADDRESS_COUNTRY}`,
    ZIP_CODE ? `CP ${ZIP_CODE}` : '',
  ].filter(Boolean);

  return parts.join(' | ');
};

// ✅ Always use fixed maps URL (precise location)
const getMapsHref = () => GOOGLE_MAPS_URL;

// UI atoms (compact)
function SectionTitle({ children, accent = 'left' }) {
  const bar = accent === 'left' ? 'from-[#A3B117] to-transparent' : 'from-[#0086C0] to-transparent';
  return (
    <h3
      className="text-[18px] font-bold text-white relative inline-block"
      style={{ fontFamily: "'Bree Serif', serif" }}
    >
      <span className="relative z-10">{children}</span>
      <span className={`absolute -bottom-1 left-0 w-10 h-0.5 bg-gradient-to-r ${bar} rounded-full`} />
    </h3>
  );
}

function SoftCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}

function SocialButton({ href, Icon, gradient, label }) {
  const disabled = href === '#';
  return (
    <a
      href={href}
      target={disabled ? undefined : '_blank'}
      rel={disabled ? undefined : 'noreferrer'}
      aria-label={label}
      className={`group relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={(e) => disabled && e.preventDefault()}
      title={label}
    >
      <span
        className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500`}
      />
      <span className="relative w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 group-hover:scale-105 transition-all duration-300">
        <Icon className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors duration-300" />
      </span>
    </a>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function Footer() {
  const pathname = usePathname() || '/';
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    const segment = pathname.split('/')[1] || '';
    setLocale(LOCALES.includes(segment) ? segment : DEFAULT_LOCALE);
  }, [pathname]);

  const t = useLocalTranslations(locale);
  const year = new Date().getFullYear();

  const buildHref = (path) => {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `/${locale}${p === '/' ? '' : p}`;
  };

  const navLinks = useMemo(
    () => [
      { label: t('packages'), href: '/packages' },
      { label: 'Puno', href: '/packages?city=Puno' },
      { label: 'Cusco', href: '/packages?city=Cusco' },
      { label: 'Arequipa', href: '/packages?city=Arequipa' },
    ],
    [t]
  );

  const supportLinks = useMemo(
    () => [
      { label: t('faqs'), href: '/faqs' },
      { label: t('privacy'), href: '/privacy' },
      { label: t('terms'), href: '/terms' },
      { label: t('cookies'), href: '/cookies' },
      { label: t('sitemap'), href: '/sitemap' },
    ],
    [t]
  );

  // Socials: Facebook + Instagram + TikTok (LinkedIn optional)
  const socials = useMemo(() => {
    const items = [
      {
        Icon: Facebook,
        href: safeExternal(SOCIAL_FACEBOOK),
        gradient: 'from-[#1877F2] to-[#145DBF]',
        label: 'Facebook',
      },
      {
        Icon: Instagram,
        href: safeExternal(SOCIAL_INSTAGRAM),
        gradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
        label: 'Instagram',
      },
      {
        Icon: Music2,
        href: safeExternal(SOCIAL_TIKTOK),
        gradient: 'from-black via-[#25F4EE] to-[#FE2C55]',
        label: 'TikTok',
      },
    ];

    if (SOCIAL_LINKEDIN && SOCIAL_LINKEDIN !== '#') {
      items.push({
        Icon: Linkedin,
        href: safeExternal(SOCIAL_LINKEDIN),
        gradient: 'from-[#0A66C2] to-[#004182]',
        label: 'LinkedIn',
      });
    }

    return items;
  }, []);

  const waOfficialHref = useMemo(
    () => buildWhatsAppHref(WHATSAPP_OFFICIAL, `Hola, quisiera información sobre ${BRAND}.`),
    []
  );

  return (
    <footer className="relative bg-gradient-to-br from-[#0E374A] via-[#0E374A] to-[#0a2a38] text-gray-100 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute top-0 -left-40 w-72 h-72 bg-[#A3B117] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 -right-40 w-72 h-72 bg-[#0086C0] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-40 w-72 h-72 bg-[#A3B117] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h2
                className="text-[34px] font-bold mb-3 bg-gradient-to-r from-[#A3B117] via-[#0086C0] to-[#A3B117] bg-clip-text text-transparent animate-gradient"
                style={{ fontFamily: "'Reguilla', cursive, serif", backgroundSize: '200% auto' }}
              >
                {BRAND}
              </h2>

              <div className="relative h-1 w-20 mb-4 overflow-hidden rounded-full bg-white/10">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#A3B117] to-[#0086C0] animate-shimmer"
                  style={{ backgroundSize: '200% 100%' }}
                />
              </div>

              <p className="text-[15px] leading-relaxed text-gray-300" style={{ fontFamily: "'Bree Serif', serif" }}>
                {t('about')}
              </p>
            </div>

            {/* Socials */}
            <div className="space-y-3">
              <p
                className="text-xs font-semibold text-[#A3B117] uppercase tracking-wider"
                style={{ fontFamily: "'Bree Serif', serif" }}
              >
                {t('followUs')}
              </p>

              <div className="flex items-center gap-3">
                {socials.map((s) => (
                  <SocialButton key={s.label} href={s.href} Icon={s.Icon} gradient={s.gradient} label={s.label} />
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={waOfficialHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-green-400/30 transition-all"
                style={{ fontFamily: "'Bree Serif', serif" }}
              >
                <MessageCircle className="w-4 h-4 text-green-400" />
                <span className="text-[13px] text-gray-200">{t('chatWhatsapp')}</span>
              </a>

              <Link
                href={buildHref('/contact')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                style={{ fontFamily: "'Bree Serif', serif" }}
              >
                <Mail className="w-4 h-4 text-[#0086C0]" />
                <span className="text-[13px] text-gray-200">{t('contact')}</span>
              </Link>
            </div>

            {/* Complaints */}
            <Link href={buildHref('/complaints')} className="group inline-block" aria-label="Libro de Reclamaciones">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#A3B117] to-[#0086C0] rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
                <Image
                  src="/reclamos.jpg"
                  alt="Libro de Reclamaciones"
                  width={125}
                  height={60}
                  className="relative rounded-2xl shadow-2xl border-2 border-white/20 group-hover:border-[#A3B117] group-hover:scale-105 transition-all duration-300"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Explore */}
          <nav className="lg:col-span-2 space-y-4">
            <SectionTitle>{t('explore')}</SectionTitle>
            <ul className="space-y-2.5">
              {navLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={buildHref(href)}
                    className="group flex items-center gap-3 text-gray-300 hover:text-white transition-all duration-300"
                    style={{ fontFamily: "'Bree Serif', serif" }}
                  >
                    <span className="w-0 h-px bg-gradient-to-r from-[#A3B117] to-[#0086C0] group-hover:w-7 transition-all duration-300 rounded-full" />
                    <span className="text-[13px] group-hover:translate-x-2 transition-transform duration-300">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Support */}
          <div className="lg:col-span-2 space-y-4">
            <SectionTitle accent="right">{t('support')}</SectionTitle>
            <ul className="space-y-2.5">
              {supportLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={buildHref(href)}
                    className="group flex items-center gap-3 text-gray-300 hover:text-white transition-all duration-300"
                    style={{ fontFamily: "'Bree Serif', serif" }}
                  >
                    <span className="w-0 h-px bg-gradient-to-r from-[#0086C0] to-[#A3B117] group-hover:w-7 transition-all duration-300 rounded-full" />
                    <span className="text-[13px] group-hover:translate-x-2 transition-transform duration-300">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <address className="lg:col-span-3 not-italic space-y-4">
            <SectionTitle>{t('contact')}</SectionTitle>

            {/* Address */}
            <a href={getMapsHref()} target="_blank" rel="noreferrer" className="block">
              <SoftCard className="p-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#0086C0] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p
                      className="text-[13px] text-gray-300 leading-relaxed"
                      style={{ fontFamily: "'Bree Serif', serif" }}
                    >
                      {getFullAddress()}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-[#A3B117]">
                      <Map className="w-3.5 h-3.5" />
                      <span className="underline underline-offset-4">{t('openMaps')}</span>
                    </div>
                  </div>
                </div>
              </SoftCard>
            </a>

            {/* Legal */}
            <SoftCard className="p-3">
              <div className="space-y-2 text-[13px]" style={{ fontFamily: "'Bree Serif', serif" }}>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-[#A3B117] mt-0.5" />
                  <div>
                    <div className="font-bold text-[#A3B117]">{t('business')}:</div>
                    <div className="text-gray-300">{LEGAL_NAME}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#0086C0]" />
                  <span className="font-bold text-[#A3B117]">{t('ruc')}:</span>
                  <span className="text-gray-300">{RUC}</span>
                </div>
              </div>
            </SoftCard>

            {/* Phones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
              <a href={toTelHref(PHONE_OFFICIAL)} className="block">
                <SoftCard className="p-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#0086C0] flex-shrink-0" />
                    <div className="text-[13px]" style={{ fontFamily: "'Bree Serif', serif" }}>
                      <div className="text-gray-200 font-semibold">{t('officialPhone')}</div>
                      <div className="text-gray-300">{PHONE_OFFICIAL}</div>
                    </div>
                  </div>
                </SoftCard>
              </a>

              <a href={toTelHref(PHONE_SECONDARY)} className="block">
                <SoftCard className="p-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#A3B117] flex-shrink-0" />
                    <div className="text-[13px]" style={{ fontFamily: "'Bree Serif', serif" }}>
                      <div className="text-gray-200 font-semibold">{t('secondaryPhone')}</div>
                      <div className="text-gray-300">{PHONE_SECONDARY}</div>
                    </div>
                  </div>
                </SoftCard>
              </a>

              <a
                href={buildWhatsAppHref(WHATSAPP_OFFICIAL, `Hola, quisiera información sobre ${BRAND}.`)}
                target="_blank"
                rel="noreferrer"
                className="block sm:col-span-2 lg:col-span-1 xl:col-span-2"
              >
                <SoftCard className="p-3">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div className="text-[13px]" style={{ fontFamily: "'Bree Serif', serif" }}>
                      <div className="text-gray-200 font-semibold">{t('whatsapp')}</div>
                      <div className="text-gray-300">{WHATSAPP_OFFICIAL}</div>
                    </div>
                  </div>
                </SoftCard>
              </a>
            </div>

            {/* Email CTA */}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="group relative inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
              style={{ fontFamily: "'Bree Serif', serif" }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#A3B117] to-[#0086C0]" />
              <span className="absolute inset-0 bg-gradient-to-r from-[#0086C0] to-[#A3B117] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Mail className="w-4 h-4 relative z-10 text-white" />
              <span className="relative z-10 text-[13px] font-semibold text-white">{CONTACT_EMAIL}</span>
            </a>

            {/* (optional) hidden support phone for future use */}
            <span className="sr-only">{PHONE_SUPPORT}</span>
          </address>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[13px] text-gray-400" style={{ fontFamily: "'Bree Serif', serif" }}>
              © {year}{' '}
              <span className="font-bold bg-gradient-to-r from-[#A3B117] to-[#0086C0] bg-clip-text text-transparent">
                {BRAND}
              </span>
              . {t('rights')}
            </p>

            <span
              className="px-3 py-1.5 rounded-full text-[11px] bg-white/5 backdrop-blur-sm border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-300"
              style={{ fontFamily: "'Bree Serif', serif" }}
            >
              {t('madeIn')}
            </span>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes blob {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </footer>
  );
}
