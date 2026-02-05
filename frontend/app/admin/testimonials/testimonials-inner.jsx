"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "../AdminGuard";
import { API_BASE } from "@/app/lib/config";
import { useAdminI18n } from "../i18n/AdminI18nProvider";

const LIMITS = [10, 20, 50];

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

function Stars({ rating = 5 }) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <span className="text-amber-500 text-sm" aria-label={`${r} / 5`}>
      {"★".repeat(r)}
      <span className="text-slate-300">{"★".repeat(5 - r)}</span>
    </span>
  );
}

function StatusBadge({ label, tone = "pending" }) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "danger"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={classNames("text-xs px-2 py-1 rounded border inline-flex", cls)}>{label}</span>;
}

export default function TestimonialsInner() {
  const { t, lang } = useAdminI18n();
  const router = useRouter();
  const locale = lang === "en" ? "en-US" : "es-PE";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");

  const [selected, setSelected] = useState(() => new Set());
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

  const statusTone = (s) => (s === "approved" ? "success" : s === "rejected" ? "danger" : "pending");
  const statusLabel = (s) =>
    s === "approved"
      ? t("testimonials.statusApproved", "Approved")
      : s === "rejected"
      ? t("testimonials.statusRejected", "Rejected")
      : t("testimonials.statusPending", "Pending");

  const fetchTestimonials = useCallback(async () => {
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
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());

    const res = await fetchJSON(api(`testimonials/admin?${params.toString()}`), {
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
      if (res.networkError || res.status === 0) {
        setErr(t("testimonials.waiting", "Waiting for new testimonials. We'll notify you in the admin panel."));
      } else {
        setErr(res.json?.message || t("errors.connection", "Connection error with backend. Check URL/CORS/network."));
      }
      setLoading(false);
      return;
    }

    const list = Array.isArray(res.json?.items) ? res.json.items : [];
    setItems(list);
    setPage(res.json?.page || 1);
    setPages(res.json?.pages || 1);
    setTotal(res.json?.total || list.length);
    setLoading(false);
  }, [authHeaders, getToken, limit, page, q, router, status, t]);

  useEffect(() => {
    fetchTestimonials();
    return () => {
      try {
        abortRef.current?.abort?.();
      } catch {}
    };
  }, [fetchTestimonials]);

  const toggleSelect = (id) => {
    const key = String(id);
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const selectAllOnPage = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      items.forEach((it) => n.add(String(it._id || it.id)));
      return n;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const updateStatusBulk = async (nextStatus) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!getToken()) return;

    const res = await fetchJSON(api("testimonials/bulk/status"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ ids, status: nextStatus }),
      timeoutMs: 20000,
    });

    if (!res.ok) {
      if (res.status === 401) router.push("/admin/login");
      return;
    }
    setItems((prev) => prev.map((it) => (selected.has(String(it._id || it.id)) ? { ...it, status: nextStatus } : it)));
    clearSelection();
  };

  const updateOne = async (id, nextStatus) => {
    if (!id) return;
    if (!getToken()) return;

    const res = await fetchJSON(api(`testimonials/${encodeURIComponent(id)}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ status: nextStatus }),
      timeoutMs: 15000,
    });

    if (!res.ok) {
      if (res.status === 401) router.push("/admin/login");
      return;
    }
    setItems((prev) => prev.map((it) => (String(it._id || it.id) === String(id) ? { ...it, status: nextStatus } : it)));
  };

  const canPrev = page > 1;
  const canNext = page < pages;

  return (
    <AdminGuard>
      <section className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{t("testimonials.title", "Testimonials")}</h1>
            <p className="text-sm text-slate-500">
              {t("labels.total", "Total")}: <b>{total}</b>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="btn btn-ghost">
              {t("actions.backToDashboard", "Back to Dashboard")}
            </Link>
            <button className="btn" onClick={fetchTestimonials}>
              {t("actions.refresh", "Refresh")}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="label">{t("testimonials.filterStatus", "Status")}</label>
              <select className="input w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">{t("testimonials.statusPending", "Pending")}</option>
                <option value="approved">{t("testimonials.statusApproved", "Approved")}</option>
                <option value="rejected">{t("testimonials.statusRejected", "Rejected")}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">{t("testimonials.filterSearch", "Search")}</label>
              <input
                className="input w-full"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={t("testimonials.filterSearchPlaceholder", "Name, message, package, source…")}
              />
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
            <div className="flex items-end gap-2">
              <button className="btn btn-ghost w-full" onClick={() => setQ("")}>
                {t("actions.clear", "Clear")}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={selectAllOnPage}>
            {t("actions.selectAll", "Select page")}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearSelection}>
            {t("actions.clearSelection", "Clear selection")}
          </button>
          <button className="btn btn-sm" onClick={() => updateStatusBulk("approved")}>
            {t("testimonials.approve", "Approve")}
          </button>
          <button className="btn btn-sm" onClick={() => updateStatusBulk("rejected")}>
            {t("testimonials.reject", "Reject")}
          </button>
          <button className="btn btn-sm" onClick={() => updateStatusBulk("pending")}>
            {t("testimonials.markPending", "Mark pending")}
          </button>
        </div>

        {err ? (
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
        ) : !err && items.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">{t("testimonials.empty", "No testimonials found.")}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {items.map((it) => {
              const id = it._id || it.id;
              const statusText = statusLabel(it.status || "pending");
              const tone = statusTone(it.status || "pending");
              const isChecked = selected.has(String(id));

              return (
                <div key={id} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(id)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-semibold">
                            {it.name || t("testimonials.anon", "Traveler")}
                            {it.country ? <span className="text-slate-500"> · {it.country}</span> : null}
                          </div>
                          <div className="text-xs text-slate-500">{fmtDT(it.createdAt ? new Date(it.createdAt) : null)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge label={statusText} tone={tone} />
                        <Stars rating={it.rating} />
                      </div>
                    </div>

                    {it.title ? <div className="mt-2 font-semibold">{it.title}</div> : null}
                    {it.message ? <div className="mt-1 text-sm text-slate-700">{it.message}</div> : null}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      {it.source ? (
                        it.sourceUrl ? (
                          <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                            {it.source}
                          </a>
                        ) : (
                          <span>{it.source}</span>
                        )
                      ) : null}
                      {it.packageSlug ? (
                        <Link href={`/packages/${it.packageSlug}`} target="_blank" className="underline">
                          {it.packageSlug}
                        </Link>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => updateOne(id, "approved")}>
                        {t("testimonials.approve", "Approve")}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateOne(id, "rejected")}>
                        {t("testimonials.reject", "Reject")}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateOne(id, "pending")}>
                        {t("testimonials.markPending", "Mark pending")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
