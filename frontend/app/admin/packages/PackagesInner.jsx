//frontend/app/admin/packages/PackagesInner.jsx
// frontend/app/admin/packages/PackagesInner.jsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../AdminGuard';
import { mediaUrl } from '@/app/lib/media';
import { API_BASE } from '@/app/lib/config';

const CITIES = ['', 'Puno', 'Cusco', 'Lima', 'Arequipa', 'Others'];
const LIMIT_OPTIONS = [6, 12, 24, 48];

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
      day: '2-digit' 
    });
  } catch {
    return '';
  }
};

const computePricing = (packageData) => {
  const currency = (packageData?.currency || 'PEN').toUpperCase();
  const originalPrice = Number(packageData?.price || 0);

  const hasEffectivePrice = packageData?.effectivePrice != null && 
    !Number.isNaN(Number(packageData.effectivePrice));
  const promoPercent = Number(packageData?.promoPercent || 0);
  const hasPercentDiscount = promoPercent > 0;

  const isPromoActive = packageData?.isPromoActive && (hasEffectivePrice || hasPercentDiscount);

  let currentPrice = originalPrice;
  if (isPromoActive) {
    if (hasEffectivePrice) {
      currentPrice = Number(packageData.effectivePrice);
    } else if (hasPercentDiscount) {
      currentPrice = Math.max(0, originalPrice * (1 - promoPercent / 100));
    }
  }

  const discountPercentage = isPromoActive && originalPrice > 0
    ? Math.max(0, Math.min(100, Math.round((1 - currentPrice / originalPrice) * 100)))
    : 0;

  return { 
    currency, 
    originalPrice, 
    currentPrice, 
    isPromoActive, 
    discountPercentage 
  };
};

