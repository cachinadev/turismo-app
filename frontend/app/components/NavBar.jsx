// frontend/app/components/NavBar.jsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';

/* ------------------------------------------------------
 * 🌐 Brand & Contact Settings
 * ------------------------------------------------------ */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Vicuña Adventures';
const BRAND_LOGO = process.env.NEXT_PUBLIC_BRAND_LOGO || '/brand/logo.png';
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Vicuña Adventures S.A.C.';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@vicuadvent.com';
const CONTACT_PHONE = process.env.NEXT_PUBLIC_PHONE || '+51 982 397 386';
const CONTACT_HOURS = process.env.NEXT_PUBLIC_HOURS || 'Mon–Fri 9–7, Sat 9–1 (UTC−5)';
const ADVISOR_TEXT = process.env.NEXT_PUBLIC_ADVISOR_TEXT || 'Speak to your travel advisor';
const AWARD_BADGE = process.env.NEXT_PUBLIC_AWARD_BADGE || 'Awarded in Puno';

/* ------------------------------------------------------
 * 🌍 Locale Settings with Country Flags
 * ------------------------------------------------------ */
const LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];
const LOCALE_NAMES = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  pt: 'Português',
  ru: 'Русский',
};
const LOCALE_FLAGS = {
  es: '🇪🇸', // Spain flag
  en: '🇺🇸', // US flag (or 🇬🇧 for UK)
  fr: '🇫🇷', // France flag
  pt: '🇵🇹', // Portugal flag (or 🇧🇷 for Brazil)
  ru: '🇷🇺', // Russia flag
};
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es';

/* ------------------------------------------------------
 * 🎨 Brand Palette
 * ------------------------------------------------------ */
const COLORS = {
  primary: '#386b36ff',
  bg: '#C6E9EF',
  accent: '#FCFD97',
  textDark: '#0f172a',
  text: '#334155',
  white: '#ffffff',
};

/* ------------------------------------------------------
 * 🧩 Utils
 * ------------------------------------------------------ */
const toTelHref = (num = '') => `tel:${String(num).replace(/[^\d+]/g, '')}`;
const isAdminPath = (pathname) => pathname === '/admin' || pathname.startsWith('/admin/');

/* ------------------------------------------------------
 * 🈶 Localized text (manual load)
 * ------------------------------------------------------ */
function useLocalTranslations(locale) {
  const [messages, setMessages] = useState({});
  useEffect(() => {
    import(`@/messages/${locale}.json`)
      .then((m) => setMessages(m.NavBar || {}))
      .catch(() => setMessages({}));
  }, [locale]);
  return (key) => messages[key] || key;
}

/* ------------------------------------------------------
 * 🚀 NavBar Component
 * ------------------------------------------------------ */
