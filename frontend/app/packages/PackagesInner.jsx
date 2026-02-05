// frontend/app/packages/PackagesInner.jsx
/* eslint-disable @next/next/no-img-element */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';
import { mediaUrl } from '@/app/lib/media';

/* =================== Translation helper =================== */
async function loadMessages(locale) {
  try {
    const mod = await import(`@/messages/${locale}.json`);
    return mod.default?.Packages || {};
  } catch {
    console.warn(`⚠️ Missing translations for locale "${locale}"`);
    return {};
  }
}
const tr = (dict, key, fallback) => dict?.[key] ?? (fallback ?? key);

/* =================== helpers =================== */
const money = (v, curr = 'PEN', locale = 'en-US') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: (curr || 'PEN').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const CITIES = ['', 'Puno', 'Cusco', 'Lima', 'Arequipa', 'Others'];
const LIMIT_OPTIONS = [9, 12, 24, 48];
const RAW_SORTS = [
  { v: '', label: 'Relevance', key: 'sort.relevance' },
  { v: 'price_asc', label: 'Price ↑', key: 'sort.priceAsc' },
  { v: 'price_desc', label: 'Price ↓', key: 'sort.priceDesc' },
  { v: 'recent', label: 'Most recent', key: 'sort.recent' },
];

// Default map centers per city (fallbacks for missing coords)
const CITY_CENTER = {
  Puno:     { lat: -15.8402, lng: -70.0219 },
  Cusco:    { lat: -13.5319, lng: -71.9675 },
  Lima:     { lat: -12.0464, lng: -77.0428 },
  Arequipa: { lat: -16.4090, lng: -71.5375 },
  Others:   { lat:  -9.1899, lng: -75.0152 }, // Peru centroid/fallback
};

const toNumOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const shortText = (s, n = 140) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const imgListFrom = (p) => {
  const imgs = Array.isArray(p?.media)
    ? p.media.filter(m => m && m.url && (m.type === 'image' || !m.type)).map(m => mediaUrl(m.url))
    : [];
  return imgs.length ? imgs.slice(0, 8) : ['https://picsum.photos/600/400'];
};

const withinBounds = (p, b) => {
  if (!b) return true;
  const lat = p?.location?.lat;
  const lng = p?.location?.lng;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat <= b.n && lat >= b.s &&
    lng <= b.e && lng >= b.w
  );
};

const MapLoading = ({ label }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
    <div className="h-[70vh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
      <div className="text-center">
        <p className="font-bree text-xl mb-2" style={{ color: '#0E374A' }}>
          {label}
        </p>
      </div>
    </div>
  </div>
);

const PackagesMapLazy = dynamic(() => import('@/app/components/PackagesMapLeaflet'), {
  ssr: false,
  loading: () => <MapLoading label="Loading map..." />,
});

/* =================== Main Page (list + map) =================== */

