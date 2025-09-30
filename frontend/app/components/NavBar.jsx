// frontend/app/components/NavBar.jsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// ====== Branding (env) ======
const BRAND_NAME   = process.env.NEXT_PUBLIC_BRAND_NAME   || 'Vicuña Adventures';
const BRAND_LOGO   = process.env.NEXT_PUBLIC_BRAND_LOGO   || '/brand/logo.png';
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Vicuña Adventures S.A.C.';
const CONTACT_EMAIL= process.env.NEXT_PUBLIC_CONTACT_EMAIL|| 'contact@vicuadvent.com';

// ====== Contact / copy (env) ======
const CONTACT_PHONE  = process.env.NEXT_PUBLIC_PHONE  || '+51 982 397 386';
const CONTACT_HOURS  = process.env.NEXT_PUBLIC_HOURS  || 'Mon–Fri 9–7, Sat 9–1 (UTC−5)';
const ADVISOR_TEXT   = process.env.NEXT_PUBLIC_ADVISOR_TEXT || 'Speak to your travel advisor';
const AWARD_BADGE    = process.env.NEXT_PUBLIC_AWARD_BADGE  || 'Winners in Puno';

// ====== Locales ======
const LOCALES = ['es', 'en'];
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en';

// ====== Palette ======
const COLORS = {
  primary: "#386b36ff", // dark green
  bg: '#C6E9EF',        // airy blue
  accent: '#FCFD97',    // soft yellow
  textDark: '#0f172a',
  text: '#334155',
  white: '#ffffff',
};

// Utils
function toTelHref(n = '') {
  const digits = String(n).replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}
function isAdminPath(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname() || '/';

  const [mounted, setMounted]   = useState(false);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const read = () => {
      try { setIsAdmin(Boolean(localStorage.getItem('token'))); } catch { setIsAdmin(false); }
    };
    read();
    const onStorage = (e) => { if (e.key === 'token') read(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const currentLocale = useMemo(() => {
    if (isAdminPath(pathname)) return null;
    const seg = pathname.split('/')[1] || '';
    return LOCALES.includes(seg) ? seg : null;
  }, [pathname]);

  const publicHref = useCallback((path) => {
    const p = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
    if (isAdminPath(p)) return p;
    return currentLocale ? `/${currentLocale}${p}` : (path === '/' ? '/' : p);
  }, [currentLocale]);

  const switchLocale = useCallback((targetLocale) => {
    if (!targetLocale || !LOCALES.includes(targetLocale)) return;
    if (isAdminPath(pathname)) return;
    const parts = pathname.split('/');
    const first = parts[1] || '';
    if (LOCALES.includes(first)) {
      if (first === targetLocale) return;
      parts[1] = targetLocale;
    } else {
      parts.splice(1, 0, targetLocale);
    }
    const nextPath = parts.join('/') || '/';
    setMobileOpen(false);
    router.replace(nextPath);
  }, [pathname, router]);

  const isActive = useCallback((href) => {
    const full = publicHref(href);
    if (full === '/') {
      return (
        pathname === '/' ||
        pathname === `/${DEFAULT_LOCALE}` ||
        pathname === `/${currentLocale || DEFAULT_LOCALE}`
      );
    }
    return pathname.startsWith(full);
  }, [pathname, publicHref, currentLocale]);

  const logout = useCallback(() => {
    try { localStorage.removeItem('token'); } catch {}
    setIsAdmin(false);
    setMobileOpen(false);
    router.replace(publicHref('/'));
    router.refresh();
  }, [router, publicHref]);

  // Brand
  const Brand = (
    <div className="flex items-center gap-2">
      {BRAND_LOGO ? (
        <img
          src={BRAND_LOGO}
          alt={BRAND_NAME}
          className="h-8 w-auto"
          loading="eager"
          decoding="async"
        />
      ) : (
        <span className="text-xl font-semibold tracking-tight" style={{ color: COLORS.textDark }}>
          {BRAND_NAME}
        </span>
      )}
    </div>
  );

  const linkBase = 'whitespace-nowrap transition-colors';
  const linkActiveStyle = { color: COLORS.primary };
  const linkStyle = { color: COLORS.text };

  const NavLinks = (
    <>
      {[
        ['HOME',          '/'],
        ['PACKAGES',      '/packages'],
        ['DESTINATIONS',  '/destinations'],
        ['ABOUT',         '/about'],
        ['TESTIMONIALS',  '/testimonials'],
        ['CONTACT',       '/contact'],
      ].map(([label, href]) => {
        const active = isActive(href);
        return (
          <Link
            key={label}
            href={publicHref(href)}
            prefetch={false}
            className={linkBase}
            style={active ? linkActiveStyle : linkStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = active ? COLORS.primary : COLORS.text; }}
            aria-current={active ? 'page' : undefined}
            onClick={() => setMobileOpen(false)}
          >
            {label}
          </Link>
        );
      })}
    </>
  );

  const LangSwitch = (
    <div className="flex items-center gap-2 text-xs">
      {LOCALES.map((code) => {
        const active = (currentLocale || DEFAULT_LOCALE) === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchLocale(code)}
            className="font-semibold transition-colors"
            style={{ color: active ? COLORS.primary : COLORS.text }}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );

  if (!mounted) return null;

  return (
    <header role="banner" className="sticky top-0 z-40 shadow-md">
      {/* Identity strip */}
      <div style={{ backgroundColor: COLORS.primary, color: COLORS.white }} className="text-xs">
        <div className="container-default flex items-center justify-between h-8">
          <span className="font-bold">{COMPANY_NAME}</span>
          <div className="flex gap-4 items-center">
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold hover:underline">
              {CONTACT_EMAIL}
            </a>
            <a href={toTelHref(CONTACT_PHONE)} className="font-semibold hover:underline">
              {CONTACT_PHONE}
            </a>
          </div>
        </div>
      </div>

      {/* Top contact bar (white surface for contrast) */}
      <div className="border-b shadow-sm" style={{ backgroundColor: COLORS.white, color: COLORS.text }}>
        <div className="container-default h-9 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">{CONTACT_HOURS}</span>
            <span className="hidden sm:inline">•</span>
            <Link
              href={publicHref('/contact')}
              prefetch={false}
              style={{ color: COLORS.text }}
              className="hover:underline"
              onClick={() => setMobileOpen(false)}
            >
              {ADVISOR_TEXT}
            </Link>
          </div>
          <div className="truncate">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
              style={{ backgroundColor: COLORS.accent, color: '#713f12' }}
            >
              <span aria-hidden>🏆</span>
              <span className="font-medium">{AWARD_BADGE}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div
        className="backdrop-blur border-b shadow-md"
        style={{ backgroundColor: 'rgba(198,233,239,0.9)', borderColor: '#e2e8f0' }}
      >
        <div className="container-default grid grid-cols-3 items-center h-16">
          {/* Left */}
          <Link href={isAdmin ? '/admin/dashboard' : publicHref('/')}
                prefetch={false}
                className="flex items-center gap-2 group justify-self-start"
                onClick={() => setMobileOpen(false)}>
            {Brand}
          </Link>

          {/* Center */}
          <nav className="hidden lg:flex items-center gap-6 text-sm justify-center" aria-label="Primary">
            {NavLinks}
          </nav>

          {/* Right */}
          <div className="hidden lg:flex items-center gap-5 justify-self-end">
            {LangSwitch}
            <Link href={publicHref('/packages')}
                  prefetch={false}
                  className="btn whitespace-nowrap"
                  style={{ backgroundColor: COLORS.primary, color: COLORS.white }}>
              Book now
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
