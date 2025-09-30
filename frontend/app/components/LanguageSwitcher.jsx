// frontend/app/components/LanguageSwitcher.jsx
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const LANGS = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'pt', label: 'PT' },
  { code: 'ru', label: 'RU' },
];

const DEFAULT_LOCALE =
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es';

export default function LanguageSwitcher() {
  const pathname = usePathname() || '/';
  const search = useSearchParams();
  const qs = search?.toString();

  const supported = new Set(LANGS.map((l) => l.code));
  const parts = pathname.split('/').filter(Boolean);

  const current = supported.has(parts[0]) ? parts[0] : DEFAULT_LOCALE;
  const rest = supported.has(parts[0]) ? parts.slice(1) : parts;

  const buildHref = (code) => {
    const path = `/${[code, ...rest].join('/')}`.replace(/\/+/g, '/');
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <nav
      aria-label="Language switcher"
      className="flex items-center gap-2"
    >
      {LANGS.map((l) => {
        const active = l.code === current;
        return (
          <Link
            key={l.code}
            href={buildHref(l.code)}
            prefetch={false}
            aria-current={active ? 'page' : undefined}
            className={`text-xs font-semibold transition-colors ${
              active
                ? 'text-brand-700 underline'
                : 'text-slate-600 hover:text-brand-700'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
