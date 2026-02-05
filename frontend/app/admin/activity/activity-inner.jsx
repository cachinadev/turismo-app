"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "../AdminGuard";
import { API_BASE } from "@/app/lib/config";
import { useAdminI18n } from "../i18n/AdminI18nProvider";

const LIMITS = [20, 50, 100];
const ACTION_LABELS = Object.freeze({
  booking_status_update: { es: "Cambio de estado de reserva", en: "Booking status changed" },
  booking_status_bulk: { es: "Cambio masivo de estado", en: "Bulk status update" },
  testimonial_status_update: { es: "Cambio de estado de testimonio", en: "Testimonial status changed" },
  package_update: { es: "Actualización de paquete", en: "Package updated" },
  package_create: { es: "Creación de paquete", en: "Package created" },
  package_delete: { es: "Eliminación de paquete", en: "Package deleted" },
  package_toggle_active: { es: "Activar/Desactivar paquete", en: "Package active toggled" },
  upload_media: { es: "Carga de archivos", en: "Media uploaded" },
  admin_login: { es: "Inicio de sesión admin", en: "Admin login" },
  admin_logout: { es: "Cierre de sesión admin", en: "Admin logout" },
});
const ENTITY_LABELS = Object.freeze({
  booking: { es: "Reserva", en: "Booking" },
  testimonial: { es: "Testimonio", en: "Testimonial" },
  package: { es: "Paquete", en: "Package" },
  user: { es: "Usuario", en: "User" },
  upload: { es: "Archivo", en: "Upload" },
});

const stripApiSuffix = (s = "") => String(s || "").replace(/\/+$/, "").replace(/\/api\/?$/i, "");
const joinUrl = (base, path) => {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  if (!b) return `/${p}`;
  return `${b}/${p}`;
};
const api = (path = "") => {
  const base = stripApiSuffix(API_BASE || "");
  const p = String(path || "").replace(/^\/+/, "");
  if (p.startsWith("api/")) return joinUrl(base, p);
  return joinUrl(base, `api/${p}`);
};

