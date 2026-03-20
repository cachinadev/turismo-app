'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Globe,
  Menu,
  X,
  ChevronDown,
  MapPin,
  Phone,
  Building2,
  BadgeCheck,
  MessageCircle,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { API_BASE } from '@/app/lib/config';

// ============================================================================
// CONSTANTS (from .env)
// ============================================================================

const CONFIG = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Vicuña Adventures',
  brandLogo: process.env.NEXT_PUBLIC_BRAND_LOGO || '/brand/logo.png',
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
};

const COMPANY = {
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || 'VICUÑA ADVENTURES S.A.C.',
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'VICUÑA ADVENTURES S.A.C.',
  ruc: process.env.NEXT_PUBLIC_RUC || '20614912228',

  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@vicuadvent.com',
  phoneOfficial: process.env.NEXT_PUBLIC_CONTACT_PHONE_OFFICIAL || '+51953858267',
  phoneSecondary: process.env.NEXT_PUBLIC_CONTACT_PHONE_SECONDARY || '+51982397386',
  phoneSupport: process.env.NEXT_PUBLIC_CONTACT_PHONE_SUPPORT || '+51999069352',
  whatsappSupport: process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT || '+51999069352',

  addressLine:
    process.env.NEXT_PUBLIC_ADDRESS_LINE ||
    'CAL.LEONCIO PRADO NRO. 194 URB. CHACARILLA DEL LAGO 2',
  city: process.env.NEXT_PUBLIC_ADDRESS_CITY || 'PUNO',
  region: process.env.NEXT_PUBLIC_ADDRESS_REGION || 'PUNO',
  country: process.env.NEXT_PUBLIC_ADDRESS_COUNTRY || 'PERU',
  zip: process.env.NEXT_PUBLIC_ZIP_CODE || '21001',
};

const LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];

const LOCALE_DATA = {
  es: { name: 'Español', flag: '🇪🇸', short: 'ES' },
  en: { name: 'English', flag: '🇺🇸', short: 'EN' },
  fr: { name: 'Français', flag: '🇫🇷', short: 'FR' },
  pt: { name: 'Português', flag: '🇵🇹', short: 'PT' },
  ru: { name: 'Русский', flag: '🇷🇺', short: 'RU' },
};

const NAV_ITEMS = [
  { key: 'home', path: '/' },
  { key: 'packages', path: '/packages' },
  { key: 'destinations', path: '/destinations' },
  { key: 'transport', path: '/transport' },
  { key: 'about', path: '/about' },
  { key: 'testimonials', path: '/testimonials' },
  { key: 'contact', path: '/contact' },
];

const DESTINATION_MENU = [
  { label: 'Puno', slug: 'puno' },
  { label: 'Cusco', slug: 'cusco' },
  { label: 'Arequipa', slug: 'arequipa' },
  { label: 'Lima', slug: 'lima' },
];

// ============================================================================
// UTILITIES
// ============================================================================

const isAdminPath = (pathname) => pathname === '/admin' || pathname.startsWith('/admin/');

const normalizePhone = (p) => (p || '').replace(/[^\d+]/g, '');
const toTelHref = (p) => {
  const cleaned = normalizePhone(p);
  if (!cleaned) return '#';
  // tel: no spaces
  return `tel:${cleaned.replace(/\s+/g, '')}`;
};
const toWaHref = (p, text = '') => {
  const cleaned = normalizePhone(p).replace('+', '');
  if (!cleaned) return '#';
  const msg = encodeURIComponent(text || `Hola, necesito soporte con ${CONFIG.brandName}.`);
  return `https://wa.me/${cleaned}?text=${msg}`;
};

const buildFullAddress = () => {
  const parts = [
    COMPANY.addressLine,
    COMPANY.city,
    COMPANY.region,
    COMPANY.country,
    COMPANY.zip ? `(${COMPANY.zip})` : '',
  ].filter(Boolean);
  return parts.join(' - ');
};

const toMapsHref = () => {
  const q = encodeURIComponent(buildFullAddress());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
};

const useScrollDetection = (threshold = 20) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
};

const useClickOutside = (refs, handler) => {
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedOutside = refs.every((ref) => ref.current && !ref.current.contains(e.target));
      if (clickedOutside) handler();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, handler]);
};

