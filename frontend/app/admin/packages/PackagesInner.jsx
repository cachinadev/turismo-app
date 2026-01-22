// frontend/app/admin/packages/PackagesInner.jsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AdminGuard from '../AdminGuard';
import { mediaUrl } from '@/app/lib/media';
import { API_BASE } from '@/app/lib/config';

const CITIES = ['', 'Puno', 'Cusco', 'Lima', 'Arequipa', 'Others'];
const LIMIT_OPTIONS = [6, 12, 24, 48];

// One-time flash key (set this in the create page after success)
const FLASH_KEY = 'pkg_created_flash';

const formatCurrency = (value, currency = 'PEN', locale = 'en-US') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: (currency || 'PEN').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '';
  }
};

const computePricing = (packageData) => {
  const currency = (packageData?.currency || 'PEN').toUpperCase();
  const originalPrice = Number(packageData?.price || 0);

  const hasEffectivePrice =
    packageData?.effectivePrice != null && !Number.isNaN(Number(packageData.effectivePrice));
  const promoPercent = Number(packageData?.promoPercent || 0);
  const hasPercentDiscount = promoPercent > 0;

  const isPromoActive = !!(packageData?.isPromoActive && (hasEffectivePrice || hasPercentDiscount));

  let currentPrice = originalPrice;
  if (isPromoActive) {
    if (hasEffectivePrice) currentPrice = Number(packageData.effectivePrice);
    else if (hasPercentDiscount) currentPrice = Math.max(0, originalPrice * (1 - promoPercent / 100));
  }

  const discountPercentage =
    isPromoActive && originalPrice > 0
      ? Math.max(0, Math.min(100, Math.round((1 - currentPrice / originalPrice) * 100)))
      : 0;

  return { currency, originalPrice, currentPrice, isPromoActive, discountPercentage };
};

/* ----------------------------- Small UI helpers ----------------------------- */

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

function SkeletonCard() {
  return (
    <div className="card bg-base-100 shadow-sm overflow-hidden">
      <div className="h-48 bg-base-200 animate-pulse" />
      <div className="card-body gap-3">
        <div className="h-4 bg-base-200 rounded w-2/3 animate-pulse" />
        <div className="h-3 bg-base-200 rounded w-full animate-pulse" />
        <div className="h-3 bg-base-200 rounded w-5/6 animate-pulse" />
        <div className="h-8 bg-base-200 rounded w-full mt-2 animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body text-center py-14">
        <div className="text-5xl mb-4">📦</div>
        <h3 className="text-xl font-semibold mb-2">No packages found</h3>
        <p className="text-gray-600 mb-6">
          {hasFilters ? 'Try adjusting your filters to see more results.' : 'Get started by creating your first package.'}
        </p>
        <Link href="/admin/packages/new" className="btn btn-primary">
          Create New Package
        </Link>
      </div>
    </div>
  );
}

