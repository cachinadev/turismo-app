// frontend/app/[locale]/packages/PackagesInner.jsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';
import { mediaUrl } from '@/app/lib/media';
import { Search, MapPin, Star, Clock, Filter, ChevronDown, ChevronUp, Navigation, X, RefreshCcw } from 'lucide-react';

/* ---------------- i18n ---------------- */
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

/* ---------------- money ---------------- */
// Keep consistent formatting across server/client
const money = (v, curr = 'PEN') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (curr || 'PEN').toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

/* ---------------- constants ---------------- */
const LIMIT_OPTIONS = [9, 12, 24, 48];
const RAW_SORTS = [
  { v: '', label: 'Relevancia', key: 'sort.relevance' },
  { v: 'price_asc', label: 'Precio: Menor a Mayor', key: 'sort.priceAsc' },
  { v: 'price_desc', label: 'Precio: Mayor a Menor', key: 'sort.priceDesc' },
  { v: 'recent', label: 'Más recientes', key: 'sort.recent' },
];

const CITY_CENTER = {
  Puno: { lat: -15.8402, lng: -70.0219 },
  Cusco: { lat: -13.5319, lng: -71.9675 },
  Lima: { lat: -12.0464, lng: -77.0428 },
  Arequipa: { lat: -16.409, lng: -71.5375 },
  Otros: { lat: -9.1899, lng: -75.0152 },
};

const toNumOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const imgListFrom = (p) => {
  const imgs = Array.isArray(p?.media)
    ? p.media
        .filter((m) => m && m.url && (m.type === 'image' || !m.type))
        .map((m) => mediaUrl(m.url))
    : [];
  return imgs.length ? imgs.slice(0, 8) : ['https://picsum.photos/600/400'];
};

const withinBounds = (p, b) => {
  if (!b) return true;
  const lat = p?.location?.lat;
  const lng = p?.location?.lng;
  return typeof lat === 'number' && typeof lng === 'number' && lat <= b.n && lat >= b.s && lng <= b.e && lng >= b.w;
};

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

const MapLoading = ({ label }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
    <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
      <div className="text-center">
        <MapPin size={48} className="mx-auto mb-4" style={{ color: '#0086C0' }} />
        <p className="font-bree text-xl mb-2" style={{ color: '#0E374A' }}>
          {label}
        </p>
      </div>
    </div>
  </div>
);

const PackagesMapLazy = dynamic(() => import('@/app/components/PackagesMapLeaflet'), {
  ssr: false,
  loading: () => <MapLoading label="Cargando mapa..." />,
});