const slugifyCity = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const useLocalTranslations = (locale) => {
  const [messages, setMessages] = useState({});

  useEffect(() => {
    if (!locale) return;

    import(`@/messages/${locale}.json`)
      .then((m) => setMessages(m.NavBar || {}))
      .catch(() => setMessages({}));
  }, [locale]);

  return useCallback((key) => messages[key] || key, [messages]);
};

// Keep behavior (admin detection), even if not used now
const useAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      setIsAdmin(Boolean(localStorage.getItem('token')));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  return isAdmin;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const BrandLogo = ({ scrolled }) => (
  <div className="flex items-center gap-3">
    <img
      src={CONFIG.brandLogo}
      alt={`${CONFIG.brandName} logo`}
      className={`h-10 w-auto transition-transform duration-300 hover:scale-110 ${
        scrolled ? '' : ''
      }`}
    />
    <div className="flex flex-col leading-none select-none">
      <span
        className="font-black tracking-wide text-[26px] transition-colors duration-500 text-[#A3B117]"
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
        VICUÑA
      </span>
      <span
        className="text-[13px] tracking-[0.35em] font-semibold text-[#0086C0]"
        style={{ fontFamily: "'Reguilla', serif" }}
      >
        ADVENTURES
      </span>
    </div>
  </div>
);

const NavLink = ({ label, href, isActive, onClick, mobile = false, dark = false }) => {
  if (mobile) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`
          block px-5 py-3.5 rounded-xl text-[15px] mb-2 transition-all text-center capitalize
          ${
            isActive
              ? 'bg-gradient-to-r from-[#A3B117]/20 to-[#0086C0]/20 text-[#0086C0] font-semibold shadow-sm'
              : 'text-[#0E374A] hover:bg-[#A3B117]/10 hover:shadow-sm'
          }
        `}
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`
        relative text-[16px] tracking-wide transition-all duration-300 capitalize
        ${
          dark
            ? isActive
              ? 'text-[#A3B117] font-semibold'
              : 'text-slate-100/90 hover:text-white'
            : isActive
            ? 'text-[#0086C0] font-semibold'
            : 'text-[#0E374A] hover:text-[#A3B117]'
        }
      `}
      style={{ fontFamily: "'Bree Serif', serif" }}
    >
      {label}
      {isActive && (
        <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-[#A3B117] to-[#0086C0] rounded-full" />
      )}
    </Link>
  );
};

