'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';
import { mediaUrl } from '@/app/lib/media';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Star, X, Clock, Filter, ChevronDown, ChevronUp } from 'lucide-react';

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

const money = (v, curr = 'PEN', locale = 'en-US') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: (curr || 'PEN').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

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
  Others: { lat: -9.1899, lng: -75.0152 },
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
    lat <= b.n &&
    lat >= b.s &&
    lng <= b.e &&
    lng >= b.w
  );
};

function PackagesMap({
  packages = [],
  center = CITY_CENTER.Others,
  zoom = 5,
  selectedId,
  onSelect,
  onBoundsChanged,
  t = {},
}) {
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const L = (await import('leaflet')).default;
      if (!mounted) return;
      LRef.current = L;

      delete L.Icon.Default.prototype._getIconUrl;

      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const report = () => {
        const b = map.getBounds();
        onBoundsChanged?.({
          n: b.getNorth(),
          s: b.getSouth(),
          e: b.getEast(),
          w: b.getWest(),
        });
      };
      map.on('moveend', report);
      setTimeout(report, 0);

      if (packages.length > 0) {
        const bounds = L.latLngBounds(packages.map((p) => [p.location.lat, p.location.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.2), { animate: false });
        }
      }

      mapRef.current._leafletInstance = map;
    })();

    return () => {
      mounted = false;
      if (mapRef.current?._leafletInstance) {
        mapRef.current._leafletInstance.remove();
        mapRef.current._leafletInstance = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current?._leafletInstance;
    const L = LRef.current;
    if (!map || !L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    packages.forEach((p) => {
      const isSel = (p._id || p.id || p.slug) === selectedId;

      const icon = L.divIcon({
        className: 'thumb-marker',
        html: `
          <div class="thumb-wrap ${isSel ? 'thumb-selected' : ''}">
            <div class="thumb-img" style="background-image:url('${(p.markerThumb || '').replace(/'/g, "\\'")}')"></div>
            <div class="thumb-price">${money(Number(p.effectivePrice ?? p.price), p.currency)}</div>
          </div>
        `,
        iconSize: [80, 84],
        iconAnchor: [40, 84],
        popupAnchor: [0, -90],
      });

      const marker = L.marker([p.location.lat, p.location.lng], { icon }).addTo(map).on('click', () => onSelect?.(p));

      marker.bindTooltip(
        `<div style="font-weight:600">${p.title || 'Package'}</div>
         <div style="font-size:12px;opacity:.8">${p.city || ''}</div>`,
        { direction: 'top', offset: L.point(0, -80), opacity: 0.9 }
      );

      markersRef.current.push(marker);
    });

    const styleId = 'thumb-marker-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .thumb-marker .thumb-wrap{position:relative;width:80px;height:80px;border-radius:16px;box-shadow:0 6px 22px rgba(14,55,74,.18);overflow:hidden;border:2px solid rgba(255,255,255,.95);background:linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.78))}
        .thumb-marker .thumb-wrap.thumb-selected{box-shadow:0 10px 30px rgba(0,134,192,0.28);transform:translateY(-4px)}
        .thumb-marker .thumb-img{width:100%;height:100%;background-size:cover;background-position:center;transform:scale(1.0);transition:transform .25s cubic-bezier(.2,.9,.2,1)}
        .thumb-marker .thumb-wrap:hover .thumb-img{transform:scale(1.09)}
        .thumb-marker .thumb-price{position:absolute;left:6px;bottom:6px;padding:4px 8px;border-radius:999px;background:linear-gradient(90deg,#0086C0,#0E374A);color:#fff;font-size:11px;font-weight:700;box-shadow:0 6px 14px rgba(14,55,74,.18)}
      `;
      document.head.appendChild(style);
    }
  }, [packages, selectedId, onSelect]);

  return <div ref={mapRef} className="h-[600px] w-full rounded-xl shadow-sm border border-slate-200 overflow-hidden" />;
}

export default function PackagesInner({ initial }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const params = useParams();
  const locale = params?.locale || 'es';

  const [tt, setTT] = useState({});
  useEffect(() => {
    loadMessages(locale).then(setTT);
  }, [locale]);

  const SORTS = useMemo(
    () => RAW_SORTS.map((s) => ({ v: s.v, label: tr(tt, s.key, s.label) })),
    [tt]
  );

  // CIUDADES - Usando valores fijos para el filtro
  const CITIES = useMemo(() => [
    { value: '', label: tr(tt, 'allCities', 'Todas las ciudades') },
    { value: 'Puno', label: 'Puno' },
    { value: 'Cusco', label: 'Cusco' },
    { value: 'Lima', label: 'Lima' },
    { value: 'Arequipa', label: 'Arequipa' },
    { value: 'Others', label: tr(tt, 'otherCities', 'Otras ciudades') }
  ], [tt]);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);


  // Estados - Inicializar con valores vacíos para "todos"
  const [q, setQ] = useState(initial?.query?.q || '');
  const [city, setCity] = useState(initial?.query?.city || '');
  const [category, setCategory] = useState(initial?.query?.category || '');
  const [maxDur, setMaxDur] = useState(initial?.query?.maxDur || '');
  const [minPrice, setMinPrice] = useState(initial?.query?.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(initial?.query?.maxPrice || '');
  const [sort, setSort] = useState(initial?.query?.sort || '');
  const [page, setPage] = useState(initial?.page || 1);
  const [limit, setLimit] = useState(12);
  const [view, setView] = useState('list');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const savedLimit = Number(typeof window !== 'undefined' ? localStorage.getItem('pk_limit') : 0);
    const initialLimit = Number.isFinite(savedLimit) && savedLimit > 0 ? savedLimit : initial?.limit || 12;
    setLimit(initialLimit);

    const pref = typeof window !== 'undefined' ? localStorage.getItem('pk_view') : '';
    const initialView = initial?.query?.view === 'map' || pref === 'map' ? 'map' : 'list';
    setView(initialView);
  }, [initial]);

  const [items, setItems] = useState(initial?.items || []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(initial?.error || '');
  const [mapBounds, setMapBounds] = useState(null);
  const [mapFilterActive, setMapFilterActive] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [qDeb, setQDeb] = useState((initial?.query?.q || '').trim());
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pk_view', view);
      } catch {}
    }
  }, [view]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pk_limit', String(limit));
      } catch {}
    }
  }, [limit]);

  const didMount = useRef(false);
  useEffect(() => {
    didMount.current = true;
    if (!Array.isArray(initial?.items) || initial.items.length === 0) {
      fetchData();
    }
  }, []);

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
    const curQS = sp.toString();
    if (nextQS !== curQS) {
      router.replace(nextQS ? `/${locale}/packages?${nextQS}` : `/${locale}/packages`, { scroll: false });
    }
  }, [qDeb, city, category, maxDur, minPrice, maxPrice, sort, page, limit, view, sp, router, locale]);

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

      const listRaw = Array.isArray(json) ? json : json.items || [];
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

  useEffect(() => {
    if (!didMount.current) return;
    syncUrl();
    fetchData();
  }, [syncUrl, fetchData]);

  // CATEGORÍAS - Usando valores fijos
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      if (p?.category) set.add(p.category);
    });
    const allCategories = Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
    
    return [
      { value: '', label: tr(tt, 'allCategories', 'Todas las categorías') },
      ...allCategories.map(cat => ({ value: cat, label: cat }))
    ];
  }, [items, tt]);

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
        const txt = `${p.title || ''} ${p.description || ''}`;
        if (!txt.toLowerCase().includes(qDeb.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, qDeb, city, category, minPrice, maxPrice, maxDur]);

  const sorted = useMemo(() => {
    const val = (p) => Number(p.effectivePrice ?? p.price);
    if (sort === 'price_asc') return [...filtered].sort((a, b) => val(a) - val(b));
    if (sort === 'price_desc') return [...filtered].sort((a, b) => val(b) - val(a));
    if (sort === 'recent') return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered;
  }, [filtered, sort]);

  const totalFiltered = sorted.length;
  const pages = Math.max(1, Math.ceil(totalFiltered / limit));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [pages]);

  const start = (page - 1) * limit;
  const pageItems = sorted.slice(start, start + limit);

  const lastPageRef = useRef(page);
  useEffect(() => {
    if (view === 'list' && lastPageRef.current !== page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      lastPageRef.current = page;
    }
  }, [page, view]);

  const mapPackagesBase = useMemo(() => {
    return sorted.map((p) => {
      const hasLat = typeof p?.location?.lat === 'number';
      const hasLng = typeof p?.location?.lng === 'number';
      let lat = hasLat ? p.location.lat : undefined;
      let lng = hasLng ? p.location.lng : undefined;

      if (!(hasLat && hasLng)) {
        const key = CITY_CENTER[p?.city] ? p.city : 'Others';
        const center = CITY_CENTER[key] || CITY_CENTER.Others;
        lat = center.lat;
        lng = center.lng;
      }

      const thumb = imgListFrom(p)[0];
      return {
        ...p,
        location: { lat, lng },
        markerThumb: thumb,
        __fallback: !(hasLat && hasLng),
      };
    });
  }, [sorted]);

  const mapPackages = useMemo(() => {
    if (!mapFilterActive || !mapBounds) return mapPackagesBase;
    return mapPackagesBase.filter((p) => withinBounds(p, mapBounds));
  }, [mapPackagesBase, mapFilterActive, mapBounds]);

  const selectedPkg = useMemo(() => {
    if (!selectedId) return null;
    return mapPackages.find((p) => (p._id || p.id || p.slug) === selectedId) || null;
  }, [mapPackages, selectedId]);

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
  };

  const activeFiltersCount = [
    qDeb, 
    city, 
    category, 
    minPrice, 
    maxPrice, 
    maxDur
  ].filter(Boolean).length;

  const vicunaImages = [
    '/brand/vicuna1.png',
    '/brand/vicuna2.png',
    '/brand/vicuna4.png',
    '/brand/vicuna5.png',
    '/brand/vicunaa3.png'
  ];

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con título y toggle de vista */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <h1 className="font-bree text-4xl md:text-5xl mb-2" style={{ color: '#0E374A' }}>
              {tr(tt, 'title', 'VICUÑA ADVENTURES')}
            </h1>
            <p className="font-tequilla text-lg" style={{ color: '#0086C0' }}>
              {totalFiltered} {tr(tt, 'results', 'paquetes disponibles')}
            </p>
          </div>

          <div className="inline-flex rounded-2xl p-1.5 shadow-sm bg-white border-2 border-slate-100">
            <button onClick={() => setView('list')} className={`px-6 py-2.5 text-sm font-bree rounded-xl transition-all duration-200 ${view === 'list' ? 'text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`} style={view === 'list' ? { backgroundColor: '#0086C0' } : {}}>
              🗒️ {tr(tt, 'listView', 'Listado')}
            </button>
            <button onClick={() => setView('map')} className={`px-6 py-2.5 text-sm font-bree rounded-xl transition-all duration-200 ${view === 'map' ? 'text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`} style={view === 'map' ? { backgroundColor: '#0086C0' } : {}}>
              🗺️ {tr(tt, 'mapView', 'Mapa')}
            </button>
          </div>
        </div>

        {/* Layout principal con sidebar de filtros */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar de filtros */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 sticky top-24">
              {/* Header de filtros */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bree text-xl" style={{ color: '#0E374A' }}>
                  <Filter className="inline mr-2" size={20} />
                  {tr(tt, 'filters', 'Filtros')}
                </h2>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden p-1"
                >
                  {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {/* Contenido de filtros */}
              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Buscar */}
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

                {/* Ciudad */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">
                    {tr(tt, 'city', 'Ciudad')}
                  </label>
                  <select 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {CITIES.map((c) => (
                      <option key={c.value || 'all'} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Categoría */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">
                    {tr(tt, 'category', 'Categoría')}
                  </label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value || 'all'} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ordenar por */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">
                    {tr(tt, 'sortBy', 'Ordenar por')}
                  </label>
                  <select 
                    value={sort} 
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {SORTS.map((s) => (
                      <option key={s.v || 'rel'} value={s.v}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rango de precio */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">
                    {tr(tt, 'priceRange', 'Rango de precio')}
                  </label>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input 
                          type="number" 
                          placeholder={tr(tt, 'minPrice', 'S/. 0')}
                          value={minPrice} 
                          onChange={(e) => setMinPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="number" 
                          placeholder={tr(tt, 'maxPrice', 'S/. 10,000')}
                          value={maxPrice} 
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="px-1">
                      <div className="h-2 bg-slate-200 rounded-full">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: '100%',
                            background: 'linear-gradient(90deg, #0086C0, #0E374A)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duración máxima */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">
                    {tr(tt, 'maxDuration', 'Duración máxima')}
                  </label>
                  <input 
                    type="number" 
                    placeholder={tr(tt, 'maxDurationPlaceholder', '≤ horas')}
                    value={maxDur} 
                    onChange={(e) => setMaxDur(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Resultados por página */}
                <div>
                  <label className="font-tequilla text-sm font-medium text-slate-700 mb-2 block">
                    {tr(tt, 'resultsPerPage', 'Resultados por página')}
                  </label>
                  <select 
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    value={limit} 
                    onChange={(e) => {setPage(1); setLimit(parseInt(e.target.value, 10));}}
                  >
                    {LIMIT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botones de acción */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex gap-3">
                    <button 
                      onClick={onClearFilters}
                      className="flex-1 px-4 py-2.5 rounded-lg font-bree text-white transition-all hover:scale-105 shadow-md"
                      style={{ backgroundColor: '#A3B117' }}
                    >
                      {tr(tt, 'clear', 'Limpiar')}
                      {activeFiltersCount > 0 && (
                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={onApplyFilters}
                      className="flex-1 px-4 py-2.5 rounded-lg font-bree text-white transition-all hover:scale-105 shadow-md"
                      style={{ backgroundColor: '#0086C0' }}
                      aria-busy={loading ? 'true' : 'false'}
                    >
                      {tr(tt, 'apply', 'Aplicar')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="flex-1">
            {err && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                <p className="font-tequilla text-red-600">{err}</p>
                <button onClick={fetchData} className="mt-3 px-4 py-2 rounded-xl font-bree text-white" style={{ backgroundColor: '#0086C0' }}>
                  {tr(tt, 'retry', 'Reintentar')}
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
                {Array.from({ length: limit > 9 ? 9 : limit }).map((_, i) => (
                  <div key={i} className="card-hover bg-white rounded-2xl overflow-hidden shadow-md border-2 border-slate-200">
                    <div className="relative h-64 w-full bg-slate-200 animate-pulse" />
                    <div className="p-6">
                      <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse mb-3" />
                      <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : view === 'map' ? (
              /* Vista Mapa */
              !isClient ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                  <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
                    <div className="text-center">
                      <MapPin size={48} className="mx-auto mb-4" style={{ color: '#0086C0' }} />
                      <p className="font-bree text-xl mb-2" style={{ color: '#0E374A' }}>
                        {tr(tt, 'loadingMap', 'Cargando mapa...')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <PackagesMap packages={mapPackages} onSelect={(p) => setSelectedId(p?._id || p?.id || p?.slug)} selectedId={selectedId} onBoundsChanged={(b) => setMapBounds(b)} center={CITY_CENTER.Others} zoom={5} t={tt} />
                  </div>
                  <div className="absolute top-11 left-11 flex gap-2 z-[1001]">
                    <button className="px-4 py-2 rounded-xl font-bree text-sm text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: '#A3B117' }} title={tr(tt, 'showAll', 'Mostrar todos')} onClick={() => setMapFilterActive(false)} disabled={!mapFilterActive}>
                      {tr(tt, 'showAll', 'Mostrar todos')}
                    </button>
                    <button className="px-4 py-2 rounded-xl font-bree text-sm text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: '#0086C0' }} title={tr(tt, 'searchArea', 'Buscar en esta área')} onClick={() => setMapFilterActive(true)} disabled={!mapBounds}>
                      {tr(tt, 'searchArea', 'Buscar en esta área')}
                    </button>
                  </div>
                  {selectedPkg && (
                    <div className="absolute top-11 left-11 z-[1002] w-80 bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-[#8b9b3a]">
                      <div className="relative h-52">
                        <img src={imgListFrom(selectedPkg)[0]} alt={selectedPkg.title} className="w-full h-full object-cover" />
                        <button onClick={() => setSelectedId(null)} className="absolute top-3 left-3 w-9 h-9 bg-white rounded-md flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors font-bold text-xl text-gray-700" aria-label={tr(tt, 'close', 'Cerrar')}>
                          +
                        </button>
                      </div>
                      <div className="p-6">
                        <h3 className="font-bree text-2xl mb-1" style={{ color: '#0E374A' }}>
                          {selectedPkg.title}
                        </h3>
                        <p className="font-tequilla text-sm text-slate-500 mb-4">{selectedPkg.city || 'Perú'}</p>
                        {selectedPkg.durationHours && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedPkg.durationHours}h
                          </p>
                        )}
                        <div className="flex items-center justify-end mb-5">
                          <div className="bg-[#2d7a9e] text-white px-5 py-2.5 rounded-full flex items-center gap-2 shadow-md">
                            <span className="text-base">📍</span>
                            <span className="font-bree font-bold text-base">
                              {selectedPkg.currency || 'USD'} {Number(selectedPkg.effectivePrice ?? selectedPkg.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <Link href={`/${locale}/packages/${selectedPkg.slug}`} className="block w-full bg-[#8b9b3a] hover:bg-[#737f2f] text-white text-center font-bree font-bold py-3.5 rounded-lg transition-colors text-base">
                          {tr(tt, 'viewDetails', 'Ver detalles')} →
                        </Link>
                      </div>
                    </div>
                  )}
                  {selectedPkg && imgListFrom(selectedPkg)[1] && (
                    <div className="absolute top-11 right-11 z-[999] w-32 h-32 rounded-lg overflow-hidden shadow-xl border-2 border-white">
                      <img src={imgListFrom(selectedPkg)[1]} alt="Vista secundaria" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )
            ) : pageItems.length === 0 ? (
              /* No hay resultados */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <p className="font-bree text-xl mb-2" style={{ color: '#0E374A' }}>
                  {tr(tt, 'noPackages', 'No se encontraron paquetes')}
                </p>
                <p className="font-tequilla text-slate-600 mb-4">
                  {tr(tt, 'removeFilters', 'Intenta ajustar los filtros para ver más resultados')}
                </p>
                <button onClick={onClearFilters} className="px-6 py-2.5 rounded-xl font-bree text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: '#0086C0' }}>
                  {tr(tt, 'clear', 'Limpiar filtros')}
                </button>
              </div>
            ) : (
              /* Vista Lista/Grid */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pageItems.map((p) => {
  const id = p._id || p.id || p.slug;
  const images = imgListFrom(p);
  const promo = !!p.isPromoActive && (p.effectivePrice ?? null) !== null;
  const priceNow = Number(p.effectivePrice ?? p.price);
  const rawPct = promo && Number(p.price) > 0 ? Math.round((1 - priceNow / Number(p.price)) * 100) : Number(p?.promoPercent) || 0;
  const percent = Math.max(0, Math.min(100, rawPct || 0));
  const discount = promo && Number(p.price) > priceNow ? Number(p.price) - priceNow : 0;
  
  const randomVicuna = vicunaImages[Math.floor(Math.random() * vicunaImages.length)];

  return (
    <Link 
      key={id} 
      href={`/${locale}/packages/${p.slug}`} 
      className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full border border-gray-100"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0086C0] to-[#0E374A]"></div>
      
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        {images[0] && (
          <img 
            src={images[0]} 
            alt={p.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            loading="lazy" 
            decoding="async" 
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-50"></div>
        
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {p.durationHours && (
            <div className="px-3 py-1.5 rounded-lg bg-[#0086C0] shadow-md flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white" />
              <span className="font-bree text-xs text-white font-medium">
                {p.durationHours}h
              </span>
            </div>
          )}
          
          {promo && discount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-red-600 shadow-md">
              <span className="font-bree text-xs font-bold text-white">
                -{percent}% OFF
              </span>
            </div>
          )}
        </div>
        
        <div className="absolute bottom-3 left-3">
          <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
            <p className="font-tequilla text-xs text-white flex items-center gap-1">
              <MapPin size={12} className="text-white" />
              {p.city || tr(tt, 'peru', 'Perú')}
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-3">
          <span className="inline-block px-2 py-1 bg-[#0E374A]/10 rounded">
            <span className="font-tequilla text-xs uppercase tracking-wider font-medium" style={{ color: '#0E374A' }}>
              {p.category || tr(tt, 'adventure', 'Aventura')}
            </span>
          </span>
        </div>
        
        <h3 className="font-bree text-base font-bold mb-3 line-clamp-2 group-hover:text-[#0086C0] transition-colors leading-tight" style={{ color: '#0E374A' }}>
          {p.title}
        </h3>
        
        <div className="relative mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {promo && discount > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bree text-2xl font-bold" style={{ color: '#0086C0' }}>
                      {money(priceNow, p.currency)}
                    </span>
                    <span className="font-tequilla text-sm text-gray-500 line-through">
                      {money(Number(p.price), p.currency)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-bree text-xs font-medium px-2 py-1 rounded bg-[#A3B117]/10" style={{ color: 'red' }}>
                      {tr(tt, 'youSave', 'Ahorras')} {money(discount, p.currency)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bree text-lg" style={{ color: '#0086C0' }}>
                      {p.currency}
                    </span>
                    <span className="font-bree text-2xl font-bold ml-1" style={{ color: '#0E374A' }}>
                      {priceNow.toLocaleString()}
                    </span>
                  </div>
                  <p className="font-tequilla text-xs text-gray-600 mt-1">
                    {tr(tt, 'perPerson', 'Precio por persona')}
                  </p>
                </>
              )}
              
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#0086C0]"></div>
                  <span className="font-tequilla">
                    {tr(tt, 'includesTaxes', 'Incluye impuestos')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-[#A3B117]" fill="#A3B117" />
                  <span className="font-bree">4.5</span>
                </div>
              </div>
            </div>
            
            <div className="relative w-16 h-16 ml-3 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0086C0]/20 to-[#0E374A]/20 rounded-full"></div>
              <div className="absolute inset-2 bg-gradient-to-br from-[#0086C0]/10 to-[#0E374A]/10 rounded-full border border-[#0086C0]/30"></div>
              <img 
                src={randomVicuna} 
                alt="Vicuña" 
                className="absolute inset-0 w-full h-full object-contain p-2 opacity-90"
              />
              
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-30"></div>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-gray-100">
          <button className="w-full py-3 rounded-lg font-bree text-sm font-medium text-white transition-all duration-300 group-hover:scale-[1.02] hover:shadow-md"
            style={{ 
              backgroundColor: '#0086C0',
              backgroundImage: 'linear-gradient(to right, #0086C0, #0E374A)'
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{tr(tt, 'viewDetails', 'Ver detalles')}</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>
      </div>
    </Link>
  );
})}


                  
                </div>
                
                {/* Paginación */}
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl font-bree text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105" style={{ backgroundColor: '#0086C0' }}>
                      ← {tr(tt, 'prev', 'Anterior')}
                    </button>
                    <span className="font-tequilla text-slate-600 px-4">
                      {tr(tt, 'page', 'Página')} {page} {tr(tt, 'of', 'de')} {pages}
                    </span>
                    <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-4 py-2 rounded-xl font-bree text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105" style={{ backgroundColor: '#0086C0' }}>
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