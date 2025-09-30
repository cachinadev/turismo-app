// frontend/app/admin/packages/[id]/edit/page.js
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import AdminGuard from '@/app/admin/AdminGuard';
import PackageForm from '@/app/admin/packages/_form';
import { API_BASE } from '@/app/lib/config';

export default function EditPackagePage() {
  const router = useRouter();
  const { id } = useParams() || {};
  const abortRef = useRef(null);

  const [pkg, setPkg] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getToken = () => {
    try { return localStorage.getItem('token') || ''; } catch { return ''; }
  };

  // Guard if someone lands directly without a token
  useEffect(() => {
    const tok = getToken();
    if (!tok) router.replace('/admin/login');
  }, [router]);

  const fetchPkg = useCallback(async (signal) => {
    if (!id) {
      setErr('Missing package ID.');
      setPkg(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/packages/id/${id}`, {
        cache: 'no-store',
        signal,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        const msg = json?.message || (res.status === 404 ? 'Package not found.' : 'Failed to load package.');
        throw new Error(msg);
      }
      setPkg(json);
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      setErr(e?.message || 'An unexpected error occurred while loading.');
      setPkg(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load / reload with AbortController
  const runFetch = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    fetchPkg(ac.signal);
  }, [fetchPkg]);

  useEffect(() => {
    runFetch();
    return () => abortRef.current?.abort();
  }, [runFetch]);

  const copyPublicLink = async () => {
    try {
      const slug = pkg?.slug;
      if (!slug) return;
      const url = new URL(`/packages/${slug}`, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const handleDelete = async () => {
    if (!id || !pkg) return;
    if (!confirm(`Delete "${pkg?.title || 'this package'}"? This action cannot be undone.`)) return;

    try {
      setDeleting(true);
      const token = getToken();
      if (!token) throw new Error('Session expired. Please sign in again.');

      const res = await fetch(`${API_BASE}/api/packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = data?.message || 'Could not delete the package.';
        if (res.status === 401) msg = 'Session expired. Please sign in again.';
        throw new Error(msg);
      }
      router.replace('/admin/packages');
      router.refresh();
    } catch (e) {
      setErr(e?.message || 'An unexpected error occurred while deleting.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminGuard>
      <main>
        {/* No NavBar here—admin layout should already provide the correct chrome */}
        <section className="container-default py-8" aria-busy={loading ? 'true' : 'false'}>
          {/* Breadcrumb + actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Link href="/admin/packages" className="hover:underline">Packages</Link>
              <span>›</span>
              <span className="text-slate-800">{pkg?.title || 'Edit'}</span>
              {pkg?.active === false && (
                <span className="badge !ml-2 !bg-slate-300 !text-slate-700" title="Inactive">
                  Inactive
                </span>
              )}
              {pkg?.isPromoActive && (
                <span className="badge !ml-2 bg-amber-500 text-white" title="Promo active">
                  Promo
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/admin/packages" className="btn btn-ghost">← Back</Link>
              <button className="btn" onClick={runFetch} disabled={loading}>
                {loading ? 'Loading…' : 'Refresh'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={copyPublicLink}
                disabled={!pkg?.slug}
                title="Copy public link"
                aria-live="polite"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <Link
                href={pkg?.slug ? `/packages/${pkg.slug}` : '#'}
                className={`btn btn-ghost ${pkg?.slug ? '' : 'pointer-events-none opacity-50'}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open public page"
              >
                View public ↗
              </Link>
              <button
                className="btn btn-ghost text-red-700"
                onClick={handleDelete}
                disabled={deleting || !pkg}
                title="Delete package"
                aria-busy={deleting ? 'true' : 'false'}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">Edit package</h1>

          {/* Status / errors */}
          {err && (
            <div className="card mb-4" role="alert">
              <div className="card-body">
                <p className="text-red-600">{err}</p>
                <div className="mt-2">
                  <button className="btn" onClick={runFetch} disabled={loading}>
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loader skeleton */}
          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-hidden="true">
              <div className="lg:col-span-2 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card">
                    <div className="card-body">
                      <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-3" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-10 bg-slate-200 rounded animate-pulse" />
                        <div className="h-10 bg-slate-200 rounded animate-pulse" />
                        <div className="h-10 bg-slate-200 rounded animate-pulse col-span-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <aside className="space-y-4">
                <div className="card overflow-hidden">
                  <div className="h-40 bg-slate-200 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3" />
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-24" />
                  <div className="h-3 bg-slate-200 rounded animate-pulse mt-2" />
                </div>
              </aside>
            </div>
          )}

          {/* Not found */}
          {!loading && !pkg && !err && <p className="text-slate-600">Package not found.</p>}

          {/* Form */}
          {!loading && pkg && (
            <PackageForm
              pkg={pkg}
              onSaved={(doc) => {
                if (doc?._deleted) router.replace('/admin/packages');
                else router.replace('/admin/packages');
              }}
            />
          )}
        </section>
      </main>
    </AdminGuard>
  );
}