function StatusPills({ isActive, isPromo }) {
  return (
    <div className="flex items-center gap-2">
      <span className={classNames('badge badge-sm', isActive ? 'badge-success' : 'badge-error')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
      {isPromo ? <span className="badge badge-sm badge-warning">Promo</span> : null}
    </div>
  );
}

function Toast({ kind = 'info', message, onClose }) {
  if (!message) return null;
  const cls =
    kind === 'success'
      ? 'alert-success'
      : kind === 'error'
      ? 'alert-error'
      : kind === 'warning'
      ? 'alert-warning'
      : 'alert-info';

  return (
    <div className={classNames('alert shadow-lg', cls)}>
      <div>
        <span>{message}</span>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>
  );
}

/**
 * Congrats banner shown after successful creation.
 * How it triggers:
 *  - create page sets sessionStorage[FLASH_KEY] = JSON.stringify({t,title,slug,id})
 *  - and redirects to /admin/packages?created=1
 */
function CongratsBanner({ onCreateAnother }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const created = searchParams?.get('created');
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (!created) return;

    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isFresh = parsed?.t && Date.now() - parsed.t < 10 * 60 * 1000; // 10 min
        if (isFresh) {
          setFlash({
            title: parsed?.title || 'Package created successfully!',
            slug: parsed?.slug || '',
            id: parsed?.id || '',
          });
        }
        sessionStorage.removeItem(FLASH_KEY);
      } else {
        setFlash({ title: 'Package created successfully!', slug: '', id: '' });
      }
    } catch {
      setFlash({ title: 'Package created successfully!', slug: '', id: '' });
      try {
        sessionStorage.removeItem(FLASH_KEY);
      } catch {}
    }

    // remove query param (avoid re-show on refresh)
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('created');
      router.replace(url.pathname + url.search, { scroll: false });
    } catch {}
  }, [created, router, searchParams]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6500);
    return () => clearTimeout(t);
  }, [flash]);

  if (!flash) return null;

  const publicUrl = flash.slug ? `${window.location.origin}/packages/${flash.slug}` : '';

  return (
    <div className="card bg-base-100 shadow-sm border border-success/30">
      <div className="card-body">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="text-3xl leading-none">🎉</div>
            <div className="space-y-1">
              <div className="font-semibold text-gray-900">Congratulations! Your package was created.</div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">{flash.title}</span>
                {flash.slug ? (
                  <>
                    {' '}
                    •{' '}
                    <a className="link link-hover" href={publicUrl} target="_blank" rel="noreferrer">
                      Open public page
                    </a>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {flash.slug ? (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(publicUrl);
                      } catch {}
                    }}
                    title="Copy public URL"
                  >
                    Copy URL
                  </button>
                ) : null}
                <button className="btn btn-sm btn-primary" onClick={onCreateAnother} title="Create another package">
                  + Create another
                </button>
              </div>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => setFlash(null)} aria-label="Close">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButtons({ pkg, onToggleActive, onDelete, onCopyLink, togglingId, deletingId }) {
  const id = pkg._id || pkg.id;
  const isActive = pkg.active !== false;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <button
        onClick={() => onToggleActive(pkg)}
        disabled={togglingId === id}
        className={classNames('btn btn-sm flex-1 min-w-0', isActive ? 'btn-warning' : 'btn-success')}
        title={isActive ? 'Deactivate package' : 'Activate package'}
      >
        {togglingId === id ? <span className="loading loading-dots loading-sm" /> : isActive ? 'Deactivate' : 'Activate'}
      </button>

      <Link href={`/admin/packages/${id}/edit`} className="btn btn-sm btn-primary flex-1 min-w-0" title="Edit package">
        Edit
      </Link>

      <button onClick={() => onCopyLink(pkg.slug)} className="btn btn-sm btn-ghost" title="Copy public link">
        🔗
      </button>

      <button
        onClick={() => onDelete(id, pkg.title)}
        disabled={deletingId === id}
        className="btn btn-sm btn-error flex-1 min-w-0"
        title="Delete package"
      >
        {deletingId === id ? <span className="loading loading-dots loading-sm" /> : 'Delete'}
      </button>
    </div>
  );
}

