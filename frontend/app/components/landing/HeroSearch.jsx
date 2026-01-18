'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

const SUPPORTED = ['es', 'en', 'fr', 'pt', 'ru'];
const DEFAULT_LOCALE = 'en';

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

const trFirst = (dict, keys, fb = '') => {
  for (const k of keys) {
    const v = get(dict, k);
    if (typeof v === 'string') return v;
  }
  return fb;
};

export default function HeroSearch({ locale }) {
  const router = useRouter();
  const lang = useLocale(locale);

  const [msgs, setMsgs] = useState({});
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    let mounted = true;
    import(`@/messages/${lang}.json`)
      .then((m) => mounted && setMsgs(m.default || {}))
      .catch(() => mounted && setMsgs({}));
    return () => {
      mounted = false;
    };
  }, [lang]);

  const placeholder = trFirst(
    msgs,
    ['Home.searchPlaceholder', 'Packages.searchPlaceholder'],
    'Buscar tours (Machu Picchu, Cusco, Arequipa...)'
  );

  const btnLabel = trFirst(
    msgs,
    ['Home.searchButton', 'Packages.searchButton'],
    'Buscar'
  );

  const tryPrefix = trFirst(
    msgs,
    ['Home.searchTryPrefix', 'Packages.searchTryPrefix'],
    'Prueba:'
  );

  const examplesRaw = trFirst(
    msgs,
    ['Home.searchTryExamples', 'Packages.searchTryExamples'],
    'Machu Picchu, Cusco, Lima'
  );

  const examples = examplesRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const onSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/${lang}/packages?q=${encodeURIComponent(trimmed)}`);
  };

  const onExampleClick = (ex) => {
    setQuery(ex);
    router.push(`/${lang}/packages?q=${encodeURIComponent(ex)}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Search Box */}
      <form
        onSubmit={onSubmit}
        className={`
          flex items-center 
          bg-white 
          rounded-2xl 
          overflow-hidden 
          shadow-xl 
          backdrop-blur-sm 
          border-2 
          transition-all 
          duration-300
          ${isFocused 
            ? 'border-[#0086C0] ring-4 ring-[#0086C0]/20 scale-[1.01] shadow-2xl' 
            : 'border-[#0086C0]/40 shadow-lg'
          }
        `}
      >

        <div className="pl-6 pr-3">
          <Search 
            className={`w-5 h-5 transition-colors duration-300 ${
              isFocused ? 'text-[#0086C0]' : 'text-[#64748B]'
            }`} 
          />
        </div>


        <input
          type="text"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            flex-1 
            py-5 
            text-[#0E374A] 
            placeholder-[#64748B]/70
            focus:outline-none 
            text-base 
            bg-transparent
          "
          style={{ fontFamily: "'Tequilla Regular', serif" }}
        />


        <button
          type="submit"
          className="
            px-8 
            py-5 
            bg-gradient-to-r 
            from-[#0086C0] 
            to-[#0E374A] 
            text-white 
            font-bold 
            text-base
            transition-all 
            duration-300 
            hover:from-[#0086C0]
            hover:to-[#0E374A]/80
            hover:shadow-lg
            active:scale-95
            flex 
            items-center 
            gap-2 
            group
          "
          style={{ fontFamily: "'Bree Serif', serif" }}
        >
          <span>{btnLabel}</span>
          <Search className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </form>

      {/* Examples */}
      {examples.length > 0 && (
        <div className="mt-6 text-center">
          <span 
            className="text-white/90 text-sm mr-3"
            style={{ fontFamily: "'Tequilla Regular', serif" }}
          >
            {tryPrefix}
          </span>

          {examples.map((ex, i) => (
            <button
              key={`${ex}-${i}`}
              type="button"
              onClick={() => onExampleClick(ex)}
              className="
                inline-flex 
                items-center 
                px-4 
                py-2 
                mx-1 
                mb-2 
                bg-white/20
                backdrop-blur-sm 
                rounded-full 
                hover:bg-white/30
                transition-all 
                duration-300 
                border 
                border-white/30
                text-white
                text-sm
                font-medium
                hover:scale-105
                active:scale-95
              "
              style={{ fontFamily: "'Bree Serif', serif" }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}