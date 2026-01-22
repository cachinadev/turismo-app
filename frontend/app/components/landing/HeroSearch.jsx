// frontend/app/components/landing/HeroSearch.jsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { API_BASE } from "@/app/lib/config";
import { mediaUrl } from "@/app/lib/media";

const SUPPORTED = ["es", "en", "fr", "pt", "ru"];
const DEFAULT_LOCALE = "en";

/* ----------------------------
 * Locale helper
 * ---------------------------- */
function useLocale(explicit) {
  const pathname = usePathname() || "/";
  return useMemo(() => {
    if (explicit && SUPPORTED.includes(explicit)) return explicit;
    const seg = pathname.split("/").filter(Boolean)[0];
    return SUPPORTED.includes(seg) ? seg : DEFAULT_LOCALE;
  }, [pathname, explicit]);
}

/* ----------------------------
 * Safe getters + translations
 * ---------------------------- */
const get = (obj, path) =>
  path.split(".").reduce((acc, p) => (acc == null ? acc : acc[p]), obj);

const trFirst = (dict, keys, fb = "") => {
  for (const k of keys) {
    const v = get(dict, k);
    if (typeof v === "string") return v;
  }
  return fb;
};

function splitExamples(str) {
  return String(str || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/* ----------------------------
 * Helpers
 * ---------------------------- */
function safeStr(v) {
  return typeof v === "string" ? v : "";
}

function pkgTitle(pkg) {
  return safeStr(pkg?.title || pkg?.name || pkg?.headline || "");
}

function pkgSlug(pkg) {
  return safeStr(pkg?.slug || pkg?._id || pkg?.id || "");
}

function pkgCity(pkg) {
  return safeStr(pkg?.city || pkg?.region || pkg?.location?.city || "");
}

function pkgImg(pkg) {
  const m0 = Array.isArray(pkg?.media) ? pkg.media[0] : null;
  const url = m0?.url || m0?.src || m0;
  return url ? mediaUrl(url) : "";
}

function normalizePackageList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function fetchWithTimeout(url, { timeoutMs = 6500, signal, ...opts } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  // Merge external signal + internal timeout signal (compatible way)
  const mergedSignal = (() => {
    if (!signal) return ctrl.signal;
    // If either aborts, abort ctrl
    const onAbort = () => ctrl.abort();
    try {
      signal.addEventListener("abort", onAbort, { once: true });
    } catch {}
    return ctrl.signal;
  })();

  try {
    const res = await fetch(url, { ...opts, signal: mergedSignal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/* =============================================================================
 * HeroSearch
 * - Typeahead results from API
 * - “Try” suggestions become real packages (if found) and link to package page
 * - Fallback: if not found, they behave as search queries
 * ============================================================================= */
export default function HeroSearch({ locale }) {
  const router = useRouter();
  const lang = useLocale(locale);

  const [msgs, setMsgs] = useState({});
  const [query, setQuery] = useState("");

  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  // “Try” chips: resolved to real packages when possible
  const [tryChips, setTryChips] = useState([]); // [{label, type:'package'|'search', href, pkg?}]

  // keyboard nav
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  /* ----------------------------
   * Load translations
   * ---------------------------- */
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
    ["Home.searchPlaceholder", "Packages.searchPlaceholder"],
    "Search tours (Uros, Taquile, Machu Picchu...)"
  );

  const btnLabel = trFirst(msgs, ["Home.searchButton", "Packages.searchButton"], "Search");

  const tryPrefix = trFirst(msgs, ["Home.searchTryPrefix", "Packages.searchTryPrefix"], "Try:");

  // If you want EXACT “Uros, Taquile, Machu Picchu” always, set it here
  const examplesRaw = trFirst(
    msgs,
    ["Home.searchTryExamples", "Packages.searchTryExamples"],
    "Uros, Taquile, Machu Picchu"
  );

  const examples = useMemo(() => splitExamples(examplesRaw), [examplesRaw]);

  /* ----------------------------
   * Navigation
   * ---------------------------- */
  const goSearch = useCallback(
    (q) => {
      const trimmed = String(q || "").trim();
      if (!trimmed) return;
      router.push(`/${lang}/packages?q=${encodeURIComponent(trimmed)}`);
    },
    [router, lang]
  );

  const goPackage = useCallback(
    (pkg) => {
      const slug = pkgSlug(pkg);
      if (!slug) return;
      router.push(`/${lang}/packages/${encodeURIComponent(slug)}`);
    },
    [router, lang]
  );

  /* ----------------------------
   * Close on outside click / ESC
   * ---------------------------- */
  useEffect(() => {
    const onDown = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ----------------------------
   * Fetch search results (typeahead)
   * ---------------------------- */
  const performSearch = useCallback(
    async (q) => {
      const trimmed = String(q || "").trim();
      if (trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      // abort previous
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);

      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "8",
          active: "true",
          q: trimmed, // backend may support q
        });

        const url = `${API_BASE}/api/packages?${params.toString()}`;
        const res = await fetchWithTimeout(url, { timeoutMs: 6500, signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json().catch(() => ({}));
        let list = normalizePackageList(data);

        // If backend doesn't filter by q, do a light client filter
        const lower = trimmed.toLowerCase();
        list = list.filter((p) => pkgTitle(p).toLowerCase().includes(lower) || pkgCity(p).toLowerCase().includes(lower));

        // ensure media URLs normalized
        list = list.slice(0, 8).map((p) => ({
          ...p,
          media: Array.isArray(p?.media)
            ? p.media.map((m) => ({ ...m, url: mediaUrl(m?.url || m?.src || m) }))
            : p?.media,
        }));

        setResults(list);
      } catch (err) {
        // ignore abort
        if (err?.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [setResults]
  );

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (!isFocused) return;

    debounceRef.current = setTimeout(() => {
      performSearch(trimmed);
      setIsOpen(true);
      setActiveIndex(-1);
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isFocused, performSearch]);

  /* ----------------------------
   * Resolve “Try” chips to real packages (when possible)
   * - For each example term, we try to fetch 1 matching package.
   * - If found => chip links to package page.
   * - If not found => chip links to search page.
   * ---------------------------- */
  useEffect(() => {
    let alive = true;

    async function resolveTryChips() {
      const base = examples.slice(0, 3); // keep it clean
      if (!base.length) {
        setTryChips([]);
        return;
      }

      const tasks = base.map(async (term) => {
        const q = String(term || "").trim();
        if (!q) return { label: term, type: "search", href: `/${lang}/packages?q=${encodeURIComponent(term)}` };

        try {
          const params = new URLSearchParams({
            page: "1",
            limit: "12",
            active: "true",
            q,
          });

          const url = `${API_BASE}/api/packages?${params.toString()}`;
          const res = await fetchWithTimeout(url, { timeoutMs: 6500, cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json().catch(() => ({}));
          const list = normalizePackageList(data);

          // prefer best match by title contains term
          const lower = q.toLowerCase();
          const match =
            list.find((p) => pkgTitle(p).toLowerCase().includes(lower)) ||
            list.find((p) => pkgCity(p).toLowerCase().includes(lower)) ||
            list[0];

          const slug = pkgSlug(match);
          if (match && slug) {
            return {
              label: term,
              type: "package",
              href: `/${lang}/packages/${encodeURIComponent(slug)}`,
              pkg: match,
            };
          }

          return { label: term, type: "search", href: `/${lang}/packages?q=${encodeURIComponent(term)}` };
        } catch {
          return { label: term, type: "search", href: `/${lang}/packages?q=${encodeURIComponent(term)}` };
        }
      });

      const resolved = await Promise.all(tasks);
      if (!alive) return;

      // If you want them randomized between these, shuffle:
      // resolved.sort(() => Math.random() - 0.5);

      setTryChips(resolved);
    }

    resolveTryChips();
    return () => {
      alive = false;
    };
  }, [examples, lang]);

  /* ----------------------------
   * Events
   * ---------------------------- */
  const onSubmit = (e) => {
    e.preventDefault();

    // If user selected a suggestion via keyboard
    if (isOpen && activeIndex >= 0 && results[activeIndex]) {
      goPackage(results[activeIndex]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    goSearch(query);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const clearQuery = () => {
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    setIsOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  const onKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      // handled by onSubmit
    } else if (e.key === "Tab") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  /* =============================================================================
   * UI
   * ============================================================================= */
  return (
    <div ref={boxRef} className="w-full max-w-3xl mx-auto relative">
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
          ${isFocused ? "border-[#0086C0] ring-4 ring-[#0086C0]/20 scale-[1.01] shadow-2xl" : "border-[#0086C0]/40 shadow-lg"}
        `}
        role="search"
        aria-label={placeholder}
      >
        <div className="pl-6 pr-3 flex items-center gap-2">
          <Search className={`w-5 h-5 transition-colors duration-300 ${isFocused ? "text-[#0086C0]" : "text-[#64748B]"}`} />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#0086C0]" aria-label="Loading" />}
        </div>

        <input
          ref={inputRef}
          type="text"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (query.trim().length >= 2) setIsOpen(true);
          }}
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
            min-w-0
          "
          style={{ fontFamily: "'Tequilla Regular', serif" }}
          autoComplete="off"
          enterKeyHint="search"
        />

        {/* Clear button */}
        {query.trim().length > 0 && (
          <button
            type="button"
            onClick={clearQuery}
            className="mr-2 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
            aria-label="Clear"
            title="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}

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
            disabled:opacity-70
          "
          style={{ fontFamily: "'Bree Serif', serif" }}
          disabled={!query.trim()}
        >
          <span>{btnLabel}</span>
          <Search className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </form>

      {/* Typeahead dropdown */}
      {isOpen && (query.trim().length >= 2 || results.length > 0) && (
        <div className="absolute left-0 right-0 mt-3 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {results.length === 0 ? (
              <div className="px-5 py-4 text-slate-600">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0086C0]" />
                    <span style={{ fontFamily: "'Bree Serif', serif" }}>Searching…</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Bree Serif', serif" }}>
                    No packages found. Press <b>Enter</b> to search.
                  </div>
                )}
              </div>
            ) : (
              <ul className="py-2">
                {results.map((pkg, i) => {
                  const title = pkgTitle(pkg) || "Package";
                  const city = pkgCity(pkg);
                  const slug = pkgSlug(pkg);
                  const href = slug ? `/${lang}/packages/${encodeURIComponent(slug)}` : `/${lang}/packages?q=${encodeURIComponent(title)}`;
                  const img = pkgImg(pkg);

                  const active = i === activeIndex;

                  return (
                    <li key={`${slug || title}-${i}`}>
                      <Link
                        href={href}
                        onClick={() => {
                          setIsOpen(false);
                          setActiveIndex(-1);
                        }}
                        className={`
                          flex items-center gap-4 px-5 py-3
                          transition-colors
                          ${active ? "bg-[#0086C0]/10" : "hover:bg-slate-50"}
                        `}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                          {img ? (
                            // using img tag keeps it simple for external urls too
                            // (Next/Image would require domain config)
                            <img src={img} alt={title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No image</div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[#0E374A] truncate" style={{ fontFamily: "'Bree Serif', serif" }}>
                            {title}
                          </div>
                          <div className="text-sm text-slate-600 truncate" style={{ fontFamily: "'Tequilla Regular', serif" }}>
                            {city ? `📍 ${city}` : "Tour package"}
                          </div>
                        </div>

                        <div className="text-sm text-slate-500" style={{ fontFamily: "'Bree Serif', serif" }}>
                          View →
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer quick action */}
            <div className="border-t border-slate-200 px-5 py-3 bg-white">
              <button
                type="button"
                onClick={() => {
                  goSearch(query);
                  setIsOpen(false);
                  setActiveIndex(-1);
                }}
                className="text-sm font-bold text-[#0086C0] hover:underline"
                style={{ fontFamily: "'Bree Serif', serif" }}
              >
                Search “{query.trim() || "…"}” in all packages →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Try chips (real packages when possible) */}
      {tryChips.length > 0 && (
        <div className="mt-6 text-center">
          <span className="text-white/90 text-sm mr-3" style={{ fontFamily: "'Tequilla Regular', serif" }}>
            {tryPrefix}
          </span>

          {tryChips.map((chip, i) => (
            <Link
              key={`${chip.label}-${i}`}
              href={chip.href}
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
                focus:outline-none
                focus:ring-2
                focus:ring-white/40
              "
              style={{ fontFamily: "'Bree Serif', serif" }}
              aria-label={chip.type === "package" ? `Open package: ${chip.label}` : `Search: ${chip.label}`}
              title={chip.type === "package" ? `Open package` : `Search`}
              onClick={() => {
                // also put text into the box (nice UX)
                setQuery(chip.label);
                setIsOpen(false);
                setActiveIndex(-1);
              }}
            >
              {chip.label}
              {chip.type === "package" ? <span className="ml-2 text-white/80">↗</span> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