export default function PackagesInner() {
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // Filter states
  const [filters, setFilters] = useState({ query: '', city: '', onlyActive: false, onlyPromo: false });
  const [appliedFilters, setAppliedFilters] = useState({ query: '', city: '', onlyActive: false, onlyPromo: false });

  // UI / Data state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ kind: 'info', message: '' });

  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const showToast = useCallback((message, kind = 'info', ms = 2600) => {
    setToast({ kind, message });
    if (ms > 0) setTimeout(() => setToast({ kind: 'info', message: '' }), ms);
  }, []);

  const getToken = () => {
    try {
      return localStorage.getItem('token') || '';
    } catch {
      return '';
    }
  };

  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        params.set('preview', '1');
        if (appliedFilters.query) params.set('q', appliedFilters.query);
        if (appliedFilters.city) params.set('city', appliedFilters.city);
        if (appliedFilters.onlyActive) params.set('active', 'true');
        if (appliedFilters.onlyPromo) params.set('promo', 'true');
        params.set('page', String(page));
        params.set('limit', String(limit));

        const response = await fetch(`${API_BASE}/api/packages?${params}`, {
          cache: 'no-store',
          signal: abortController.signal,
        });

        let data = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) throw new Error(data.message || 'Failed to fetch packages');

        const list = Array.isArray(data) ? data : data.items || [];
        const processed = list.map((pkg) => ({
          ...pkg,
          media: Array.isArray(pkg.media)
            ? pkg.media.map((m) => ({
                ...m,
                url: mediaUrl(m.url),
              }))
            : [],
        }));

        const filtered = appliedFilters.onlyPromo
          ? processed.filter((pkg) => computePricing(pkg).isPromoActive)
          : processed;

        setItems(filtered);
        setTotal(data.total || filtered.length);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError(err?.message || 'Could not load packages. Please try again.');
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    }, 200);
  }, [appliedFilters, page, limit]);

  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchData]);

  // Filters
  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      query: filters.query.trim(),
      city: filters.city,
      onlyActive: filters.onlyActive,
      onlyPromo: filters.onlyPromo,
    });
  };

  const clearFilters = () => {
    setFilters({ query: '', city: '', onlyActive: false, onlyPromo: false });
    setAppliedFilters({ query: '', city: '', onlyActive: false, onlyPromo: false });
    setPage(1);
  };

  const hasFilters = !!(
    appliedFilters.query ||
    appliedFilters.city ||
    appliedFilters.onlyActive ||
    appliedFilters.onlyPromo
  );

  // Actions
  const handleDelete = async (id, title) => {
    if (!id) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title || 'this package'}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    const token = getToken();
    if (!token) return setError('Session expired. Please sign in again.');

    try {
      setDeletingId(id);
      const response = await fetch(`${API_BASE}/api/packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      let data = {};
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) throw new Error(data.message || 'Failed to delete package');

      setItems((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setTotal((t) => Math.max(0, t - 1));
      showToast('Package deleted.', 'success');
    } catch (err) {
      setError(err?.message || 'Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (pkg) => {
    const id = pkg?._id || pkg?.id;
    if (!id) return;

    const token = getToken();
    if (!token) return setError('Session expired. Please sign in again.');

    try {
      setTogglingId(id);
      const newActive = pkg.active === false ? true : false;

      const response = await fetch(`${API_BASE}/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: newActive }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) throw new Error(data.message || 'Failed to update package status');

      setItems((prev) => prev.map((p) => ((p._id || p.id) === id ? { ...p, active: newActive } : p)));
      showToast(newActive ? 'Package activated.' : 'Package deactivated.', 'success');
    } catch (err) {
      setError(err?.message || 'Status update failed. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCopyLink = async (slug) => {
    try {
      if (!slug) return setError('No slug available for this package');
      const publicUrl = `${window.location.origin}/packages/${slug}`;
      await navigator.clipboard.writeText(publicUrl);
      showToast('Package link copied!', 'success');
    } catch {
      setError('Failed to copy link to clipboard');
    }
  };

  return (
    <AdminGuard>
      <section className="container-default py-8 space-y-6 pt-20">
        {/* Top bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Packages</h1>
              {!loading ? (
                <span className="badge badge-neutral badge-lg">{total} total</span>
              ) : (
                <span className="badge badge-neutral badge-lg opacity-60">…</span>
              )}
            </div>
            <p className="text-gray-600">Create, edit, activate and manage promotions.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/packages/new" className="btn btn-primary gap-2">
              <span>+</span> New Package
            </Link>
            <button
              className="btn btn-ghost"
              onClick={() => fetchData()}
              title="Refresh list"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Congrats after create */}
        <CongratsBanner onCreateAnother={() => (window.location.href = '/admin/packages/new')} />

        {/* Toast + Error */}
        <Toast kind={toast.kind} message={toast.message} onClose={() => setToast({ kind: 'info', message: '' })} />
        {error ? <Toast kind="error" message={error} onClose={() => setError('')} /> : null}

        {/* Filters card */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h3 className="card-title text-lg">Filters</h3>
                <p className="text-sm text-gray-500">Search and narrow down your package list.</p>
              </div>

              {hasFilters ? (
                <div className="text-sm text-gray-600">
                  <span className="badge badge-outline">Filtered</span>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end mt-4">
              <div className="form-control lg:col-span-2">
                <label className="label">
                  <span className="label-text font-medium">Search</span>
                </label>
                <input
                  type="text"
                  placeholder="Title or description…"
                  className="input input-bordered"
                  value={filters.query}
                  onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">City</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.city}
                  onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
                >
                  {CITIES.map((city) => (
                    <option key={city || 'all'} value={city}>
                      {city || 'All Cities'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={filters.onlyActive}
                    onChange={(e) => setFilters((p) => ({ ...p, onlyActive: e.target.checked }))}
                  />
                  <span className="label-text font-medium">Active</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={filters.onlyPromo}
                    onChange={(e) => setFilters((p) => ({ ...p, onlyPromo: e.target.checked }))}
                  />
                  <span className="label-text font-medium">Promo</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button onClick={applyFilters} className="btn btn-primary flex-1">
                  Apply
                </button>
                <button onClick={clearFilters} className="btn btn-ghost">
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary row */}
        {!loading && items.length > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-gray-600">
              Showing <span className="font-medium">{items.length}</span> of{' '}
              <span className="font-medium">{total}</span>
            </div>
            <div className="text-sm text-gray-500">
              Page <span className="font-medium">{page}</span> of <span className="font-medium">{pages}</span>
            </div>
          </div>
        ) : null}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((pkg) => {
              const id = pkg._id || pkg.id;
              const imageUrl = pkg.media?.[0]?.url || 'https://picsum.photos/600/400?random=1';
              const pricing = computePricing(pkg);
              const isActive = pkg.active !== false;

              return (
                <div
                  key={id}
                  className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <figure className="relative h-52">
                    <img src={imageUrl} alt={pkg.title} className="w-full h-full object-cover" />

                    {/* subtle overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />

                    <div className="absolute top-3 left-3">
                      <StatusPills isActive={isActive} isPromo={pricing.isPromoActive} />
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-lg leading-snug line-clamp-2 drop-shadow">
                          {pkg.title}
                        </div>
                        <div className="text-white/80 text-xs mt-1">
                          {pkg.city || '—'} • Created {formatDate(pkg.createdAt) || '—'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-white font-bold text-xl drop-shadow">
                          {formatCurrency(pricing.currentPrice, pricing.currency)}
                        </div>
                        {pricing.isPromoActive && pricing.discountPercentage > 0 ? (
                          <div className="badge badge-success badge-sm mt-1">{pricing.discountPercentage}% OFF</div>
                        ) : null}
                      </div>
                    </div>
                  </figure>

                  <div className="card-body">
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {pkg.description || 'No description provided'}
                    </p>

                    <div className="mt-2">
                      <ActionButtons
                        pkg={pkg}
                        onToggleActive={handleToggleActive}
                        onDelete={handleDelete}
                        onCopyLink={handleCopyLink}
                        togglingId={togglingId}
                        deletingId={deletingId}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && items.length > 0 ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  className="select select-bordered select-sm"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {LIMIT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="join">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="join-item btn btn-sm"
                >
                  «
                </button>
                <button className="join-item btn btn-sm btn-active">Page {page}</button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="join-item btn btn-sm"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </AdminGuard>
  );
}