/* ---------------- Main ---------------- */
export default function PackagesInner({ initial }) {
  const router = useRouter();
  const sp = useSearchParams();
  const params = useParams();
  const locale = params?.locale || 'es';

  /* ---------- translations ---------- */
  const [tt, setTT] = useState({});
  useEffect(() => {
    loadMessages(locale).then(setTT);
  }, [locale]);

  const SORTS = useMemo(() => RAW_SORTS.map((s) => ({ v: s.v, label: tr(tt, s.key, s.label) })), [tt]);

  const CITIES = useMemo(
    () => [
      { value: '', label: tr(tt, 'allCities', 'Todas las ciudades') },
      { value: 'Puno', label: 'Puno' },
      { value: 'Cusco', label: 'Cusco' },
      { value: 'Lima', label: 'Lima' },
      { value: 'Arequipa', label: 'Arequipa' },
      { value: 'Otros', label: tr(tt, 'otherCities', 'Otras ciudades') },
    ],
    [tt]
  );

  /* ---------- client marker ---------- */
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  /* ---------- state ---------- */
  const [q, setQ] = useState(initial?.query?.q || '');
  const [city, setCity] = useState(initial?.query?.city || '');
  const [category, setCategory] = useState(initial?.query?.category || '');
  const [maxDur, setMaxDur] = useState(initial?.query?.maxDur || '');
  const [minPrice, setMinPrice] = useState(initial?.query?.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(initial?.query?.maxPrice || '');
  const [sort, setSort] = useState(initial?.query?.sort || '');
  const [page, setPage] = useState(initial?.page || 1);
  const [limit, setLimit] = useState(initial?.limit || 12);
  const [view, setView] = useState('list');
  const [showFilters, setShowFilters] = useState(true);

  // UI state
  const [items, setItems] = useState(initial?.items || []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(initial?.error || '');
  const [notice, setNotice] = useState('');

  /* ---------- debounce search ---------- */
  const [qDeb, setQDeb] = useState((initial?.query?.q || '').trim());
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  /* ---------- prefs ---------- */
  useEffect(() => {
    const savedLimit = Number(typeof window !== 'undefined' ? localStorage.getItem('pk_limit') : 0);
    const initialLimit = Number.isFinite(savedLimit) && savedLimit > 0 ? savedLimit : initial?.limit || 12;
    setLimit(initialLimit);

    const pref = typeof window !== 'undefined' ? localStorage.getItem('pk_view') : '';
    const initialView = initial?.query?.view === 'map' || pref === 'map' ? 'map' : 'list';
    setView(initialView);
  }, [initial]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('pk_view', view);
    } catch {}
  }, [view]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('pk_limit', String(limit));
    } catch {}
  }, [limit]);

  /* ---------- map state ---------- */
  const [mapBounds, setMapBounds] = useState(null);
  const [mapFilterActive, setMapFilterActive] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  /* ---------- initial fetch if needed ---------- */
  const didMount = useRef(false);
  useEffect(() => {
    didMount.current = true;
    if (!Array.isArray(initial?.items) || initial.items.length === 0) {
      // eslint-disable-next-line no-use-before-define
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- when switching to map, lift limit to get enough points ---------- */
  useEffect(() => {
    if (view === 'map' && limit < 100) {
      setPage(1);
      setLimit(100);
      setNotice(tr(tt, 'mapLimitHint', 'Mapa: cargando más resultados para ver más puntos.'));
      setTimeout(() => setNotice(''), 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  /* ---------- URL sync ---------- */
  const syncUrl = useCallback(() => {
    const qp = new URLSearchParams();
    if (qDeb) qp.set('q', qDeb);
    if (city) qp.set('city', city);
    if (category) qp.set('category', category);
    if (maxDur) qp.set('maxDur', String(maxDur));
    if (minPrice) qp.set('minPrice', String(minPrice));
    if (maxPrice) qp.set('maxPrice', String(maxPrice));
    if (sort) qp.set('sort', sort);
    if (view === 'map') qp.set('view', 'map');
    qp.set('page', String(page));
    qp.set('limit', String(limit));

    const nextQS = qp.toString();
    const curQS = sp.toString();
    if (nextQS !== curQS) {
      router.replace(nextQS ? `/${locale}/packages?${nextQS}` : `/${locale}/packages`, { scroll: false });
    }
  }, [qDeb, city, category, maxDur, minPrice, maxPrice, sort, page, limit, view, sp, router, locale]);

  /* ---------- fetch ---------- */
  const abortRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErr('');

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const qp = new URLSearchParams();
      if (qDeb) qp.set('q', qDeb);
      if (city) qp.set('city', city);
      if (category) qp.set('category', category);

      const _maxDur = toNumOrNull(maxDur);
      const _minP = toNumOrNull(minPrice);
      const _maxP = toNumOrNull(maxPrice);

      if (_maxDur != null) qp.set('maxDur', String(_maxDur));
      if (_minP != null) qp.set('minPrice', String(_minP));
      if (_maxP != null) qp.set('maxPrice', String(_maxP));

      if (sort) qp.set('sort', sort);
      qp.set('page', String(page));
      qp.set('limit', String(limit));

      const res = await fetch(`${API_BASE}/api/packages?${qp}`, { cache: 'no-store', signal: ac.signal });
      const json = await res.json().catch(() => ({ items: [] }));

      const listRaw = Array.isArray(json) ? json : json.items || [];
      const list = listRaw.map((p) => ({
        ...p,
        media: Array.isArray(p.media) ? p.media.map((m) => ({ ...m, url: mediaUrl(m.url) })) : [],
      }));

      setItems(list);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setErr(tr(tt, 'loadError', 'Could not load packages.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [qDeb, city, category, maxDur, minPrice, maxPrice, sort, page, limit, tt]);

  useEffect(() => {
    if (!didMount.current) return;
    syncUrl();
    fetchData();
  }, [syncUrl, fetchData]);

  /* ---------- categories from items ---------- */
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      if (p?.category) set.add(p.category);
    });
    const all = Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
    return [{ value: '', label: tr(tt, 'allCategories', 'Todas las categorías') }, ...all.map((cat) => ({ value: cat, label: cat }))];
  }, [items, tt]);

  /* ---------- client-side filter (extra safety) ---------- */
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
        const txt = `${p.title || ''} ${p.description || ''}`.toLowerCase();
        if (!txt.includes(qDeb.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, qDeb, city, category, minPrice, maxPrice, maxDur]);

  /* ---------- sort ---------- */
  const sorted = useMemo(() => {
    const val = (p) => Number(p.effectivePrice ?? p.price);
    if (sort === 'price_asc') return [...filtered].sort((a, b) => val(a) - val(b));
    if (sort === 'price_desc') return [...filtered].sort((a, b) => val(b) - val(a));
    if (sort === 'recent') return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered;
  }, [filtered, sort]);

  /* ---------- paging ---------- */
  const totalFiltered = sorted.length;
  const pages = Math.max(1, Math.ceil(totalFiltered / limit));

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [pages, page]);

  const start = (page - 1) * limit;
  const pageItems = sorted.slice(start, start + limit);

  const lastPageRef = useRef(page);
  useEffect(() => {
    if (view === 'list' && lastPageRef.current !== page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      lastPageRef.current = page;
    }
  }, [page, view]);

  /* ---------- map packages ---------- */
  const mapPackagesBase = useMemo(() => {
    return sorted
      .map((p) => {
        const hasLat = typeof p?.location?.lat === 'number';
        const hasLng = typeof p?.location?.lng === 'number';
        let lat = hasLat ? p.location.lat : undefined;
        let lng = hasLng ? p.location.lng : undefined;

        if (!(hasLat && hasLng)) {
          const key = CITY_CENTER[p?.city] ? p.city : 'Otros';
          const center = CITY_CENTER[key] || CITY_CENTER.Otros;
          lat = center.lat;
          lng = center.lng;
        }

        const thumb = imgListFrom(p)[0];
        return { ...p, location: { lat, lng }, markerThumb: thumb, __fallback: !(hasLat && hasLng) };
      })
      .filter((p) => typeof p.location.lat === 'number' && typeof p.location.lng === 'number');
  }, [sorted]);

  const mapPackages = useMemo(() => {
    if (!mapFilterActive || !mapBounds) return mapPackagesBase;
    return mapPackagesBase.filter((p) => withinBounds(p, mapBounds));
  }, [mapPackagesBase, mapFilterActive, mapBounds]);

  const selectedPkg = useMemo(() => {
    if (!selectedId) return null;
    return mapPackages.find((p) => (p._id || p.id || p.slug) === selectedId) || null;
  }, [mapPackages, selectedId]);

  /* ---------- actions ---------- */
  const onApplyFilters = () => setPage(1);

  const onClearFilters = () => {
    setQ('');
    setCity('');
    setCategory('');
    setMaxDur('');
    setMinPrice('');
    setMaxPrice('');
    setSort('');
    setPage(1);
    setMapFilterActive(false);
    setSelectedId(null);
  };

  const activeFiltersCount = [qDeb, city, category, minPrice, maxPrice, maxDur].filter(Boolean).length;

  /* ---------- brand images ---------- */
  const vicunaImages = ['/brand/vicuna1.png', '/brand/vicuna2.png', '/brand/vicuna4.png', '/brand/vicuna5.png', '/brand/vicunaa3.png'];

  /* ---------- helpers for cards ---------- */
  const cardPrice = (p) => Number(p.effectivePrice ?? p.price);
  const hasPromo = (p) => !!p.isPromoActive && typeof p.effectivePrice === 'number' && Number(p.effectivePrice) < Number(p.price);
  const promoPct = (p) => {
    const now = cardPrice(p);
    const base = Number(p.price || 0);
    if (base <= 0) return 0;
    const pct = Math.round((1 - now / base) * 100);
    return Math.max(0, Math.min(100, pct));
  };

  const hasAny = items.length > 0;

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div className="space-y-2">
            <h1 className="font-bree text-4xl md:text-5xl leading-tight" style={{ color: '#0E374A' }}>
              {tr(tt, 'title', 'VICUÑA ADVENTURES')}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <p className="font-tequilla text-lg" style={{ color: '#0086C0' }}>
                {totalFiltered} {tr(tt, 'results', 'paquetes disponibles')}
              </p>

              {activeFiltersCount > 0 ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E374A]/5 text-[#0E374A] text-xs font-bree">
                  <Filter size={14} />
                  {tr(tt, 'filtersApplied', 'Filtros')} {activeFiltersCount}
                </span>
              ) : null}

              <button
                onClick={() => fetchData()}
                className="ml-0 md:ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 text-xs font-bree hover:bg-slate-50 transition-colors disabled:opacity-60"
                aria-label={tr(tt, 'refresh', 'Actualizar')}
                title={tr(tt, 'refresh', 'Actualizar')}
                disabled={loading}
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                {tr(tt, 'refresh', 'Actualizar')}
              </button>
            </div>
          </div>

          <div className="inline-flex rounded-2xl p-1.5 shadow-sm bg-white border-2 border-slate-100">
            <button
              onClick={() => setView('list')}
              className={classNames(
                'px-6 py-2.5 text-sm font-bree rounded-xl transition-all duration-200',
                view === 'list' ? 'text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              )}
              style={view === 'list' ? { backgroundColor: '#0086C0' } : {}}
            >
              🗒️ {tr(tt, 'listView', 'Listado')}
            </button>
            <button
              onClick={() => setView('map')}
              className={classNames(
                'px-6 py-2.5 text-sm font-bree rounded-xl transition-all duration-200',
                view === 'map' ? 'text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              )}
              style={view === 'map' ? { backgroundColor: '#0086C0' } : {}}
            >
              🗺️ {tr(tt, 'mapView', 'Mapa')}
            </button>
          </div>
        </div>

        {/* Notice */}
        {notice ? (
          <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-start justify-between gap-3">
            <p className="font-tequilla text-slate-700">{notice}</p>
            <button onClick={() => setNotice('')} className="p-2 rounded-lg hover:bg-slate-100" aria-label="close-notice">
              <X size={16} />
            </button>
          </div>
        ) : null}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bree text-xl" style={{ color: '#0E374A' }}>
                  <Filter className="inline mr-2" size={20} />
                  {tr(tt, 'filters', 'Filtros')}
                </h2>
                <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden p-1" aria-label="toggle-filters">
                  {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              <div className={classNames('space-y-6', showFilters ? 'block' : 'hidden lg:block')}>
                {/* Search */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">
                    {tr(tt, 'searchLabel', 'Buscar por título o descripción')}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder={tr(tt, 'searchPlaceholder', 'Escribe aquí...')}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">{tr(tt, 'city', 'Ciudad')}</label>
                  <select
                    value={city}
                    onChange={(e) => {
                      setPage(1);
                      setCity(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {CITIES.map((c) => (
                      <option key={c.value || 'all'} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">{tr(tt, 'category', 'Categoría')}</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setPage(1);
                      setCategory(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value || 'all'} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">{tr(tt, 'sortBy', 'Ordenar por')}</label>
                  <select
                    value={sort}
                    onChange={(e) => {
                      setPage(1);
                      setSort(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {SORTS.map((s) => (
                      <option key={s.v || 'rel'} value={s.v}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price range */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">{tr(tt, 'priceRange', 'Rango de precio')}</label>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder={tr(tt, 'minPrice', 'S/. 0')}
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <input
                        type="number"
                        placeholder={tr(tt, 'maxPrice', 'S/. 10,000')}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: '100%', background: 'linear-gradient(90deg, #0086C0, #0E374A)' }} />
                    </div>
                  </div>
                </div>

                {/* Max duration */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">{tr(tt, 'maxDuration', 'Duración máxima')}</label>
                  <input
                    type="number"
                    placeholder={tr(tt, 'maxDurationPlaceholder', '≤ horas')}
                    value={maxDur}
                    onChange={(e) => setMaxDur(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Limit */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">{tr(tt, 'resultsPerPage', 'Resultados por página')}</label>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    value={limit}
                    onChange={(e) => {
                      setPage(1);
                      setLimit(parseInt(e.target.value, 10));
                    }}
                  >
                    {LIMIT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex gap-3">
                    <button
                      onClick={onClearFilters}
                      className="flex-1 px-4 py-2.5 rounded-lg font-bree text-white transition-all hover:scale-[1.02] shadow-md"
                      style={{ backgroundColor: '#A3B117' }}
                    >
                      {tr(tt, 'clear', 'Limpiar')}
                      {activeFiltersCount > 0 && (
                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">{activeFiltersCount}</span>
                      )}
                    </button>
                    <button
                      onClick={onApplyFilters}
                      className="flex-1 px-4 py-2.5 rounded-lg font-bree text-white transition-all hover:scale-[1.02] shadow-md disabled:opacity-70"
                      style={{ backgroundColor: '#0086C0' }}
                      aria-busy={loading ? 'true' : 'false'}
                      disabled={loading}
                    >
                      {loading ? tr(tt, 'loading', 'Cargando...') : tr(tt, 'apply', 'Aplicar')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Error */}
            {err && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                <p className="font-tequilla text-red-600">{err}</p>
                <button
                  onClick={fetchData}
                  className="mt-3 px-4 py-2 rounded-xl font-bree text-white inline-flex items-center gap-2"
                  style={{ backgroundColor: '#0086C0' }}
                >
                  <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                  {tr(tt, 'retry', 'Reintentar')}
                </button>
              </div>
            )}

            {/* Loading skeleton (compact) */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden="true">
                {Array.from({ length: limit > 9 ? 9 : limit }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200">
                    <div className="relative h-40 w-full bg-slate-200 animate-pulse" />
                    <div className="p-3">
                      <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : view === 'map' ? (
              /* Map view */
              !isClient ? (
                <MapLoading label={tr(tt, 'loadingMap', 'Cargando mapa...')} />
              ) : (
                <div className="relative">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                    <PackagesMapLazy
                      packages={mapPackages}
                      onSelect={(p) => setSelectedId(p?._id || p?.id || p?.slug)}
                      selectedId={selectedId}
                      onBoundsChanged={(b) => setMapBounds(b)}
                      center={CITY_CENTER.Otros}
                      zoom={5}
                      formatPrice={(v, c) => money(v, c)}
                      titleFallback={tr(tt, 'package', 'Package')}
                    />
                  </div>

                  <div className="absolute top-6 left-6 flex gap-2 z-[1001]">
                    <button
                      className="px-4 py-2 rounded-xl font-bree text-sm text-white transition-all hover:scale-[1.02] shadow-md disabled:opacity-60"
                      style={{ backgroundColor: '#A3B117' }}
                      title={tr(tt, 'showAll', 'Mostrar todos')}
                      onClick={() => setMapFilterActive(false)}
                      disabled={!mapFilterActive}
                    >
                      {tr(tt, 'showAll', 'Mostrar todos')}
                    </button>
                    <button
                      className="px-4 py-2 rounded-xl font-bree text-sm text-white transition-all hover:scale-[1.02] shadow-md disabled:opacity-60"
                      style={{ backgroundColor: '#0086C0' }}
                      title={tr(tt, 'searchArea', 'Buscar en esta área')}
                      onClick={() => setMapFilterActive(true)}
                      disabled={!mapBounds}
                    >
                      {tr(tt, 'searchArea', 'Buscar en esta área')}
                    </button>
                  </div>

                  {selectedPkg && (
                    <div className="absolute top-6 left-6 z-[1002] w-[320px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                      <div className="relative h-44">
                        <Image
                          src={imgListFrom(selectedPkg)[0]}
                          alt={selectedPkg.title}
                          fill
                          sizes="320px"
                          className="object-cover"
                        />
                        <button
                          onClick={() => setSelectedId(null)}
                          className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur rounded-md flex items-center justify-center shadow-lg hover:bg-white transition-colors font-bold text-xl text-gray-700"
                          aria-label={tr(tt, 'close', 'Cerrar')}
                          title={tr(tt, 'close', 'Cerrar')}
                        >
                          ×
                        </button>

                        {selectedPkg.mapsUrl ? (
                          <a
                            href={selectedPkg.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur rounded-md flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                            title={tr(tt, 'openInMaps', 'Abrir en Maps')}
                          >
                            <Navigation className="w-4 h-4 text-slate-700" />
                          </a>
                        ) : null}
                      </div>

                      <div className="p-5">
                        <h3 className="font-bree text-xl mb-1" style={{ color: '#0E374A' }}>
                          {selectedPkg.title}
                        </h3>
                        <p className="font-tequilla text-sm text-slate-500 mb-3">{selectedPkg.city || 'Perú'}</p>

                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-slate-600 flex items-center gap-1">
                            {selectedPkg.durationHours ? (
                              <>
                                <Clock className="w-4 h-4" />
                                {selectedPkg.durationHours}h
                              </>
                            ) : null}
                          </div>

                          <div className="bg-gradient-to-r from-[#0086C0] to-[#0E374A] text-white px-4 py-2 rounded-full shadow-md">
                            <span className="font-bree font-bold text-sm">
                              {money(Number(selectedPkg.effectivePrice ?? selectedPkg.price), selectedPkg.currency)}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/${locale}/packages/${selectedPkg.slug}`}
                          className="block w-full mt-4 bg-[#A3B117] hover:bg-[#8b9b3a] text-white text-center font-bree font-bold py-3 rounded-xl transition-colors text-sm"
                        >
                          {tr(tt, 'viewDetails', 'Ver detalles')} →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : pageItems.length === 0 ? (
              /* empty */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <p className="font-bree text-xl mb-2" style={{ color: '#0E374A' }}>
                  {hasAny ? tr(tt, 'noPackages', 'No se encontraron paquetes') : tr(tt, 'noPackagesAll', 'Aún no hay paquetes publicados')}
                </p>
                <p className="font-tequilla text-slate-600 mb-4">
                  {hasAny ? tr(tt, 'removeFilters', 'Intenta ajustar los filtros para ver más resultados') : tr(tt, 'comeBackSoon', 'Vuelve pronto, estamos preparando nuevas experiencias.')}
                </p>
                <button
                  onClick={onClearFilters}
                  className="px-6 py-2.5 rounded-xl font-bree text-white transition-all hover:scale-[1.02] shadow-md"
                  style={{ backgroundColor: '#0086C0' }}
                >
                  {tr(tt, 'clear', 'Limpiar filtros')}
                </button>
              </div>
            ) : (
              /* list/grid (COMPACT) */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pageItems.map((p) => {
                    const id = p._id || p.id || p.slug;
                    const images = imgListFrom(p);

                    const promo = hasPromo(p);
                    const now = cardPrice(p);
                    const pct = promo ? promoPct(p) : 0;
                    const discount = promo ? Math.max(0, Number(p.price || 0) - now) : 0;

                    // (Optional) keep mascot but smaller; comment out block if you want ultra-clean cards
                    const randomVicuna = vicunaImages[Math.floor(Math.random() * vicunaImages.length)];

                    return (
                      <Link
                        key={id}
                        href={`/${locale}/packages/${p.slug}`}
                        className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full border border-gray-100"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0086C0] to-[#0E374A]" />

                        {/* IMAGE (reduced height) */}
                        <div className="relative h-40 overflow-hidden flex-shrink-0">
                          <Image
                            src={images[0]}
                            alt={p.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent opacity-70" />

                          {/* top badges (smaller) */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start">
                            {p.durationHours ? (
                              <div className="px-2 py-1 rounded-md bg-[#0086C0] shadow-md flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-white" />
                                <span className="font-bree text-[11px] text-white font-medium">{p.durationHours}h</span>
                              </div>
                            ) : (
                              <div />
                            )}

                            {promo && discount > 0 ? (
                              <div className="px-2 py-1 rounded-md bg-red-600 shadow-md">
                                <span className="font-bree text-[11px] font-bold text-white">-{pct}%</span>
                              </div>
                            ) : null}
                          </div>

                          {/* bottom badges (smaller) */}
                          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
                            <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                              <p className="font-tequilla text-[11px] text-white flex items-center gap-1">
                                <MapPin size={12} className="text-white" />
                                {p.city || tr(tt, 'peru', 'Perú')}
                              </p>
                            </div>

                            {p.mapsUrl ? (
                              <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[11px] font-bree flex items-center gap-1">
                                <Navigation className="w-3.5 h-3.5" />
                                Maps
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* BODY (reduced padding + typography) */}
                        <div className="p-3 flex flex-col flex-grow">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center px-2 py-1 bg-[#0E374A]/10 rounded-md">
                              <span className="font-tequilla text-[11px] uppercase tracking-wider font-medium" style={{ color: '#0E374A' }}>
                                {p.category || tr(tt, 'adventure', 'Aventura')}
                              </span>
                            </span>

                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Star size={12} className="text-[#A3B117]" fill="#A3B117" />
                              <span className="font-bree">4.5</span>
                            </div>
                          </div>

                          <h3
                            className="font-bree text-sm font-bold mb-2 line-clamp-2 group-hover:text-[#0086C0] transition-colors leading-snug"
                            style={{ color: '#0E374A' }}
                          >
                            {p.title}
                          </h3>

                          <div className="relative mb-3">
                            {promo && discount > 0 ? (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="font-bree text-xl font-bold" style={{ color: '#0086C0' }}>
                                    {money(now, p.currency)}
                                  </span>
                                  <span className="font-tequilla text-xs text-gray-500 line-through">{money(Number(p.price), p.currency)}</span>
                                </div>
                                <div className="mt-1">
                                  <span className="font-bree text-[11px] font-medium px-2 py-1 rounded bg-[#A3B117]/10 text-red-600">
                                    {tr(tt, 'youSave', 'Ahorras')} {money(discount, p.currency)}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="font-bree text-xl font-bold" style={{ color: '#0E374A' }}>
                                    {money(now, p.currency)}
                                  </span>
                                </div>
                                <p className="font-tequilla text-[11px] text-gray-600 mt-1">{tr(tt, 'perPerson', 'Precio por persona')}</p>
                              </>
                            )}

                            {/* taxes note removed */}
                          </div>

                          {/* FOOTER (slimmer CTA + smaller mascot) */}
                          <div className="mt-auto pt-3 border-t border-gray-100">
                            <div
                              className="w-full py-2 rounded-lg font-bree text-sm font-semibold text-white transition-all duration-300 group-hover:scale-[1.01] hover:shadow-md text-center"
                              style={{ backgroundImage: 'linear-gradient(to right, #0086C0, #0E374A)' }}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <span>{tr(tt, 'viewDetails', 'Ver detalles')}</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                              </div>
                            </div>

                            {/* mascot removed */}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-xl font-bree text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: '#0086C0' }}
                    >
                      ← {tr(tt, 'prev', 'Anterior')}
                    </button>

                    <span className="font-tequilla text-slate-600 px-4">
                      {tr(tt, 'page', 'Página')} {page} {tr(tt, 'of', 'de')} {pages}
                    </span>

                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page === pages}
                      className="px-4 py-2 rounded-xl font-bree text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: '#0086C0' }}
                    >
                      {tr(tt, 'next', 'Siguiente')} →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
