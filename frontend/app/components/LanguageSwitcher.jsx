// frontend/app/components/LanguageSwitcher.jsx
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useCallback } from 'react';

/* ------------------------------------------------------
 * 🌐 Supported languages with flags & full names
 * ------------------------------------------------------ */
const LANGS = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es';

/* ------------------------------------------------------
 * 🧭 Build new locale href
 * ------------------------------------------------------ */
function buildLocaleHref(pathname, queryString, newLocale) {
  const parts = pathname.split('/').filter(Boolean);
  const supported = new Set(LANGS.map((l) => l.code));

  // Remove current locale if present
  if (supported.has(parts[0])) parts.shift();

  // Construct new path with new locale
  const newPath = `/${[newLocale, ...parts].join('/')}`.replace(/\/+/g, '/');
  return queryString ? `${newPath}?${queryString}` : newPath;
}

/* ------------------------------------------------------
 * 🌍 LanguageSwitcher Component
 * ------------------------------------------------------ */
export default function LanguageSwitcher({ closeMenu }) {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString();

  // Detect current locale
  const supported = useMemo(() => new Set(LANGS.map((l) => l.code)), []);
  const parts = pathname.split('/').filter(Boolean);
  const currentLocale = supported.has(parts[0]) ? parts[0] : DEFAULT_LOCALE;

  // Build href for each language
  const getHref = useCallback(
    (code) => buildLocaleHref(pathname, queryString, code),
    [pathname, queryString]
  );

  return (
    <div
      aria-label="Language switcher"
      className="flex flex-col min-w-[160px] py-1 select-none"
    >
      {LANGS.map((lang) => {
        const isActive = lang.code === currentLocale;
        const href = getHref(lang.code);

        const handleClick = () => {
          if (typeof closeMenu === 'function') {
            // Smooth delay to let navigation start
            setTimeout(() => closeMenu(), 120);
          }
        };

        return (
          <Link
            key={lang.code}
            href={href}
            prefetch={false}
            onClick={handleClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 outline-none
              focus:ring-2 focus:ring-green-500 focus:ring-offset-1
              ${
                isActive
                  ? 'bg-green-100 text-green-800 font-semibold ring-1 ring-green-400'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-green-700'
              }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.label}</span>
          </Link>
        );
      })}
    </div>
  );
}