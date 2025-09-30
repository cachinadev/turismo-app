//frontend/app/admin/login/page.js
'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';

const BRAND = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Vicuña Adventures';

function AdminLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // Redirect target after login (optional: ?next=/admin/packages)
  const next = sp?.get('next') || '/admin/packages';
  const force = sp?.get('force') === '1';   // ignore any existing token
  const logout = sp?.get('logout') === '1'; // clear any existing token

  // UI state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hadToken, setHadToken] = useState(false);

  // Memoized getter so we only touch localStorage on client
  const getToken = useMemo(() => {
    return () => {
      try {
        return localStorage.getItem('token') || '';
      } catch {
        return '';
      }
    };
  }, []);

  // Initial token handling
  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        if (logout) {
          try {
            localStorage.removeItem('token');
          } catch {}
          setChecking(false);
          return;
        }

        const token = getToken();
        setHadToken(!!token);

        if (!token || force) {
          setChecking(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!alive) return;

        if (res.ok) {
          router.replace(next);
        } else {
          try {
            localStorage.removeItem('token');
          } catch {}
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, [router, next, force, logout, getToken]);

  const login = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setSubmitting(true);
      try {
        const payload = {
          email: String(email).trim().toLowerCase(),
          password: String(password),
        };

        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg =
            data?.message ||
            (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
            (res.status === 401
              ? 'Invalid credentials.'
              : res.status >= 500
              ? 'Server unavailable. Try again later.'
              : 'Could not sign in.');
          throw new Error(msg);
        }

        if (data?.token) {
          try {
            localStorage.setItem('token', data.token);
          } catch {}
        }

        router.replace(next);
      } catch (err) {
        setError(err.message || 'Could not sign in.');
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, router, next]
  );

  const switchAccount = useCallback(() => {
    try {
      localStorage.removeItem('token');
    } catch {}
    const qs = new URLSearchParams();
    qs.set('force', '1');
    if (next) qs.set('next', next);
    router.replace(`/admin/login?${qs.toString()}`);
  }, [router, next]);

  if (checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-slate-600 text-sm" aria-live="polite">
          Checking session…
        </p>
      </div>
    );
  }

  return (
    <section className="container-default py-10 flex justify-center">
      <form
        onSubmit={login}
        className="card w-full max-w-md p-6 space-y-5"
        aria-describedby={error ? 'login-error' : undefined}
      >
        <div>
          <h1 className="text-xl font-semibold">{BRAND} • Admin access</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to manage packages and bookings.
          </p>
        </div>

        {hadToken && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            A previous session was detected.{' '}
            <button
              type="button"
              className="underline"
              onClick={switchAccount}
            >
              Use a different account
            </button>
            .
          </div>
        )}

        <fieldset disabled={submitting} className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">Email</span>
            <input
              className="input mt-1 w-full"
              type="email"
              inputMode="email"
              name="email"
              autoComplete="username"
              placeholder="admin@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-700">Password</span>
            <div className="relative mt-1">
              <input
                className="input w-full pr-20"
                type={showPwd ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600 hover:text-slate-900"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && (
            <p
              id="login-error"
              className="text-red-600 text-sm"
              aria-live="assertive"
            >
              {error}
            </p>
          )}

          <button
            className="btn btn-primary w-full"
            type="submit"
            disabled={submitting}
            aria-busy={submitting ? 'true' : 'false'}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <button type="button" className="underline" onClick={switchAccount}>
              Use a different account
            </button>
            <a
              className="underline"
              href="/admin/login?logout=1"
              title="Clear any stored session and reload"
            >
              Log out & reload
            </a>
          </div>
        </fieldset>

        <p className="text-[11px] text-slate-500">
          Make sure <code>NEXT_PUBLIC_API_URL</code> points to your backend.
        </p>
      </form>
    </section>
  );
}

export default function AdminLoginPage() {
  return (
    <main>
      <Suspense
        fallback={<div className="text-center py-20">Loading…</div>}
      >
        <AdminLoginInner />
      </Suspense>
    </main>
  );
}