const DropdownMenu = ({ items, alignClass = 'left-0' }) => {
  return (
    <div
      className={`absolute top-full z-50 mt-3 w-[260px] overflow-hidden rounded-[20px] border border-white/65 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(244,248,251,0.96)_100%)] shadow-[0_24px_80px_rgba(4,24,38,0.24)] backdrop-blur-xl ${alignClass}`}
    >
      <div className="max-h-[320px] overflow-auto p-2.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-transparent px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0086C0]/12 hover:bg-white hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
          >
            <div className="min-w-0">
              <div
                className="truncate text-[14px] font-semibold text-slate-900 transition-colors duration-200 group-hover:text-[#0E374A]"
                style={{ fontFamily: "'Bree Serif', serif" }}
              >
                {item.title}
              </div>
              {item.sub ? (
                <div className="mt-1 truncate text-[11px] font-medium tracking-[0.12em] uppercase text-slate-500">
                  {item.sub}
                </div>
              ) : null}
            </div>
            {item.badge ? (
              <span className="whitespace-nowrap rounded-full bg-[#0086C0]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0086C0]">
                {item.badge}
              </span>
            ) : (
              <span className="text-slate-300 transition-colors duration-200 group-hover:text-[#0086C0]">↗</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

const LanguageSelector = ({ currentLocale, isOpen, onToggle, onClose, langRef, mobile = false }) => {
  const localeData = LOCALE_DATA[currentLocale] || LOCALE_DATA[CONFIG.defaultLocale];

  if (mobile) {
    return (
      <div className="mb-4" ref={langRef}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-white border-2 border-gray-200 hover:border-[#0086C0]/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <span
              className="text-[#0E374A] font-semibold text-[15px]"
              style={{ fontFamily: "'Bree Serif', serif" }}
            >
              {localeData.flag} {localeData.name}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#0086C0] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg py-2 animate-fadeIn">
            <LanguageSwitcher closeMenu={onClose} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={langRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 hover:bg-white/80 backdrop-blur-md transition-all shadow-sm"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <span className="text-[#0E374A] text-[14px]" style={{ fontFamily: "'Bree Serif', serif" }}>
          {localeData.flag} {localeData.name}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-xl shadow-lg py-3 px-2 min-w-[170px] animate-fadeIn">
          <LanguageSwitcher closeMenu={onClose} />
        </div>
      )}
    </div>
  );
};

const BookNowButton = ({ href, mobile = false, onClick, label }) => {
  if (mobile) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="block w-full text-center py-4 rounded-xl text-white bg-gradient-to-r from-[#A3B117] to-[#0086C0] font-semibold text-[16px] shadow-lg active:scale-95 transition-transform capitalize"
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="px-6 py-2.5 rounded-xl bg-[#0086C0] text-white font-semibold tracking-wide transition-all duration-300 hover:shadow-[0_0_25px_rgba(163,177,23,0.5)] hover:scale-105 capitalize"
      style={{ fontFamily: "'Bree Serif', serif" }}
    >
      {label}
    </Link>
  );
};

const MobileInfoCard = ({ t, onClose }) => {
  const fullAddress = buildFullAddress();
  const mapsHref = toMapsHref();
  const waHref = toWaHref(
    COMPANY.whatsappSupport,
    `Hola, necesito soporte con ${CONFIG.brandName}.`
  );

  return (
    <div className="mt-5 pt-5 border-t border-gray-200">
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0086C0]" />
            <div className="leading-tight">
              <div
                className="text-[#0E374A] font-extrabold text-[14px]"
                style={{ fontFamily: "'Bree Serif', serif" }}
              >
                {COMPANY.legalName}
              </div>
              <div className="text-[12px] text-gray-600 flex items-center gap-1">
                <BadgeCheck className="w-4 h-4" />
                RUC: {COMPANY.ruc}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-[#0E374A] p-1 rounded-lg"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Address */}
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex gap-2 rounded-xl p-3 border border-gray-200 hover:border-[#0086C0]/40 hover:bg-[#0086C0]/5 transition-all"
        >
          <MapPin className="w-5 h-5 text-[#0086C0] mt-0.5" />
          <div className="text-[13px] text-[#0E374A] leading-snug">
            <div className="font-semibold">{t('address') || 'Dirección'}</div>
            <div className="text-gray-700">{fullAddress}</div>
          </div>
        </a>

        {/* Phones */}
        <div className="mt-3 grid grid-cols-1 gap-2">
          <a
            href={toTelHref(COMPANY.phoneOfficial)}
            className="flex items-center gap-2 rounded-xl p-3 border border-gray-200 hover:border-[#A3B117]/40 hover:bg-[#A3B117]/5 transition-all"
          >
            <Phone className="w-5 h-5 text-[#A3B117]" />
            <div className="text-[13px] text-[#0E374A]">
              <div className="font-semibold">{t('officialPhone') || 'Número oficial'}</div>
              <div className="text-gray-700">{COMPANY.phoneOfficial}</div>
            </div>
          </a>

          <a
            href={toTelHref(COMPANY.phoneSecondary)}
            className="flex items-center gap-2 rounded-xl p-3 border border-gray-200 hover:border-[#0086C0]/40 hover:bg-[#0086C0]/5 transition-all"
          >
            <Phone className="w-5 h-5 text-[#0086C0]" />
            <div className="text-[13px] text-[#0E374A]">
              <div className="font-semibold">{t('secondaryPhone') || 'Número alternativo'}</div>
              <div className="text-gray-700">{COMPANY.phoneSecondary}</div>
            </div>
          </a>

          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl p-3 border border-gray-200 hover:border-green-500/40 hover:bg-green-50 transition-all"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
            <div className="text-[13px] text-[#0E374A]">
              <div className="font-semibold">{t('supportWhatsapp') || 'Soporte (WhatsApp)'}</div>
              <div className="text-gray-700">{COMPANY.whatsappSupport}</div>
            </div>
          </a>
        </div>

        {/* Contact page shortcut */}
        <div className="mt-4">
          <Link
            href={(() => {
              // Use same locale routing style as the nav
              // The parent will pass the correct /{locale}/contact via buildHref in main
              return '#';
            })()}
            className="hidden"
          />
          <div className="text-[12px] text-gray-600">
            {t('supportHint') ||
              'Tip: puedes ver más información en la sección Contacto.'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NavBar() {
  const pathname = usePathname() || '/';
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [featuredPackages, setFeaturedPackages] = useState([]);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const closeMenuRef = useRef(null);

  const langRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const scrolled = useScrollDetection(20);
  useAuth(); // keep behavior

  const currentLocale = useMemo(() => {
    if (isAdminPath(pathname)) return null;
    const segment = pathname.split('/')[1] || '';
    return LOCALES.includes(segment) ? segment : CONFIG.defaultLocale;
  }, [pathname]);

  const t = useLocalTranslations(currentLocale);

  useEffect(() => setMounted(true), []);

  const ensureMenuData = useCallback(async () => {
    if (menuLoaded || menuLoading) return;
    setMenuLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/packages?limit=8`, { cache: 'no-store' });
      if (!res.ok) throw new Error('menu_fetch_failed');
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json?.items) ? json.items : [];
      const shuffled = items.slice().sort(() => Math.random() - 0.5);
      const cleaned = shuffled.map((p) => ({
        title: p.title || 'Package',
        slug: p.slug,
        city: p.city,
      }));
      setFeaturedPackages(cleaned);
      setMenuLoaded(true);
    } catch {
      setFeaturedPackages([]);
    } finally {
      setMenuLoading(false);
    }
  }, [menuLoaded, menuLoading]);

  useClickOutside([langRef, mobileMenuRef], () => {
    setLangOpen(false);
    setMobileOpen(false);
  });
  useEffect(() => {
    return () => {
      if (closeMenuRef.current) clearTimeout(closeMenuRef.current);
    };
  }, []);

  const buildHref = useCallback(
    (p) => {
      const cleanPath = p === '/' ? '' : p.startsWith('/') ? p : `/${p}`;
      if (isAdminPath(cleanPath)) return cleanPath;
      return currentLocale ? `/${currentLocale}${cleanPath}` : cleanPath || '/';
    },
    [currentLocale]
  );

  const checkActive = useCallback(
    (href) => {
      const fullHref = buildHref(href);
      if (fullHref === '/' || fullHref === `/${currentLocale}`) {
        return ['/', `/${currentLocale}`, `/${currentLocale}/`].includes(pathname);
      }
      return pathname.startsWith(fullHref);
    },
    [pathname, buildHref, currentLocale]
  );

  const destinationItems = useMemo(() => {
    if (featuredPackages.length) {
      const uniq = new Map();
      featuredPackages.forEach((p) => {
        const city = String(p.city || '').trim();
        if (!city) return;
        const key = city.toLowerCase();
        if (!uniq.has(key)) {
          uniq.set(key, {
            title: city,
            href: buildHref(`/destinations/${slugifyCity(city)}`),
            sub: '',
            badge: null,
          });
        }
      });
      return Array.from(uniq.values()).slice(0, 6);
    }

    return DESTINATION_MENU.map((d) => ({
      title: d.label,
      href: buildHref(`/destinations/${d.slug}`),
      sub: '',
      badge: null,
    }));
  }, [featuredPackages, buildHref]);

  const packageItems = useMemo(() => {
    if (!featuredPackages.length) return [];
    return featuredPackages.map((p) => ({
      title: p.title,
      href: buildHref(`/packages/${p.slug}`),
      sub: p.city || '',
      badge: null,
    }));
  }, [featuredPackages, buildHref]);

  // Build "Contact" page href once (used in the info card hint, if you want later)
  const contactHref = useMemo(() => buildHref('/contact'), [buildHref]);

  if (!mounted) return null;

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-500
        bg-gradient-to-br from-[#0E374A] via-[#0E374A] to-[#0a2a38]
        ${scrolled ? 'shadow-[0_8px_25px_rgba(0,0,0,0.25)]' : ''}
      `}
    >
      {menuOpen && (
        <div className="pointer-events-none fixed inset-0 top-20 z-0 bg-slate-950/22 backdrop-blur-[1.5px]" />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            href={buildHref('/')}
            className="transition-transform duration-300 hover:scale-105 z-10"
            aria-label="Home"
          >
            <BrandLogo scrolled={scrolled} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-10" aria-label="Main navigation">
            {NAV_ITEMS.map(({ key, path }) => {
              const isPackages = key === 'packages';
              const isDestinations = key === 'destinations';
              if (isPackages || isDestinations) {
                const openKey = isPackages ? 'packages' : 'destinations';
                const items = isPackages ? packageItems : destinationItems;
                const handleOpen = () => {
                  if (closeMenuRef.current) clearTimeout(closeMenuRef.current);
                  setMenuOpen(openKey);
                  if (isPackages || isDestinations) ensureMenuData();
                };
                const handleClose = () => {
                  if (closeMenuRef.current) clearTimeout(closeMenuRef.current);
                  closeMenuRef.current = setTimeout(() => setMenuOpen(null), 180);
                };
                const dropdownAlignClass = isPackages
                  ? 'left-1/2 -translate-x-[34%]'
                  : 'left-1/2 -translate-x-[44%]';
                return (
                  <div
                    key={key}
                    className="relative"
                    onMouseEnter={handleOpen}
                    onMouseLeave={handleClose}
                  >
                    <NavLink label={t(key)} href={buildHref(path)} isActive={checkActive(path)} dark />
                    {menuOpen === openKey && items.length ? (
                      <DropdownMenu items={items} alignClass={dropdownAlignClass} />
                    ) : null}
                  </div>
                );
              }
              return (
                <NavLink key={key} label={t(key)} href={buildHref(path)} isActive={checkActive(path)} dark />
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <LanguageSelector
              currentLocale={currentLocale}
              isOpen={langOpen}
              onToggle={() => setLangOpen((v) => !v)}
              onClose={() => setLangOpen(false)}
              langRef={langRef}
            />
            <BookNowButton href={buildHref('/packages')} label={t('bookNow')} />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          ref={mobileMenuRef}
          className="lg:hidden bg-white/95 backdrop-blur-xl px-6 py-6 border-t border-gray-200 animate-fadeIn max-h-[calc(100vh-5rem)] overflow-y-auto"
        >
          {/* Language Selector - Mobile */}
          <LanguageSelector
            currentLocale={currentLocale}
            isOpen={langOpen}
            onToggle={() => setLangOpen((v) => !v)}
            onClose={() => setLangOpen(false)}
            langRef={langRef}
            mobile
          />

          {/* Navigation Links */}
          <nav aria-label="Mobile navigation" className="space-y-1">
            {NAV_ITEMS.map(({ key, path }) => (
              <NavLink
                key={key}
                label={t(key)}
                href={buildHref(path)}
                isActive={checkActive(path)}
                onClick={() => setMobileOpen(false)}
                mobile
              />
            ))}
          </nav>

          {/* Book Now Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <BookNowButton
              href={buildHref('/packages')}
              mobile
              onClick={() => setMobileOpen(false)}
              label={t('bookNow')}
            />
          </div>

          {/* Quick Contact / Address info (from .env) */}
          <MobileInfoCard
            t={(key) => {
              // Provide a couple of extra keys without requiring messages update
              // (You can later add these to messages/{locale}.json)
              const fallback = {
                address: currentLocale === 'en' ? 'Address' : 'Dirección',
                officialPhone: currentLocale === 'en' ? 'Official phone' : 'Número oficial',
                secondaryPhone: currentLocale === 'en' ? 'Alternate phone' : 'Número alternativo',
                supportWhatsapp: currentLocale === 'en' ? 'Support (WhatsApp)' : 'Soporte (WhatsApp)',
                supportHint:
                  currentLocale === 'en'
                    ? `More details on the Contact page.`
                    : `Más detalles en la página ${t('contact') || 'Contacto'}.`,
              };
              return fallback[key] || t(key);
            }}
            onClose={() => setMobileOpen(false)}
            contactHref={contactHref}
          />
        </div>
      )}
    </nav>
  );
}