const fetchJSON = async (
  url,
  { method = "GET", headers = {}, body, cache = "no-store", timeoutMs = 12000, signal } = {}
) => {
  const ctrl = new AbortController();

  let onAbort;
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else {
      onAbort = () => ctrl.abort();
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, headers, body, cache, signal: ctrl.signal });
    const text = await res.text().catch(() => "");
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text };
  } catch (error) {
    const aborted = error?.name === "AbortError" || ctrl.signal.aborted;
    return { ok: false, status: 0, json: null, text: "", aborted, networkError: !aborted, error };
  } finally {
    clearTimeout(t);
    if (signal && onAbort) {
      try {
        signal.removeEventListener("abort", onAbort);
      } catch {}
    }
  }
};

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function ActivityInner() {
  const { t, lang } = useAdminI18n();
  const router = useRouter();
  const locale = lang === "en" ? "en-US" : "es-PE";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");

  const abortRef = useRef(null);

  const getToken = useCallback(() => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }, []);

  const authHeaders = useMemo(() => {
    const tok = getToken();
    return tok ? { Authorization: `Bearer ${tok}` } : {};
  }, [getToken]);

  const fmtDT = (d) =>
    d ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d) : "—";

  const formatActionLabel = useCallback(
    (actionKey = "") => {
      const key = String(actionKey || "").trim();
      if (!key) return "—";
      const mapped = ACTION_LABELS[key];
      if (mapped) return lang === "en" ? mapped.en : mapped.es;
      return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    },
    [lang]
  );

  const formatEntityLabel = useCallback(
    (entityKey = "") => {
      const key = String(entityKey || "").trim();
      if (!key) return "—";
      const mapped = ENTITY_LABELS[key];
      if (mapped) return lang === "en" ? mapped.en : mapped.es;
      return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    },
    [lang]
  );

  const formatMetaSummary = useCallback(
    (actionKey, meta) => {
      const m = meta && typeof meta === "object" ? meta : null;
      if (!m) return "";
      switch (actionKey) {
        case "booking_status_update":
        case "booking_status_bulk":
          return `${t("activity.meta.bookingStatus", "Estado")}: ${m.status || "—"}${
            m.count ? ` · ${t("labels.total", "Total")}: ${m.count}` : ""
          }`;
        case "testimonial_status_update":
          return `${t("activity.meta.testimonialStatus", "Estado del testimonio")}: ${m.status || "—"}${
            m.name ? ` · ${m.name}` : ""
          }`;
        case "package_update":
        case "package_create":
        case "package_delete":
          return `${t("activity.meta.package", "Paquete")}: ${m.title || "—"}${
            m.slug ? ` · ${m.slug}` : ""
          }`;
        case "package_toggle_active":
          return `${t("activity.meta.package", "Paquete")}: ${m.title || "—"}${
            m.active != null
              ? ` · ${m.active ? t("labels.active", "Activo") : t("labels.inactive", "Inactivo")}`
              : ""
          }${m.slug ? ` · ${m.slug}` : ""}`;
        case "upload_media":
          return `${t("activity.meta.uploaded", "Archivos")}: ${m.count || 0}`;
        case "admin_login":
        case "admin_logout":
          return m.email ? `${t("activity.meta.user", "Usuario")}: ${m.email}` : "";
        default:
          return "";
      }
    },
    [t]
  );

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setErr("");

    if (!getToken()) {
      setLoading(false);
      setErr(t("errors.sessionExpired", "Session expired. Please sign in again."));
      router.push("/admin/login");
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (action.trim()) params.set("action", action.trim());
    if (entity.trim()) params.set("entity", entity.trim());
    if (actor.trim()) params.set("actor", actor.trim());
    if (q.trim()) params.set("q", q.trim());

    const res = await fetchJSON(api(`admin/actions?${params.toString()}`), {
      headers: { ...authHeaders },
      signal: abortRef.current.signal,
      timeoutMs: 18000,
    });

    if (!res.ok) {
      if (res.status === 401) {
        setErr(t("errors.sessionExpired", "Session expired. Please sign in again."));
        router.push("/admin/login");
        setLoading(false);
        return;
      }
      setItems([]);
      setErr(res.json?.message || t("errors.connection", "Connection error with backend. Check URL/CORS/network."));
      setLoading(false);
      return;
    }

    const list = Array.isArray(res.json?.items) ? res.json.items : [];
    setItems(list);
    setPage(res.json?.page || 1);
    setPages(res.json?.pages || 1);
    setTotal(res.json?.total || list.length);
    setErr("");
    setLoading(false);
  }, [action, actor, authHeaders, entity, getToken, limit, page, q, router, t]);

  useEffect(() => {
    fetchActions();
    return () => {
      try {
        abortRef.current?.abort?.();
      } catch {}
    };
  }, [fetchActions]);

  const canPrev = page > 1;
  const canNext = page < pages;

  return (
    <AdminGuard>
      <section className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{t("activity.title", "Activity log")}</h1>
            <p className="text-sm text-slate-500">
              {t("labels.total", "Total")}: <b>{total}</b>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="btn btn-ghost">
              {t("actions.backToDashboard", "Back to Dashboard")}
            </Link>
            <button className="btn" onClick={fetchActions}>
              {t("actions.refresh", "Refresh")}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="label">{t("activity.filterAction", "Action")}</label>
              <input className="input w-full" value={action} onChange={(e) => setAction(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("activity.filterEntity", "Entity")}</label>
              <input className="input w-full" value={entity} onChange={(e) => setEntity(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("activity.filterActor", "Actor")}</label>
              <input className="input w-full" value={actor} onChange={(e) => setActor(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("activity.filterSearch", "Search")}</label>
              <input className="input w-full" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("filters.resultsPerPage", "Results per page")}</label>
              <select
                className="input w-full"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                {LIMITS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {err && items.length === 0 ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{err}</div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <div className="card-body animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">{t("activity.empty", "No activity yet.")}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {items.map((a) => (
              <div key={a._id || a.id} className="card">
                <div className="card-body">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{formatActionLabel(a.action)}</div>
                      <div className="text-xs text-slate-500">{fmtDT(a.createdAt ? new Date(a.createdAt) : null)}</div>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      {a.actor?.email || a.actor?.name || "—"}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-slate-700">
                    {a.entity ? (
                      <span className="mr-2">
                        <b>{formatEntityLabel(a.entity)}</b>
                        {a.entityId ? ` · ${a.entityId}` : ""}
                      </span>
                    ) : null}
                  </div>

                  {a.meta ? (
                    <>
                      {formatMetaSummary(a.action, a.meta) ? (
                        <div className="mt-2 text-sm text-slate-700">{formatMetaSummary(a.action, a.meta)}</div>
                      ) : null}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-slate-500">
                          {t("activity.details", "View details")}
                        </summary>
                        <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(a.meta, null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button className="btn btn-ghost" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t("actions.prev", "Previous")}
          </button>
          <div className="text-sm text-slate-600">
            {t("labels.page", "Page")} {page} / {pages}
          </div>
          <button className="btn btn-ghost" disabled={!canNext} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            {t("actions.next", "Next")}
          </button>
        </div>
      </section>
    </AdminGuard>
  );
}
