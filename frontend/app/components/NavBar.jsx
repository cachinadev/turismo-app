'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Globe, Menu, X, ChevronDown } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIG = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Vicuña Adventures',
  brandLogo: process.env.NEXT_PUBLIC_BRAND_LOGO || '/brand/logo.png',
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es',
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
  { key: 'about', path: '/about' },
  { key: 'testimonials', path: '/testimonials' },
  { key: 'contact', path: '/contact' },
];

// ============================================================================
// UTILITIES
// ============================================================================

const isAdminPath = (pathname) => {
  return pathname === '/admin' || pathname.startsWith('/admin/');
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
      const clickedOutside = refs.every(
        ref => ref.current && !ref.current.contains(e.target)
      );
      if (clickedOutside) handler();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, handler]);
};

const useLocalTranslations = (locale) => {
  const [messages, setMessages] = useState({});

  useEffect(() => {
    if (!locale) return;

    import(`@/messages/${locale}.json`)
      .then(m => setMessages(m.NavBar || {}))
      .catch(() => setMessages({}));
  }, [locale]);

  return useCallback((key) => messages[key] || key, [messages]);
};

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
      className="h-10 w-auto transition-transform duration-300 hover:scale-110"
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

const NavLink = ({ label, href, isActive, onClick, mobile = false }) => {
  if (mobile) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`
          block px-5 py-3.5 rounded-xl text-[15px] mb-2 transition-all text-center
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
        relative text-[16px] tracking-wide transition-all duration-300
        ${
          isActive
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

const LanguageSelector = ({ currentLocale, isOpen, onToggle, onClose, langRef, mobile = false }) => {
  // Obtener datos del locale de forma segura
  const localeData = LOCALE_DATA[currentLocale] || LOCALE_DATA[CONFIG.defaultLocale];
  
  if (mobile) {
    return (
      <div className="mb-4" ref={langRef}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-white border-2 border-gray-200 hover:border-[#0086C0]/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[#0086C0]" />
            <span className="text-[#0E374A] font-semibold text-[15px]" style={{ fontFamily: "'Bree Serif', serif" }}>
              {localeData.flag} {localeData.name}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#0086C0] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
        <Globe className="w-4 h-4 text-[#0086C0]" />
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
        className="block w-full text-center py-4 rounded-xl text-white bg-gradient-to-r from-[#A3B117] to-[#0086C0] font-semibold text-[16px] shadow-lg active:scale-95 transition-transform"
        style={{ fontFamily: "'Bree Serif', serif" }}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="px-6 py-2.5 rounded-xl bg-[#0086C0] text-white font-semibold tracking-wide transition-all duration-300 hover:shadow-[0_0_25px_rgba(163,177,23,0.5)] hover:scale-105"
      style={{ fontFamily: "'Bree Serif', serif" }}
    >
      {label}
    </Link>
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
  
  const langRef = useRef(null);
  const mobileMenuRef = useRef(null);
  
  const scrolled = useScrollDetection(20);
  const isAdmin = useAuth();

  const currentLocale = useMemo(() => {
    if (isAdminPath(pathname)) return null;
    
    const segment = pathname.split('/')[1] || '';
    return LOCALES.includes(segment) 
      ? segment 
      : CONFIG.defaultLocale;
  }, [pathname]);

  const t = useLocalTranslations(currentLocale);

  useEffect(() => setMounted(true), []);

  useClickOutside([langRef, mobileMenuRef], () => {
    setLangOpen(false);
    setMobileOpen(false);
  });

  const buildHref = useCallback(
    (path) => {
      const cleanPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
      
      if (isAdminPath(cleanPath)) return cleanPath;
      
      return currentLocale 
        ? `/${currentLocale}${cleanPath}` 
        : cleanPath || '/';
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

  if (!mounted) return null;

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50 
        transition-all duration-500
        ${
          scrolled
            ? 'bg-white/95 backdrop-blur-xl shadow-[0_8px_25px_rgba(0,0,0,0.08)]'
            : 'bg-white/40 backdrop-blur-lg'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
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
            {NAV_ITEMS.map(({ key, path }) => (
              <NavLink
                key={key}
                label={t(key)}
                href={buildHref(path)}
                isActive={checkActive(path)}
              />
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <LanguageSelector
              currentLocale={currentLocale}
              isOpen={langOpen}
              onToggle={() => setLangOpen(!langOpen)}
              onClose={() => setLangOpen(false)}
              langRef={langRef}
            />
            <BookNowButton href={buildHref('/packages')} label={t('bookNow')} />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg bg-white/60 backdrop-blur-md hover:bg-white/20 transition-colors z-10"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-6 h-6 text-[#0E374A]" />
            ) : (
              <Menu className="w-6 h-6 text-[#0E374A]" />
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
            onToggle={() => setLangOpen(!langOpen)}
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
        </div>
      )}
    </nav>
  );
}