'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';

/* ------------------ Helpers ------------------ */
const stripApiSuffix = (s = '') =>
  String(s || '').replace(/\/+$/, '').replace(/\/api\/?$/i, '');

function base64UrlDecode(str) {
  try {
    const pad = (s) => s + '==='.slice((s.length + 3) % 4);
    const b64 = pad(String(str).replace(/-/g, '+').replace(/_/g, '/'));
    return atob(b64);
  } catch {
    return '';
  }
}

function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const json = base64UrlDecode(parts[1]);
  try {
    return JSON.parse(json || '{}');
  } catch {
    return null;
  }
}

const ROLE_ORDER = ['agent', 'admin'];
function roleSatisfies(userRole, required) {
  if (!required) return true;
  const reqList = Array.isArray(required) ? required : [required];
  const userIdx = ROLE_ORDER.indexOf(String(userRole || '').toLowerCase());
  if (userIdx < 0) return false;
  return reqList.some((r) => {
    const reqIdx = ROLE_ORDER.indexOf(String(r || '').toLowerCase());
    return reqIdx >= 0 && userIdx >= reqIdx;
  });
}

/* ------------------ Component ------------------ */
export default function AdminGuard({
  children,
  requiredRole = 'admin',
  redirectTo = '/admin/login',
  refreshThresholdMs = 60_000, // refresh if expiring in 60s
  clockToleranceMs = 5_000, // skew tolerance
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const redirectedRef = useRef(false);

  const apiHost = useMemo(() => stripApiSuffix(API_BASE || ''), []);

  const getToken = useCallback(() => {
    try {
      return localStorage.getItem('token') || '';
    } catch {
      return '';
    }
  }, []);

  const setToken = useCallback((t) => {
    try {
      if (t) localStorage.setItem('token', t);
      else localStorage.removeItem('token');
    } catch {}
  }, []);

  const goLogin = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    const qs = searchParams?.toString();
    const nextUrl = pathname + (qs ? `?${qs}` : '');
    router.replace(`${redirectTo}?next=${encodeURIComponent(nextUrl)}`);
  }, [router, pathname, searchParams, redirectTo]);

  const tryRefresh = useCallback(async () => {
    // Requires backend refresh cookie to exist (credentials include)
    try {
      const res = await fetch(`${apiHost}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) return { token: null, hardFail: res.status === 401 || res.status === 403 };
      const data = await res.json().catch(() => ({}));
      return { token: data?.token || null, hardFail: false };
    } catch {
      // network/cors/down: not a "hard" auth failure
      return { token: null, hardFail: false };
    }
  }, [apiHost]);

  const checkOnce = useCallback(async () => {
    setChecking(true);
    setOk(false);

    const token = getToken();
    if (!token) {
      goLogin();
      return;
    }

    const payload = parseJwt(token);
    if (!payload) {
      setToken(null);
      goLogin();
      return;
    }

    const now = Date.now();
    const expMs = typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
    const nbfMs = typeof payload.nbf === 'number' ? payload.nbf * 1000 : 0;

    // Not before check
    if (nbfMs && now + clockToleranceMs < nbfMs) {
      setToken(null);
      goLogin();
      return;
    }

    // Role check helper
    const roleFrom = (p) => p?.role || (Array.isArray(p?.roles) ? p.roles[0] : undefined);

    // If token has no exp, treat it as invalid -> force refresh/login
    const tokenHasExp = !!expMs;
    const tokenExpired = tokenHasExp ? now >= expMs : true;
    const expiringSoon = tokenHasExp ? now >= expMs - refreshThresholdMs : true;

    // Refresh if expired or expiring soon
    if (tokenExpired || expiringSoon) {
      const { token: refreshed, hardFail } = await tryRefresh();

      if (refreshed) {
        setToken(refreshed);
        const p2 = parseJwt(refreshed);
        if (!p2) {
          setToken(null);
          goLogin();
          return;
        }
        const role2 = roleFrom(p2);
        if (!roleSatisfies(role2, requiredRole)) {
          goLogin();
          return;
        }
        setOk(true);
        setChecking(false);
        return;
      }

      // If backend explicitly says not authorized -> logout
      if (hardFail) {
        setToken(null);
        goLogin();
        return;
      }

      // Otherwise: refresh failed due to network/etc.
      // If token is still valid (only expiringSoon), allow user to stay.
      if (!tokenExpired) {
        const role = roleFrom(payload);
        if (!roleSatisfies(role, requiredRole)) {
          goLogin();
          return;
        }
        setOk(true);
        setChecking(false);
        return;
      }

      // Token actually expired and we couldn't refresh -> logout
      setToken(null);
      goLogin();
      return;
    }

    // Token valid: Role check
    const role = roleFrom(payload);
    if (!roleSatisfies(role, requiredRole)) {
      goLogin();
      return;
    }

    setOk(true);
    setChecking(false);
  }, [
    getToken,
    setToken,
    goLogin,
    tryRefresh,
    requiredRole,
    refreshThresholdMs,
    clockToleranceMs,
  ]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      redirectedRef.current = false;
      await checkOnce();
    };

    run();

    const onStorage = (e) => {
      if (!alive) return;
      if (e.key === 'token') {
        redirectedRef.current = false;
        checkOnce();
      }
    };

    const onFocus = () => {
      if (!alive) return;
      redirectedRef.current = false;
      checkOnce();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      alive = false;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [checkOnce]);

  /* ------------------ UI ------------------ */
  if (checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center" aria-live="polite">
          <div
            className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin mx-auto mb-3"
            role="status"
            aria-label="Verificando acceso"
          />
          <p className="text-slate-600">Verificando acceso…</p>
        </div>
      </div>
    );
  }

  if (!ok) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">
        Redirecting to login…
      </div>
    );
  }

  return children;
}
