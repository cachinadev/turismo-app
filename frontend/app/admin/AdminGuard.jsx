// frontend/app/admin/AdminGuard.jsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { API_BASE } from '@/app/lib/config';

/* ------------------ Helpers ------------------ */
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
  clockToleranceMs = 5_000,   // skew tolerance
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const redirectedRef = useRef(false);

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
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      return data?.token || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function check() {
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

      // Refresh if expired / expiring
      if (!expMs || now >= expMs - refreshThresholdMs) {
        const refreshed = await tryRefresh();
        if (!alive) return;
        if (refreshed) {
          setToken(refreshed);
          const p2 = parseJwt(refreshed);
          if (!p2) {
            setToken(null);
            goLogin();
            return;
          }
          const role = p2.role || (Array.isArray(p2.roles) ? p2.roles[0] : undefined);
          if (!roleSatisfies(role, requiredRole)) {
            goLogin();
            return;
          }
          setOk(true);
          setChecking(false);
          return;
        } else {
          setToken(null);
          goLogin();
          return;
        }
      }

      // Role check
      const role = payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : undefined);
      if (!roleSatisfies(role, requiredRole)) {
        goLogin();
        return;
      }

      if (alive) {
        setOk(true);
        setChecking(false);
      }
    }

    check();

    const onStorage = (e) => {
      if (e.key === 'token') {
        redirectedRef.current = false;
        check();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      alive = false;
      window.removeEventListener('storage', onStorage);
    };
  }, [getToken, setToken, goLogin, tryRefresh, requiredRole, refreshThresholdMs, clockToleranceMs]);

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