export default function PackagesInner({ initial }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const locale = (pathname.split('/')[1] || 'es').split('?')[0]; // detect from /en/packages

  const [tt, setTT] = useState({});
  useEffect(() => {
    loadMessages(locale).then(setTT);
  }, [locale]);

  // Localize sort labels on the fly (fallback to English labels)
  const SORTS = useMemo(
    () =>
      RAW_SORTS.map(s => ({
        v: s.v,
        label: tr(tt, s.key, s.label),
      })),
    [tt]
  );

  // --- NoSSR gate for map subtree: fixes hydration mismatch ---
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // ---- STATE (seeded from SSR) ----
  const [q, setQ]               = useState(initial?.query?.q || '');
  const [city, setCity]         = useState(initial?.query?.city || '');
  const [category, setCategory] = useState(initial?.query?.category || '');
  const [maxDur, setMaxDur]     = useState(initial?.query?.maxDur || '');
  const [minPrice, setMinPrice] = useState(initial?.query?.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(initial?.query?.maxPrice || '');
  const [sort, setSort]         = useState(initial?.query?.sort || '');
  const [page, setPage]         = useState(initial?.page || 1);
  
  // Fix: Initialize state consistently between server and client
  const [limit, setLimit] = useState(12);
  const [view, setView] = useState('list');

  // Fix: Initialize state in useEffect to ensure consistency
  useEffect(() => {
    const savedLimit = Number(typeof window !== 'undefined' ? localStorage.getItem('pk_limit') : 0);
    const initialLimit = Number.isFinite(savedLimit) && savedLimit > 0 ? savedLimit : (initial?.limit || 12);
    setLimit(initialLimit);

    const pref = typeof window !== 'undefined' ? localStorage.getItem('pk_view') : '';
    const initialView = (initial?.query?.view === 'map' || pref === 'map') ? 'map' : 'list';
    setView(initialView);
  }, [initial]);

  const [items, setItems]     = useState(initial?.items || []);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(initial?.error || '');

  // Map UI state
  const [mapBounds, setMapBounds] = useState(null);   // {n,s,e,w}
  const [mapFilterActive, setMapFilterActive] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // debounce q for fetch + filter
  const [qDeb, setQDeb] = useState((initial?.query?.q || '').trim());
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Persist prefs
  useEffect(() => { 
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('pk_view', view); } catch {} 
    }
  }, [view]);
  
  useEffect(() => { 
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('pk_limit', String(limit)); } catch {} 
    }
  }, [limit]);

  // First load if SSR didn't include items
  const didMount = useRef(false);
  useEffect(() => {
    didMount.current = true;
    if (!Array.isArray(initial?.items) || initial.items.length === 0) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map view: show more by default (client only)
  useEffect(() => {
    if (view === 'map' && limit < 100) {
      setPage(1);
      setLimit(100);
    }
  }, [view, limit]);

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (qDeb) params.set('q', qDeb);
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    if (maxDur) params.set('maxDur', String(maxDur));
    if (minPrice) params.set('minPrice', String(minPrice));
    if (maxPrice) params.set('maxPrice', String(maxPrice));
    if (sort) params.set('sort', sort);
    if (view === 'map') params.set('view', 'map');
    params.set('page', String(page));
    params.set('limit', String(limit));
    const nextQS = params.toString();
    const curQS  = sp.toString();
    if (nextQS !== curQS) {
      router.replace(
        nextQS ? `/${locale}/packages?${nextQS}` : `/${locale}/packages`,
        { scroll: false }
      );
    }
  }, [qDeb, city, category, maxDur, minPrice, maxPrice, sort, page, limit, view, sp, router, locale]);

  // Abort stale requests
  const abortRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErr('');

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const params = new URLSearchParams();
      if (qDeb) params.set('q', qDeb);
      if (city) params.set('city', city);
      if (category) params.set('category', category);
      const _maxDur = toNumOrNull(maxDur);
      const _minP = toNumOrNull(minPrice);
      const _maxP = toNumOrNull(maxPrice);
      if (_maxDur != null) params.set('maxDur', String(_maxDur));
      if (_minP != null) params.set('minPrice', String(_minP));
      if (_maxP != null) params.set('maxPrice', String(_maxP));
      if (sort) params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`${API_BASE}/api/packages?${params}`, { cache: 'no-store', signal: ac.signal });
      const json = await res.json().catch(() => ({ items: [] }));

      const listRaw = Array.isArray(json) ? json : (json.items || []);
      const list = listRaw.map((p) => ({
        ...p,
        media: Array.isArray(p.media) ? p.media.map((m) => ({ ...m, url: mediaUrl(m.url) })) : [],
      }));

      setItems(list);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setErr('Could not load packages.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [qDeb, city, category, maxDur, minPrice, maxPrice, sort, page, limit]);

  // Sync URL + fetch whenever filters/pagination change
  useEffect(() => {
    if (!didMount.current) return;
    syncUrl();
    fetchData();
  }, [syncUrl, fetchData]);

  // Derived categories from current items (stable + sorted)
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((p) => { if (p?.category) set.add(p.category); });
    return ['', ...Array.from(set).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [items]);

  // Client-side filter
  const filtered = useMemo(() => {
    const minP = toNumOrNull(minPrice);
    const maxP = toNumOrNull(maxPrice);
    const maxD = toNumOrNull(maxDur);
    return items.filter((p) => {
      const priceNow = Number(p.effectivePrice ?? p.price);
      const dur = Number(p.durationHours ?? 0);
      if (minP != null && priceNow < minP) return false;
      if (maxP != null && priceNow > maxP) return false;
      if (maxD != null && dur > maxD) return false;
      if (city && p.city !== city) return false;
      if (category && p.category !== category) return false;
      if (qDeb) {
        const t = `${p.title || ''} ${p.description || ''}`;
        if (!t.toLowerCase().includes(qDeb.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, qDeb, city, category, minPrice, maxPrice, maxDur]);

  // Sort
  const sorted = useMemo(() => {
    const val = (p) => Number(p.effectivePrice ?? p.price);
    if (sort === 'price_asc')  return [...filtered].sort((a, b) => val(a) - val(b));
    if (sort === 'price_desc') return [...filtered].sort((a, b) => val(b) - val(a));
    if (sort === 'recent')     return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered;
  }, [filtered, sort]);

  // Pagination for list view
  const totalFiltered = sorted.length;
  const pages = Math.max(1, Math.ceil(totalFiltered / limit));
  useEffect(() => {
    if (page > pages) setPage(pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  const start = (page - 1) * limit;
  const pageItems = sorted.slice(start, start + limit);

  // Scroll to top on page change (list view)
  const lastPageRef = useRef(page);
  useEffect(() => {
    if (view === 'list' && lastPageRef.current !== page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      lastPageRef.current = page;
    }
  }, [page, view]);

  // --- Map data with geo fallbacks + marker thumbnails ---
  const mapPackagesBase = useMemo(() => {
    return sorted.map((p) => {
      const hasLat = typeof p?.location?.lat === 'number';
      const hasLng = typeof p?.location?.lng === 'number';
      let lat = hasLat ? p.location.lat : undefined;
      let lng = hasLng ? p.location.lng : undefined;

      if (!(hasLat && hasLng)) {
        const key = CITY_CENTER[p?.city] ? p.city : 'Others';
        const center = CITY_CENTER[key] || CITY_CENTER.Others;
        lat = center.lat; lng = center.lng;
      }

      const thumb = imgListFrom(p)[0];
      return {
        ...p,
        location: { lat, lng },          // ensure every item has coords for the map
        markerThumb: thumb,              // for picture markers
        __fallback: !(hasLat && hasLng), // mark if we used a default
      };
    });
  }, [sorted]);

  // Optional bounds filter ("Search this area")
  const mapPackages = useMemo(() => {
    if (!mapFilterActive || !mapBounds) return mapPackagesBase;
    return mapPackagesBase.filter(p => withinBounds(p, mapBounds));
  }, [mapPackagesBase, mapFilterActive, mapBounds]);

  const selectedPkg = useMemo(() => {
    if (!selectedId) return null;
    return mapPackages.find((p) => (p._id || p.id || p.slug) === selectedId) || null;
  }, [mapPackages, selectedId]);

  const onApplyFilters = () => setPage(1);
  const onClearFilters = () => {
    setQ(''); setCity(''); setCategory('');
    setMaxDur(''); setMinPrice(''); setMaxPrice('');
    setSort(''); setPage(1);
  };

  const chips = useMemo(() => {
    const cs = [];
    if (city) cs.push({ key: 'city', label: `${tr(tt,'chip.city','City')}: ${city}`, clear: () => setCity('') });
    if (category) cs.push({ key: 'category', label: `${tr(tt,'chip.category','Category')}: ${category}`, clear: () => setCategory('') });
    if (toNumOrNull(minPrice) != null) cs.push({ key: 'minPrice', label: `≥ ${money(minPrice)}`, clear: () => setMinPrice('') });
    if (toNumOrNull(maxPrice) != null) cs.push({ key: 'maxPrice', label: `≤ ${money(maxPrice)}`, clear: () => setMaxPrice('') });
    if (toNumOrNull(maxDur) != null)   cs.push({ key: 'maxDur',   label: `≤ ${maxDur} ${tr(tt,'hours','h')}`, clear: () => setMaxDur('') });
    if (qDeb) cs.push({ key: 'q', label: `"${qDeb}"`, clear: () => setQ('') });
    if (view === 'map' && mapFilterActive) cs.push({ key: 'bounds', label: tr(tt,'bounds','In this area'), clear: () => setMapFilterActive(false) });
    return cs;
  }, [city, category, minPrice, maxPrice, maxDur, qDeb, view, mapFilterActive, tt]);

  /* =================== Render =================== */
  return (
    <section className="container-default py-8 space-y-6" aria-busy={loading ? 'true' : 'false'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {tr(tt, 'title', 'Travel Packages')}
          </h1>
          <p className="text-slate-600 text-sm" aria-live="polite">
            {totalFiltered} {tr(tt, 'results', 'results')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`btn ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('list')}
            title={tr(tt, 'listView', 'List')}
          >
            🗒️ {tr(tt, 'listView', 'List')}
          </button>
          <button
            className={`btn ${view === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('map')}
            title={tr(tt, 'mapView', 'Map')}
          >
            🗺️ {tr(tt, 'mapView', 'Map')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="sr-only" htmlFor="q">{tr(tt, 'searchPlaceholder', 'Search')}</label>
            <input
              id="q"
              className="input w-full"
              placeholder={tr(tt, 'searchPlaceholder', 'Search by title or description…')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onApplyFilters()}
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="city">{tr(tt,'allCities','All cities')}</label>
            <select id="city" className="input w-full" value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c || 'all'} value={c}>
                  {c || tr(tt,'allCities','All cities')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="sr-only" htmlFor="category">{tr(tt,'allCategories','All categories')}</label>
            <select id="category" className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c || 'all'} value={c}>
                  {c || tr(tt,'allCategories','All categories')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="sr-only" htmlFor="sort">Sort</label>
            <select id="sort" className="input w-full" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.v || 'rel'} value={s.v}>{s.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 grid grid-cols-3 gap-2">
            <input
              className="input w-full"
              type="number"
              min={0}
              placeholder={`${tr(tt,'priceFrom','From')} $`}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <input
              className="input w-full"
              type="number"
              min={0}
              placeholder={`Max $`}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <input
              className="input w-full"
              type="number"
              min={1}
              placeholder={`≤ ${tr(tt,'hours','hours')}`}
              value={maxDur}
              onChange={(e) => setMaxDur(e.target.value)}
            />
          </div>

          <div className="md:col-span-6 flex items-center gap-2">
            <button className="btn" onClick={onApplyFilters} aria-busy={loading ? 'true' : 'false'}>
              {tr(tt,'apply','Apply')}
            </button>
            <button className="btn btn-ghost" onClick={onClearFilters}>
              {tr(tt,'clear','Clear')}
            </button>
          </div>
        </div>

        {/* Active chips */}
        {chips.length > 0 && (
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                className="badge bg-slate-100 hover:bg-slate-200"
                onClick={c.clear}
                title={tr(tt,'removeFilter','Remove filter')}
              >
                {c.label} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {err && (
        <div className="card">
          <div className="card-body">
            <p className="text-red-600">{err}</p>
            <button className="btn btn-ghost mt-2" onClick={fetchData}>
              {tr(tt,'retry','Retry')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="h-56 w-full bg-slate-200 animate-pulse" />
              <div className="card-body space-y-2">
                <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
                <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : view === 'map' ? (
        // NoSSR gate for map (prevents hydration mismatch)
        !isClient ? (
          <MapLoading label={tr(tt,'loadingMap','Loading map...')} />
        ) : (
          <div className="relative card">
            <div className="card-body p-0">
              <PackagesMapLazy
                packages={mapPackages}
                onSelect={(p) => setSelectedId(p?._id || p?.id || p?.slug)}
                selectedId={selectedId}
                onBoundsChanged={(b) => setMapBounds(b)} // expects {n,s,e,w}
                center={CITY_CENTER.Others}
                zoom={5}
                formatPrice={(v, c) => money(v, c)}
                titleFallback={tr(tt, 'package', 'Package')}
                className="h-[70vh] w-full rounded-xl border border-slate-200 shadow overflow-hidden"
              />
            </div>

            {/* Map toolbar */}
            <div className="absolute top-3 left-3 flex flex-col sm:flex-row gap-2">
              <button
                className="btn btn-ghost btn-sm"
                title={tr(tt,'showAll','Show all visible results')}
                onClick={() => setMapFilterActive(false)}
                disabled={!mapFilterActive}
              >
                {tr(tt,'showAll','Show all')}
              </button>
              <button
                className="btn btn-primary btn-sm"
                title={tr(tt,'searchArea','Filter to current map area')}
                onClick={() => setMapFilterActive(true)}
                disabled={!mapBounds}
              >
                {tr(tt,'searchArea','Search this area')}
              </button>
            </div>

            {/* Selected preview card */}
            {selectedPkg && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-[min(680px,90vw)]">
                <div className="card shadow-xl">
                  <div className="card-body flex gap-3">
                    <img
                      src={imgListFrom(selectedPkg)[0]}
                      alt=""
                      className="hidden sm:block w-32 h-24 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold line-clamp-1">{selectedPkg.title}</h3>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {selectedPkg.shortDescription || shortText(selectedPkg.description, 120)}
                          </p>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedId(null)}
                          aria-label={tr(tt,'close','Close')}
                          title={tr(tt,'close','Close')}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-brand-700 font-semibold">
                          {money(Number(selectedPkg.effectivePrice ?? selectedPkg.price), selectedPkg.currency)}
                        </span>
                        <Link href={`/${locale}/packages/${selectedPkg.slug}`} className="btn btn-primary btn-sm">
                          {tr(tt,'viewDetails','View details')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      ) : pageItems.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-slate-600">{tr(tt,'noPackages','No packages match your filters.')}</p>
            <ul className="list-disc pl-5 text-slate-500 text-sm mt-2 space-y-1">
              <li>{tr(tt,'tip.removeFilters','Try removing some filters.')}</li>
              <li>{tr(tt,'tip.raiseLimits','Increase the maximum price or duration.')}</li>
              <li>{tr(tt,'tip.broaderQuery','Search with a broader keyword.')}</li>
            </ul>
            <div className="mt-3">
              <button className="btn btn-ghost" onClick={onClearFilters}>
                {tr(tt,'clear','Clear')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Nicer package cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pageItems.map((p) => {
              const id = p._id || p.id || p.slug;
              const images = imgListFrom(p);
              const promo = !!p.isPromoActive && (p.effectivePrice ?? null) !== null;
              const priceNow = Number(p.effectivePrice ?? p.price);
              const rawPct = promo && Number(p.price) > 0
                ? Math.round((1 - priceNow / Number(p.price)) * 100)
                : (Number(p?.promoPercent) || 0);
              const percent = Math.max(0, Math.min(100, rawPct || 0));
              const blurb = p.shortDescription || p.summary || shortText(p.description, 140);

              return (
                <Link
                  key={id}
                  href={`/${locale}/packages/${p.slug}`} 
                  className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative h-56 w-full overflow-hidden">
                    {/* hover slider */}
                    {images.map((src, i) => (
                      <img
                        key={`${src}-${i}`}
                        src={src}
                        alt={i === 0 ? p.title : ''}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${i === 0 ? 'opacity-100 group-hover:opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
                        loading={i === 0 ? 'lazy' : 'eager'}
                        decoding="async"
                      />
                    ))}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {p.city && <span className="badge">{p.city}</span>}
                      {promo && (
                        <span className="badge bg-amber-500 text-white">
                          {percent > 0 ? `-${percent}%` : tr(tt,'promo','Deal')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg line-clamp-1">{p.title}</h3>
                    <p className="text-slate-600 text-sm line-clamp-2">{blurb}</p>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-brand-700">
                        {promo ? (
                          <>
                            <span className="line-through text-slate-500 mr-2">
                              {money(p.price, p.currency)}
                            </span>
                            <span className="font-semibold">{money(priceNow, p.currency)}</span>
                          </>
                        ) : (
                          <span className="font-semibold">{money(priceNow, p.currency)}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {p.durationHours || 8} {tr(tt,'hours','h')}
                      </span>
                    </div>

                    {Array.isArray(p.languages) && p.languages.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        {tr(tt,'availableIn','Languages')}: {p.languages.join(', ')}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-slate-600">
              {tr(tt,'page','Page')} {page} {tr(tt,'of','of')} {pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← {tr(tt,'prev','Previous')}
              </button>
              <label className="sr-only" htmlFor="limit">
                {tr(tt,'perPage','Items per page')}
              </label>
              <select
                id="limit"
                className="input"
                value={limit}
                onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}/{tr(tt,'perPageShort','page')}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                {tr(tt,'next','Next')} →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