const StatusBadge = ({ isActive, isPromo }) => (
  <div className="flex gap-1 mb-2">
    <span className={`badge badge-sm ${isActive ? 'badge-success' : 'badge-error'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
    {isPromo && (
      <span className="badge badge-sm badge-warning">
        Promo
      </span>
    )}
  </div>
);

const ActionButtons = ({ 
  package: pkg, 
  onToggleActive, 
  onDelete, 
  onCopyLink,
  togglingId, 
  deletingId 
}) => {
  const id = pkg._id || pkg.id;
  const isActive = pkg.active !== false;

  return (
    <div className="flex flex-wrap gap-1 mt-3">
      <button
        onClick={() => onToggleActive(pkg)}
        disabled={togglingId === id}
        className={`btn btn-xs ${isActive ? 'btn-warning' : 'btn-success'} flex-1 min-w-0`}
        title={isActive ? 'Deactivate package' : 'Activate package'}
      >
        {togglingId === id ? '⋯' : (isActive ? 'Deactivate' : 'Activate')}
      </button>
      
      <Link
        href={`/admin/packages/${id}/edit`}
        className="btn btn-xs btn-primary flex-1 min-w-0"
        title="Edit package"
      >
        Edit
      </Link>
      
      <button
        onClick={() => onCopyLink(pkg.slug)}
        className="btn btn-xs btn-ghost flex-1 min-w-0"
        title="Copy public link"
      >
        🔗
      </button>
      
      <button
        onClick={() => onDelete(id, pkg.title)}
        disabled={deletingId === id}
        className="btn btn-xs btn-error flex-1 min-w-0"
        title="Delete package"
      >
        {deletingId === id ? '⋯' : 'Delete'}
      </button>
    </div>
  );
};

export default function PackagesInner() {
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // Filter states
  const [filters, setFilters] = useState({
    query: '',
    city: '',
    onlyActive: false,
    onlyPromo: false
  });

  const [appliedFilters, setAppliedFilters] = useState({
    query: '',
    city: '',
    onlyActive: false,
    onlyPromo: false
  });

  // Data state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

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

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch packages');
        }

        // Parse and process package list
        const packageList = Array.isArray(data) ? data : (data.items || []);
        const processedPackages = packageList.map((pkg) => ({
          ...pkg,
          media: Array.isArray(pkg.media)
            ? pkg.media.map((media) => ({ 
                ...media, 
                url: mediaUrl(media.url) 
              }))
            : [],
        }));

        // Filter promotions if needed
        const filteredPackages = appliedFilters.onlyPromo
          ? processedPackages.filter((pkg) => computePricing(pkg).isPromoActive)
          : processedPackages;

        setItems(filteredPackages);
        setTotal(data.total || filteredPackages.length);

      } catch (error) {
        if (error?.name !== 'AbortError') {
          setError(error.message || 'Could not load packages. Please try again.');
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
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

  // Filter handlers
  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      query: filters.query.trim(),
      city: filters.city,
      onlyActive: filters.onlyActive,
      onlyPromo: filters.onlyPromo
    });
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      city: '',
      onlyActive: false,
      onlyPromo: false
    });
    setAppliedFilters({
      query: '',
      city: '',
      onlyActive: false,
      onlyPromo: false
    });
    setPage(1);
  };

  // Package actions
  const handleDelete = async (id, title) => {
    if (!id) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title || 'this package'}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    const token = getToken();
    if (!token) {
      setError('Session expired. Please sign in again.');
      return;
    }

    try {
      setDeletingId(id);
      const response = await fetch(`${API_BASE}/api/packages/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete package');
      }

      // Update local state
      setItems((prev) => prev.filter((pkg) => (pkg._id || pkg.id) !== id));
      setTotal((currentTotal) => Math.max(0, currentTotal - 1));
      
    } catch (error) {
      setError(error.message || 'Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (pkg) => {
    const id = pkg?._id || pkg?.id;
    if (!id) return;

    const token = getToken();
    if (!token) {
      setError('Session expired. Please sign in again.');
      return;
    }

    try {
      setTogglingId(id);
      const newActiveStatus = pkg.active === false ? true : false;
      
      const response = await fetch(`${API_BASE}/api/packages/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ active: newActiveStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update package status');
      }

      // Update local state
      setItems((prev) =>
        prev.map((item) => 
          (item._id || item.id) === id 
            ? { ...item, active: newActiveStatus } 
            : item
        )
      );

    } catch (error) {
      setError(error.message || 'Status update failed. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCopyLink = async (slug) => {
    try {
      if (!slug) {
        setError('No slug available for this package');
        return;
      }
      const publicUrl = `${window.location.origin}/packages/${slug}`;
      await navigator.clipboard.writeText(publicUrl);
      // You could replace this with a toast notification
      alert('Package link copied to clipboard!');
    } catch (error) {
      setError('Failed to copy link to clipboard');
    }
  };

  return (
    <AdminGuard>
      <section className="container-default py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Package Management</h1>
            <p className="text-gray-600 mt-1">
              Manage your travel packages, promotions, and availability
            </p>
          </div>
          <Link 
            href="/admin/packages/new" 
            className="btn btn-primary gap-2"
          >
            <span>+</span>
            New Package
          </Link>
        </div>

        {/* Filters Card */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Search</span>
                </label>
                <input
                  type="text"
                  placeholder="Search packages..."
                  className="input input-bordered"
                  value={filters.query}
                  onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
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
                  onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
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
                    onChange={(e) => setFilters(prev => ({ ...prev, onlyActive: e.target.checked }))}
                  />
                  <span className="label-text font-medium">Active Only</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={filters.onlyPromo}
                    onChange={(e) => setFilters(prev => ({ ...prev, onlyPromo: e.target.checked }))}
                  />
                  <span className="label-text font-medium">Promotions Only</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={applyFilters}
                  className="btn btn-primary flex-1"
                >
                  Apply
                </button>
                <button 
                  onClick={clearFilters}
                  className="btn btn-ghost"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Error Messages */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="loading loading-spinner loading-md"></div>
              <span>Loading packages...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error shadow-lg">
            <div>
              <span>{error}</span>
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => setError('')}
            >
              ✕
            </button>
          </div>
        )}

        {/* Results Summary */}
        {!loading && items.length > 0 && (
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Showing {items.length} of {total} packages
            </p>
            <div className="text-sm text-gray-500">
              Page {page} of {pages}
            </div>
          </div>
        )}

        {/* Packages Grid */}
        {!loading && items.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2">No packages found</h3>
              <p className="text-gray-600 mb-6">
                {appliedFilters.query || appliedFilters.city || appliedFilters.onlyActive || appliedFilters.onlyPromo
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by creating your first package.'}
              </p>
              <Link href="/admin/packages/new" className="btn btn-primary">
                Create New Package
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((pkg) => {
              const id = pkg._id || pkg.id;
              const imageUrl = pkg.media?.[0]?.url || 'https://picsum.photos/600/400?random=1';
              const pricing = computePricing(pkg);

              return (
                <div key={id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                  <figure className="relative h-48">
                    <img
                      src={imageUrl}
                      alt={pkg.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <StatusBadge 
                        isActive={pkg.active !== false} 
                        isPromo={pricing.isPromoActive} 
                      />
                    </div>
                  </figure>
                  
                  <div className="card-body">
                    <h3 className="card-title text-lg line-clamp-2 mb-2">
                      {pkg.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {pkg.description || 'No description provided'}
                    </p>

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(pricing.currentPrice, pricing.currency)}
                      </span>
                      {pricing.isPromoActive && pricing.discountPercentage > 0 && (
                        <span className="badge badge-success badge-sm">
                          {pricing.discountPercentage}% OFF
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Created: {formatDate(pkg.createdAt)}</span>
                      <span>{pkg.city || 'No city'}</span>
                    </div>

                    <ActionButtons
                      package={pkg}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDelete}
                      onCopyLink={handleCopyLink}
                      togglingId={togglingId}
                      deletingId={deletingId}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && items.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} packages
            </div>
            
            <div className="flex items-center gap-4">
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
                  {LIMIT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="join">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="join-item btn btn-sm"
                >
                  «
                </button>
                <button className="join-item btn btn-sm btn-active">
                  Page {page}
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="join-item btn btn-sm"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AdminGuard>
  );
}