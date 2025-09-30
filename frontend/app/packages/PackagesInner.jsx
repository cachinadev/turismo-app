// frontend/app/packages/PackagesInner.jsx
/* eslint-disable @next/next/no-img-element */
// frontend/app/packages/PackagesInner.jsx
/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';
import { mediaUrl } from '@/app/lib/media';

// Optional: if you don't already import Leaflet CSS globally
import 'leaflet/dist/leaflet.css';

/* =================== helpers =================== */

const money = (v, curr = 'PEN', locale = 'en-US') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: (curr || 'PEN').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const CITIES = ['', 'Puno', 'Cusco', 'Lima', 'Arequipa', 'Others'];
const LIMIT_OPTIONS = [9, 12, 24, 48];
const SORTS = [
  { v: '', label: 'Relevance' },
  { v: 'price_asc', label: 'Price ↑' },
  { v: 'price_desc', label: 'Price ↓' },
  { v: 'recent', label: 'Most recent' },
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

/* =================== Leaflet Map (inline) =================== */
/**
 * PackagesMap: tiny Leaflet wrapper with thumbnail markers
 * Props:
 * - packages: Array<{ location:{lat,lng}, title, price/effectivePrice, currency, markerThumb, _id/id/slug }>
 * - center: {lat,lng} default center
 * - zoom: number
 * - onSelect(pkg) / selectedId
 * - onBoundsChanged({n,s,e,w})
 */
function PackagesMap({
  packages = [],
  center = CITY_CENTER.Others,
  zoom = 5,
  selectedId,
  onSelect,
  onBoundsChanged,
}) {
  const mapRef = useRef(null);
  const LRef = useRef(null);      // keep leaflet module
  const markersRef = useRef([]);  // keep current markers

  // init map once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const L = (await import('leaflet')).default;
      if (!mounted) return;
      LRef.current = L;

      // Fix default icon paths when bundling with Next
      delete L.Icon.Default.prototype._getIconUrl;

      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom,
        scrollWheelZoom: true,
      });

      // OSM tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // report bounds
      const report = () => {
        const b = map.getBounds();
        onBoundsChanged?.({
          n: b.getNorth(), s: b.getSouth(),
          e: b.getEast(),  w: b.getWest(),
        });
      };
      map.on('moveend', report);
      setTimeout(report, 0);

      // fit to markers if any
      if (packages.length > 0) {
        const bounds = L.latLngBounds(
          packages.map(p => [p.location.lat, p.location.lng])
        );
        // if all are same coord, padding with zoom
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.2), { animate: false });
        }
      }

      // save leaflet map instance
      mapRef.current._leafletInstance = map;
    })();

    return () => { 
      mounted = false;
      // Cleanup map instance
      if (mapRef.current?._leafletInstance) {
        mapRef.current._leafletInstance.remove();
        mapRef.current._leafletInstance = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // render markers when packages change
  useEffect(() => {
    const map = mapRef.current?._leafletInstance;
    const L = LRef.current;
    if (!map || !L) return;

    // clear old
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // add new
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
        iconAnchor: [40, 84], // bottom center
        popupAnchor: [0, -90],
      });

      const marker = L.marker([p.location.lat, p.location.lng], { icon })
        .addTo(map)
        .on('click', () => onSelect?.(p));

      marker.bindTooltip(
        `<div style="font-weight:600">${p.title || 'Package'}</div>
         <div style="font-size:12px;opacity:.8">${p.city || ''}</div>`,
        { direction: 'top', offset: L.point(0, -80), opacity: 0.9 }
      );

      markersRef.current.push(marker);
    });

    // CSS for markers (scoped via a style tag)
    const styleId = 'thumb-marker-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .thumb-marker .thumb-wrap{
          position: relative;
          width: 80px; height: 80px;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(0,0,0,.18);
          overflow: hidden;
          border: 2px solid rgba(255,255,255,.9);
          background: #fff;
        }
        .thumb-marker .thumb-wrap.thumb-selected{ outline: 3px solid #2f855a; }
        .thumb-marker .thumb-img{
          width: 100%; height: 100%;
          background-size: cover;
          background-position: center;
          transform: scale(1.0);
          transition: transform .2s ease;
        }
        .thumb-marker .thumb-wrap:hover .thumb-img{ transform: scale(1.06); }
        .thumb-marker .thumb-price{
          position: absolute; left: 6px; bottom: 6px;
          padding: 2px 6px; border-radius: 10px;
          background: rgba(0,0,0,.65); color:#fff;
          font-size: 11px; font-weight: 600;
        }
      `;
      document.head.appendChild(style);
    }
  }, [packages, selectedId, onSelect]);

  return (
    <div ref={mapRef} className="h-[70vh] w-full rounded-xl border border-slate-200 shadow overflow-hidden" />
  );
}

/* =================== Main Page (list + map) =================== */

export default function PackagesInner({ initial }) {
  const router = useRouter();
  const sp = useSearchParams();

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
      router.replace(nextQS ? `/packages?${nextQS}` : '/packages', { scroll: false });
    }
  }, [qDeb, city, category, maxDur, minPrice, maxPrice, sort, page, limit, view, sp, router]);

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

      const res = await fetch(`${API_BASE}/api/packages?${params.toString()}`, {
        cache: 'no-store',
        signal: ac.signal,
      });
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
    if (city) cs.push({ key: 'city', label: `City: ${city}`, clear: () => setCity('') });
    if (category) cs.push({ key: 'category', label: `Category: ${category}`, clear: () => setCategory('') });
    if (toNumOrNull(minPrice) != null) cs.push({ key: 'minPrice', label: `≥ ${money(minPrice)}`, clear: () => setMinPrice('') });
    if (toNumOrNull(maxPrice) != null) cs.push({ key: 'maxPrice', label: `≤ ${money(maxPrice)}`, clear: () => setMaxPrice('') });
    if (toNumOrNull(maxDur) != null)   cs.push({ key: 'maxDur',   label: `≤ ${maxDur} h`,      clear: () => setMaxDur('') });
    if (qDeb) cs.push({ key: 'q', label: `"${qDeb}"`, clear: () => setQ('') });
    if (view === 'map' && mapFilterActive) cs.push({ key: 'bounds', label: 'In this area', clear: () => setMapFilterActive(false) });
    return cs;
  }, [city, category, minPrice, maxPrice, maxDur, qDeb, view, mapFilterActive]);

  /* =================== Render =================== */
  return (
    <section className="container-default py-8 space-y-6" aria-busy={loading ? 'true' : 'false'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Travel Packages</h1>
          <p className="text-slate-600 text-sm" aria-live="polite">
            {totalFiltered} result{totalFiltered === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`btn ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('list')}
            title="View as list"
          >
            🗒️ List
          </button>
          <button
            className={`btn ${view === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('map')}
            title="View map"
          >
            🗺️ Map
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="sr-only" htmlFor="q">Search</label>
            <input
              id="q"
              className="input w-full"
              placeholder="Search by title or description…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onApplyFilters()}
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="city">City</label>
            <select id="city" className="input w-full" value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((c) => <option key={c || 'all'} value={c}>{c || 'All cities'}</option>)}
            </select>
          </div>

          <div>
            <label className="sr-only" htmlFor="category">Category</label>
            <select id="category" className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c || 'all'} value={c}>{c || 'All categories'}</option>
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
              placeholder="Min $"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <input
              className="input w-full"
              type="number"
              min={0}
              placeholder="Max $"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <input
              className="input w-full"
              type="number"
              min={1}
              placeholder="≤ hours"
              value={maxDur}
              onChange={(e) => setMaxDur(e.target.value)}
            />
          </div>

          <div className="md:col-span-6 flex items-center gap-2">
            <button className="btn" onClick={onApplyFilters} aria-busy={loading ? 'true' : 'false'}>
              Apply
            </button>
            <button className="btn btn-ghost" onClick={onClearFilters}>Clear</button>
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
                title="Remove filter"
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
            <button className="btn btn-ghost mt-2" onClick={fetchData}>Retry</button>
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
          <div className="card">
            <div className="h-[70vh] w-full bg-slate-100 rounded-xl flex items-center justify-center">
              <p className="text-slate-500">Loading map...</p>
            </div>
          </div>
        ) : (
          <div className="relative card">
            <div className="card-body p-0">
              <PackagesMap
                packages={mapPackages}
                onSelect={(p) => setSelectedId(p?._id || p?.id || p?.slug)}
                selectedId={selectedId}
                onBoundsChanged={(b) => setMapBounds(b)} // expects {n,s,e,w}
                center={CITY_CENTER.Others}
                zoom={5}
              />
            </div>

            {/* Map toolbar */}
            <div className="absolute top-3 left-3 flex flex-col sm:flex-row gap-2">
              <button
                className="btn btn-ghost btn-sm"
                title="Show all visible results"
                onClick={() => setMapFilterActive(false)}
                disabled={!mapFilterActive}
              >
                Show all
              </button>
              <button
                className="btn btn-primary btn-sm"
                title="Filter to current map area"
                onClick={() => setMapFilterActive(true)}
                disabled={!mapBounds}
              >
                Search this area
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
                          aria-label="Close"
                          title="Close"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-brand-700 font-semibold">
                          {money(Number(selectedPkg.effectivePrice ?? selectedPkg.price), selectedPkg.currency)}
                        </span>
                        <Link href={`/packages/${selectedPkg.slug}`} className="btn btn-primary btn-sm">
                          View details
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
            <p className="text-slate-600">No packages match your filters.</p>
            <ul className="list-disc pl-5 text-slate-500 text-sm mt-2 space-y-1">
              <li>Try removing some filters.</li>
              <li>Increase the maximum price or duration.</li>
              <li>Search with a broader keyword.</li>
            </ul>
            <div className="mt-3">
              <button className="btn btn-ghost" onClick={onClearFilters}>Clear filters</button>
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
                <Link key={id} href={`/packages/${p.slug}`} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
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
                      {promo && <span className="badge bg-amber-500 text-white">{percent > 0 ? `-${percent}%` : 'Deal'}</span>}
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
                      <span className="text-xs text-slate-500">{p.durationHours || 8} h</span>
                    </div>

                    {Array.isArray(p.languages) && p.languages.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        Languages: {p.languages.join(', ')}
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
              Page {page} of {pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <label className="sr-only" htmlFor="limit">Items per page</label>
              <select
                id="limit"
                className="input"
                value={limit}
                onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
              >
                {LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <button
                className="btn btn-ghost"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}