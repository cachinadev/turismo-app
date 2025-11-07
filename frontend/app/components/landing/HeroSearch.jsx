// frontend/app/components/landing/HeroSearch.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/* ------------------------------------------------------
 * 🌍 Localization Settings
 * ------------------------------------------------------ */
const SUPPORTED = ['es', 'en', 'fr', 'pt', 'ru'];
const DEFAULT_LOCALE = 'en';

/* ------------------------------------------------------
 * 🔎 Utility helpers
 * ------------------------------------------------------ */
function useLocale(explicit) {
  const pathname = usePathname() || '/';
  return useMemo(() => {
    if (explicit && SUPPORTED.includes(explicit)) return explicit;
    const seg = pathname.split('/').filter(Boolean)[0];
    return SUPPORTED.includes(seg) ? seg : DEFAULT_LOCALE;
  }, [pathname, explicit]);
}

const get = (obj, path) =>
  path.split('.').reduce((acc, p) => (acc == null ? acc : acc[p]), obj);

const tr = (dict, key, fb = '') => {
  const v = get(dict, key);
  return typeof v === 'string' ? v : fb;
};

const trFirst = (dict, keys, fb = '') => {
  for (const k of keys) {
    const v = get(dict, k);
    if (typeof v === 'string') return v;
  }
  return fb;
};

/* ------------------------------------------------------
 * 🚀 Component
 * ------------------------------------------------------ */
export default function HeroSearch({ locale }) {
  const router = useRouter();
  const lang = useLocale(locale);

  const [msgs, setMsgs] = useState({});
  const [query, setQuery] = useState('');

  /* ---- Load localized messages dynamically ---- */
  useEffect(() => {
    let mounted = true;
    import(`@/messages/${lang}.json`)
      .then((m) => mounted && setMsgs(m.default || {}))
      .catch(() => mounted && setMsgs({}));
    return () => {
      mounted = false;
    };
  }, [lang]);

  /* ---- Localized strings ---- */
  const placeholder = trFirst(
    msgs,
    ['Home.searchPlaceholder', 'Packages.searchPlaceholder'],
    'Search tours (Uros, Taquile, Machu Picchu...)'
  );

  const btnLabel = trFirst(
    msgs,
    ['Home.searchButton', 'Packages.searchButton'],
    'Search'
  );

  const tryPrefix = trFirst(
    msgs,
    ['Home.searchTryPrefix', 'Packages.searchTryPrefix'],
    'Try:'
  );

  const examplesRaw = trFirst(
    msgs,
    ['Home.searchTryExamples', 'Packages.searchTryExamples'],
    'Uros Islands, Taquile, Machu Picchu'
  );

  const examples = examplesRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  /* ---- Submit handler ---- */
  const onSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/${lang}/packages?q=${encodeURIComponent(trimmed)}`);
  };

  /* ---- Auto-fill from example click ---- */
  const onExampleClick = (ex) => {
    setQuery(ex);
    router.push(`/${lang}/packages?q=${encodeURIComponent(ex)}`);
  };

  /* ------------------------------------------------------
   * 💎 UI
   * ------------------------------------------------------ */
  return (
    <div className="w-full max-w-4xl mx-auto">
      <form
        onSubmit={onSubmit}
        className="flex items-stretch bg-white/95 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm border border-white/20 focus-within:ring-4 focus-within:ring-amber-300 transition-all"
        aria-label={placeholder}
      >
        <input
          type="text"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-5 py-4 text-gray-800 placeholder-gray-400 focus:outline-none text-base sm:text-lg"
        />
        <button
          type="submit"
          className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-base sm:text-lg transition-colors duration-200"
        >
          {btnLabel}
        </button>
      </form>

      {/* Example terms */}
      <div className="mt-4 text-white/90 text-sm sm:text-base text-center sm:text-left">
        <span className="font-medium text-white/80 mr-2">{tryPrefix}</span>
        {examples.map((ex, i) => (
          <button
            key={`${ex}-${i}`}
            type="button"
            onClick={() => onExampleClick(ex)}
            className="underline decoration-white/40 hover:decoration-white hover:text-amber-200 transition-colors mx-1"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