export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Detect locale from URL
  const currentLocale = useMemo(() => {
    if (isAdminPath(pathname)) return null;
    const segment = pathname.split('/')[1] || '';
    return LOCALES.includes(segment) ? segment : DEFAULT_LOCALE;
  }, [pathname]);

  const t = useLocalTranslations(currentLocale);

  useEffect(() => setMounted(true), []);

  /* ----- Scroll effect for compact header ----- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ----- Close dropdowns when clicking outside ----- */
  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) && mobileOpen) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileOpen]);

  /* ----- Prevent body scroll when mobile menu is open ----- */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  /* ----- Detect admin login ----- */
  useEffect(() => {
    const readToken = () => {
      try {
        setIsAdmin(Boolean(localStorage.getItem('token')));
      } catch {
        setIsAdmin(false);
      }
    };
    readToken();
    window.addEventListener('storage', readToken);
    return () => window.removeEventListener('storage', readToken);
  }, []);

  /* ----- Locale-aware href ----- */
  const publicHref = useCallback(
    (path) => {
      const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
      if (isAdminPath(clean)) return clean;
      return currentLocale ? `/${currentLocale}${clean}` : clean || '/';
    },
    [currentLocale]
  );

  const isActive = useCallback(
    (href) => {
      const full = publicHref(href);
      if (full === '/') {
        return (
          pathname === '/' ||
          pathname === `/${DEFAULT_LOCALE}` ||
          pathname === `/${currentLocale || DEFAULT_LOCALE}`
        );
      }
      return pathname.startsWith(full);
    },
    [pathname, publicHref, currentLocale]
  );

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('token');
    } catch {}
    setIsAdmin(false);
    setMobileOpen(false);
    router.replace(publicHref('/'));
    router.refresh();
  }, [router, publicHref]);

  if (!mounted) return null;

  /* ---------- Brand ---------- */
  const Brand = (
    <div className="flex items-center gap-3">
      {BRAND_LOGO ? (
        <img
          src={BRAND_LOGO}
          alt={`${BRAND_NAME} logo`}
          className="h-8 w-auto transition-transform hover:scale-105 md:h-10"
          loading="eager"
          decoding="async"
        />
      ) : (
        <span className="text-xl font-semibold tracking-tight text-slate-800 md:text-2xl">
          {BRAND_NAME}
        </span>
      )}
    </div>
  );

  /* ---------- Nav Links ---------- */
  const NavLinks = [
    [t('home'), '/'],
    [t('packages'), '/packages'],
    [t('destinations'), '/destinations'],
    [t('about'), '/about'],
    [t('testimonials'), '/testimonials'],
    [t('contact'), '/contact'],
  ];

  const linkBase =
    'relative whitespace-nowrap font-semibold transition-all duration-300 hover:text-green-700 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-green-700 hover:after:w-full after:transition-all after:duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-sm';
  const activeStyle = { color: COLORS.primary };
  const inactiveStyle = { color: COLORS.text };

  /* ------------------------------------------------------
   * 🧭 Render
   * ------------------------------------------------------ */
  return (
    <header
      role="banner"
      className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ${
        scrolled ? 'shadow-lg bg-white/95' : 'bg-white/85'
      }`}
    >
      {/* Top Info Bar - Responsive */}
      <div
        className="text-xs hidden sm:block"
        style={{ backgroundColor: COLORS.primary, color: COLORS.white }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-9 md:h-10 px-4 sm:px-6 lg:px-8">
          <span className="font-semibold text-sm truncate max-w-[200px] md:max-w-none">
            {COMPANY_NAME}
          </span>
          <div className="flex gap-4 md:gap-6 items-center">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium hover:underline text-sm transition-colors duration-200 hidden md:inline-block"
            >
              {CONTACT_EMAIL}
            </a>
            <a
              href={toTelHref(CONTACT_PHONE)}
              className="font-medium hover:underline text-sm transition-colors duration-200"
            >
              {CONTACT_PHONE}
            </a>
          </div>
        </div>
      </div>

      {/* Hours / Advisor / Award - Responsive */}
      <div
        className="border-b text-xs hidden sm:block"
        style={{ backgroundColor: COLORS.white, color: COLORS.text }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-8 md:h-9 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden lg:inline">{CONTACT_HOURS}</span>
            <span className="hidden lg:inline">•</span>
            <Link
              href={publicHref('/contact')}
              prefetch={false}
              className="hover:underline transition-colors duration-200 font-medium"
            >
              {ADVISOR_TEXT}
            </Link>
          </div>
          <div className="truncate">
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium text-xs md:text-sm"
              style={{ backgroundColor: COLORS.accent, color: '#713f12' }}
            >
              🏆 {AWARD_BADGE}
            </span>
          </div>
        </div>
      </div>

      {/* Main Nav - Improved proportions */}
      <div
        className={`border-b transition-all duration-300 ${
          scrolled ? 'h-14 md:h-16' : 'h-16 md:h-20'
        } flex items-center`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link
            href={isAdmin ? '/admin/dashboard' : publicHref('/')}
            prefetch={false}
            className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 lg:flex-none"
            onClick={() => setMobileOpen(false)}
          >
            {Brand}
          </Link>

          {/* Desktop Links - Better spacing */}
          <nav 
            className="hidden lg:flex items-center gap-8 xl:gap-10 mx-8" 
            aria-label="Primary"
          >
            {NavLinks.map(([label, href]) => {
              const active = isActive(href);
              return (
                <Link
                  key={label}
                  href={publicHref(href)}
                  prefetch={false}
                  className={`${linkBase} text-base ${
                    active ? 'text-green-700' : 'text-slate-700'
                  }`}
                  style={active ? activeStyle : inactiveStyle}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side (Desktop) - Better proportions */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 flex-shrink-0">
            {/* Language Switcher with Flags */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white border border-slate-200 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 flex items-center gap-2 transition-all duration-200 min-w-[120px] justify-center"
                aria-expanded={langOpen}
                aria-haspopup="true"
              >
                <span className="text-lg">{LOCALE_FLAGS[currentLocale] || '🌐'}</span>
                <span className="hidden xl:inline">
                  {LOCALE_NAMES[currentLocale] || 'Language'}
                </span>
                <span 
                  className={`transition-transform duration-200 text-xs ${
                    langOpen ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-48 py-2">
                  <LanguageSwitcher closeMenu={() => setLangOpen(false)} />
                </div>
              )}
            </div>

            {/* CTA - Better proportions */}
            <Link
              href={publicHref('/packages')}
              prefetch={false}
              className="px-6 py-3 rounded-lg font-semibold text-sm shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
              style={{
                backgroundColor: COLORS.primary,
                color: COLORS.white,
              }}
            >
              {t('bookNow')}
            </Link>
          </div>

          {/* Mobile Toggle - Better touch targets */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden flex flex-col gap-1.5 p-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-lg transition-all duration-200"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <span
              className={`block w-6 h-0.5 bg-slate-700 transition-all duration-300 ${
                mobileOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-slate-700 transition-all duration-300 ${
                mobileOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-slate-700 transition-all duration-300 ${
                mobileOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu - Full screen overlay */}
      {mobileOpen && (
        <div 
          ref={mobileMenuRef}
          className="lg:hidden fixed inset-0 top-[calc(100%-1px)] bg-white z-40 overflow-y-auto animate-slideInUp"
        >
          <div className="container-default py-8 px-6">
            {/* Mobile Navigation Links */}
            <nav className="flex flex-col gap-6 mb-8" aria-label="Mobile navigation">
              {NavLinks.map(([label, href]) => {
                const active = isActive(href);
                return (
                  <Link
                    key={label}
                    href={publicHref(href)}
                    prefetch={false}
                    className={`text-lg font-semibold py-3 px-4 rounded-lg transition-all duration-200 border-l-4 ${
                      active 
                        ? 'text-green-700 bg-green-50 border-green-700' 
                        : 'text-slate-700 border-transparent hover:bg-slate-50 hover:text-green-700'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Language Switcher */}
            <div className="mb-8 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                <span className="text-lg">🌐</span>
                Language
              </h3>
              <LanguageSwitcher closeMenu={() => setMobileOpen(false)} />
            </div>

            {/* Mobile CTA */}
            <div className="flex flex-col gap-4">
              <Link
                href={publicHref('/packages')}
                prefetch={false}
                className="w-full py-4 rounded-lg font-bold text-base text-center shadow-lg transition-all duration-300 active:scale-95"
                style={{
                  backgroundColor: COLORS.primary,
                  color: COLORS.white,
                }}
                onClick={() => setMobileOpen(false)}
              >
                {t('bookNow')}
              </Link>
              
              {/* Contact info for mobile */}
              <div className="text-center space-y-2 pt-4 border-t border-slate-200">
                <a
                  href={toTelHref(CONTACT_PHONE)}
                  className="block text-sm font-semibold text-slate-700 hover:text-green-700"
                >
                  {CONTACT_PHONE}
                </a>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="block text-sm text-slate-600 hover:text-green-700"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}