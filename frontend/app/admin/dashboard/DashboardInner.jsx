"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "../AdminGuard";
import { API_BASE } from "@/app/lib/config";
import { mediaUrl } from "@/app/lib/media";
import { useAdminI18n } from "../i18n/AdminI18nProvider";

/* ===================== Branding ===================== */
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Vicuña Adventures";
const COMPANY_LOGO = process.env.NEXT_PUBLIC_COMPANY_LOGO || "";

/* ===================== Constants ===================== */

/* ===================== URL helpers ===================== */
const stripApiSuffix = (s = "") => String(s || "").replace(/\/+$/, "").replace(/\/api\/?$/i, "");

const joinUrl = (base, path) => {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  if (!b) return `/${p}`;
  return `${b}/${p}`;
};

// Always build "/api/..." exactly once even if API_BASE already contains "/api"
const api = (path = "") => {
  const base = stripApiSuffix(API_BASE || "");
  const p = String(path || "").replace(/^\/+/, "");
  if (p.startsWith("api/")) return joinUrl(base, p);
  return joinUrl(base, `api/${p}`);
};

/* ===================== Formatting helpers ===================== */
const money = (v, currency = "PEN", locale = "es-PE") =>
  new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(v || 0));

const fmtDT = (d, locale = "es-PE") =>
  d ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d) : "—";

const parseList = (j) => (Array.isArray(j) ? j : j?.items || []);

const normalizePhone = (p) => String(p || "").replace(/[^\d]/g, "");
const buildWa = (phone, text = "") => {
  const num = normalizePhone(phone);
  if (!num) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${num}${q}`;
};

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* ===================== Booking ID helpers ===================== */
/** Mongo DB ID used for admin actions (status, pdf, etc.) */
const bookingDbId = (b) => String(b?._id || b?.id || "");

/** Public reservation ID shown in emails like "VA-20260121-9ATZJ2" */
const bookingPublicId = (b) => String(b?.reservationId || b?.publicId || b?.code || b?.reference || "").trim();

/** What we show/copy in dashboard */
const bookingIdForUI = (b) => bookingPublicId(b) || bookingDbId(b);

/* ===================== Fetch helper ===================== */
/** fetch JSON with timeout + optional external abort (no AbortSignal.any) */
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
    const aborted = error?.name === "AbortError" || error?.code === 20 || ctrl.signal.aborted;
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

/* ===================== Download helpers ===================== */
function triggerDownloadFromBlob(blob, filename) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = filename || "download";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1200);
}

/* ===================== Component ===================== */
export default function DashboardInner() {
  const router = useRouter();
  const { t, lang } = useAdminI18n();
  const locale = lang === "en" ? "en-US" : "es-PE";

  const BOOKING_STATUSES = useMemo(
    () => [
      { value: "Pendiente", label: t("status.pending", "Pending") },
      { value: "En proceso", label: t("status.inProgress", "In progress") },
      { value: "Finalizado", label: t("status.finalized", "Finalized") },
      { value: "Cancelado", label: t("status.cancelled", "Cancelled") },
    ],
    [t]
  );

  const BOOKING_SORTS = useMemo(
    () => [
      { v: "created_desc", label: t("sort.createdDesc", "Created ↓") },
      { v: "created_asc", label: t("sort.createdAsc", "Created ↑") },
      { v: "date_desc", label: t("sort.dateDesc", "Tour date ↓") },
      { v: "date_asc", label: t("sort.dateAsc", "Tour date ↑") },
      { v: "total_desc", label: t("sort.totalDesc", "Total ↓") },
      { v: "total_asc", label: t("sort.totalAsc", "Total ↑") },
    ],
    [t]
  );

  /* ===== UI Tabs ===== */
  const [tab, setTab] = useState("bookings"); // bookings | packages | testimonials | events

  /* ===== Data ===== */
  const [packages, setPackages] = useState([]);
  const [events, setEvents] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [bookingsResp, setBookingsResp] = useState({ page: 1, limit: 30, total: 0, pages: 1, items: [] });
  const [stats, setStats] = useState(null);

  /* ===== Loading ===== */
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);

  /* ===== UI State ===== */
  const [err, setErr] = useState("");
  const [toast, setToast] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [online, setOnline] = useState(true);

  /* ===== Filters (Bookings) ===== */
  const [bQ, setBQ] = useState("");
  const [bStatus, setBStatus] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [bSort, setBSort] = useState("created_desc");
  const [bPage, setBPage] = useState(1);
  const [bLimit, setBLimit] = useState(30);

  /* ===== Filters (Packages) ===== */
  const [pQ, setPQ] = useState("");
  const [pOnlyPromo, setPOnlyPromo] = useState(false);

  /* ===== Filters (Events) ===== */
  const [eType, setEType] = useState("");
  const [eSource, setESource] = useState("");
  const [eFrom, setEFrom] = useState("");
  const [eTo, setETo] = useState("");

  /* ===== Filters (Testimonials) ===== */
  const [tStatus, setTStatus] = useState("pending");
  const [tQ, setTQ] = useState("");

  /* ===== Selection (Bookings) ===== */
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  /* ===== UX ===== */
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [deletingPkgId, setDeletingPkgId] = useState(null);
  const [lastCopiedKey, setLastCopiedKey] = useState("");

  /* ===== Refs ===== */
  const toastRef = useRef(null);
  const abortRef = useRef({}); // { bookings, stats, packages, events }

  const currencyLabel = useCallback(
    (c) => {
      switch ((c || "").toUpperCase()) {
        case "PEN":
          return t("currency.pen", "soles (PEN)");
        case "USD":
          return t("currency.usd", "dollars (USD)");
        case "EUR":
          return t("currency.eur", "euros (EUR)");
        default:
          return (c || "").toUpperCase();
      }
    },
    [t]
  );

  /* ===================== Small utilities ===================== */
  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const getToken = useCallback(() => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }, []);

  const authHeaders = useMemo(() => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [getToken]);

  const abortKey = useCallback((k) => {
    try {
      if (abortRef.current?.[k]) abortRef.current[k].abort();
    } catch {}
    abortRef.current[k] = new AbortController();
    return abortRef.current[k].signal;
  }, []);

  const handle401 = useCallback(() => {
    setErr(t("errors.sessionExpired", "Session expired. Please sign in again."));
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    router.push("/admin/login");
  }, [router, t]);

  const handleLogout = useCallback(() => {
    if (!confirm(t("confirm.signOut", "Are you sure you want to sign out?"))) return;
    const token = getToken();
    if (token) {
      fetch(api("auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    router.push("/admin/login");
  }, [router, t]);

  /* ===================== Online indicator ===================== */
  useEffect(() => {
    const update = () => setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  /* ===================== Fetchers ===================== */
  const bQDebounced = useDebouncedValue(bQ, 350);
  const eTypeDebounced = useDebouncedValue(eType, 350);
  const eSourceDebounced = useDebouncedValue(eSource, 350);
  const tQDebounced = useDebouncedValue(tQ, 350);

  const buildBookingsUrl = useCallback(() => {
    const qs = new URLSearchParams();
    qs.set("page", String(bPage));
    qs.set("limit", String(bLimit));
    if (bQDebounced.trim()) qs.set("q", bQDebounced.trim());
    if (bStatus) qs.set("status", bStatus);
    qs.set("includeCancelled", showCancelled ? "true" : "false");
    qs.set("sort", bSort || "created_desc");
    return api(`bookings?${qs.toString()}`);
  }, [bPage, bLimit, bQDebounced, bStatus, showCancelled, bSort]);

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);

    if (!getToken()) {
      setLoadingBookings(false);
      return handle401();
    }

    const res = await fetchJSON(buildBookingsUrl(), {
      headers: { ...authHeaders },
      signal: abortKey("bookings"),
      timeoutMs: 18000,
    });

    if (!res.ok) {
      if (res.status === 401) return handle401();
      setErr(
        res.networkError
          ? t("errors.connection", "Connection error with backend. Check URL/CORS/network.")
          : res.json?.message || t("errors.loadBookings", "Could not load bookings.")
      );
      setBookingsResp((p) => ({ ...p, items: [], total: 0, pages: 1 }));
      setLoadingBookings(false);
      return;
    }

    // ✅ success -> clear stale errors
    setErr("");

    const payload = res.json || {};
    const items = parseList(payload);

    setBookingsResp({
      page: payload.page || bPage,
      limit: payload.limit || bLimit,
      total: payload.total || 0,
      pages: payload.pages || 1,
      items,
    });

    // Keep selection only for current page (DB ids)
    setSelectedIds((prev) => {
      const keep = new Set();
      const currentIds = new Set(items.map((x) => bookingDbId(x)));
      for (const id of prev) if (currentIds.has(id)) keep.add(id);
      return keep;
    });

    setLoadingBookings(false);
  }, [abortKey, authHeaders, bLimit, bPage, buildBookingsUrl, getToken, handle401, t]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);

    if (!getToken()) {
      setStats(null);
      setLoadingStats(false);
      return handle401();
    }

    const res = await fetchJSON(api("admin/stats"), {
      headers: { ...authHeaders },
      signal: abortKey("stats"),
      timeoutMs: 18000,
    });

    if (!res.ok) {
      if (res.status === 401) return handle401();
      setStats(null);
      setLoadingStats(false);
      return;
    }

    setStats(res.json || null);
    setLoadingStats(false);
  }, [abortKey, authHeaders, getToken, handle401]);

  const fetchPackages = useCallback(async () => {
    setLoadingPackages(true);

    const res = await fetchJSON(api("packages?preview=1&limit=200"), {
      signal: abortKey("packages"),
      timeoutMs: 18000,
    });

    if (!res.ok) {
      setPackages([]);
      setLoadingPackages(false);
      return;
    }

    const pkgs = parseList(res.json).map((p) => ({
      ...p,
      media: Array.isArray(p.media) ? p.media.map((m) => ({ ...m, url: mediaUrl(m?.url) })) : [],
    }));

    setPackages(pkgs);
    setLoadingPackages(false);
  }, [abortKey]);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);

    if (!getToken()) {
      setEvents([]);
      setLoadingEvents(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("limit", "100");
    if (eTypeDebounced) params.set("type", eTypeDebounced);
    if (eSourceDebounced) params.set("source", eSourceDebounced);
    if (eFrom) params.set("dateFrom", eFrom);
    if (eTo) params.set("dateTo", eTo);

    const res = await fetchJSON(api(`events?${params.toString()}`), {
      headers: { ...authHeaders },
      signal: abortKey("events"),
      timeoutMs: 18000,
    });

    setEvents(res.ok ? parseList(res.json || []) : []);
    setLoadingEvents(false);
  }, [abortKey, authHeaders, eFrom, eSourceDebounced, eTo, eTypeDebounced, getToken]);

  const fetchTestimonials = useCallback(async () => {
    setLoadingTestimonials(true);

    if (!getToken()) {
      setTestimonials([]);
      setLoadingTestimonials(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("limit", "200");
    if (tStatus) params.set("status", tStatus);

    const res = await fetchJSON(api(`testimonials/admin?${params.toString()}`), {
      headers: { ...authHeaders },
      signal: abortKey("testimonials"),
      timeoutMs: 18000,
    });

    setTestimonials(res.ok ? parseList(res.json || []) : []);
    setLoadingTestimonials(false);
  }, [abortKey, authHeaders, getToken, tStatus]);

  const fetchAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setErr("");
      }
      await Promise.all([fetchPackages(), fetchBookings(), fetchStats(), fetchEvents()]);
      setLastUpdated(new Date());
      if (!silent) {
        setLoading(false);
        showToast(t("toast.dashboardUpdated", "Dashboard updated"), "success");
      }
    },
    [fetchBookings, fetchEvents, fetchPackages, fetchStats, showToast, t]
  );

  /* ===================== Effects ===================== */
  useEffect(() => {
    fetchAll();
    return () => {
      // Abort pending requests on unmount
      try {
        Object.values(abortRef.current || {}).forEach((c) => c?.abort?.());
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bPage, bLimit, bStatus, showCancelled, bSort, bQDebounced]);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eTypeDebounced, eSourceDebounced, eFrom, eTo]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => fetchAll({ silent: true }), 30000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchAll]);

  useEffect(() => {
    if (tab !== "testimonials") return;
    fetchTestimonials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tStatus]);

  /* ===================== Mutations ===================== */
  const updateStatus = useCallback(
    async (dbId, status) => {
      if (!getToken()) return handle401();

      const prevItems = bookingsResp.items;

      setBookingsResp((p) => ({
        ...p,
        items: p.items.map((b) => (bookingDbId(b) === String(dbId) ? { ...b, status } : b)),
      }));

      const res = await fetchJSON(api(`bookings/${encodeURIComponent(dbId)}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ status }),
        timeoutMs: 20000,
      });

      if (!res.ok) {
        if (res.status === 401) return handle401();
        setBookingsResp((p) => ({ ...p, items: prevItems }));
        showToast(res.json?.message || t("errors.updateStatus", "Could not update status."), "danger");
        return;
      }

      showToast(`${t("toast.bookingUpdated", "Booking updated")}: ${status}`, "success");
      setLastUpdated(new Date());
      fetchStats();
    },
    [authHeaders, bookingsResp.items, fetchStats, getToken, handle401, showToast, t]
  );

  const bulkUpdateStatus = useCallback(
    async (status) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return showToast(t("toast.selectAtLeastOne", "Select at least 1 booking"), "info");
      if (!confirm(`${t("confirm.bulkApply", "Apply")} "${status}" ${t("confirm.bulkTo", "to")} ${ids.length} ${t("confirm.bulkBookings", "booking(s)")}?`)) return;

      if (!getToken()) return handle401();

      const prevItems = bookingsResp.items;

      setBookingsResp((p) => ({
        ...p,
        items: p.items.map((b) => (selectedIds.has(bookingDbId(b)) ? { ...b, status } : b)),
      }));

      const res = await fetchJSON(api("bookings/bulk/status"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ids, status }), // ids are DB ids
        timeoutMs: 25000,
      });

      if (!res.ok) {
        if (res.status === 401) return handle401();
        setBookingsResp((p) => ({ ...p, items: prevItems }));
        showToast(res.json?.message || t("errors.bulkAction", "Could not apply bulk action."), "danger");
        return;
      }

      setSelectedIds(new Set());
      showToast(`${t("toast.bulkApplied", "Bulk applied")}: ${status}`, "success");
      setLastUpdated(new Date());
      fetchStats();
    },
    [authHeaders, bookingsResp.items, fetchStats, getToken, handle401, selectedIds, showToast, t]
  );

  const openBookingPdf = useCallback(
    async (dbId) => {
      if (!dbId) return showToast(t("errors.bookingNoId", "Booking without ID"), "info");
      if (!getToken()) return handle401();

      const res = await fetch(api(`bookings/${encodeURIComponent(dbId)}/pdf`), {
        method: "GET",
        headers: { ...authHeaders },
      });

      if (res.status === 401) return handle401();
      if (!res.ok) return showToast(t("errors.openPdf", "Could not open PDF"), "danger");

      const blob = await res.blob();
      triggerDownloadFromBlob(blob, `reserva_${dbId}.pdf`);
      showToast(t("toast.pdfDownloaded", "PDF downloaded"), "success");
    },
    [authHeaders, getToken, handle401, showToast, t]
  );

  const openBrochurePdf = useCallback(
    async (packageId) => {
      if (!packageId) return showToast(t("errors.packageNoId", "Package without ID"), "info");
      if (!getToken()) return handle401();

      const res = await fetch(api(`brochures/${encodeURIComponent(packageId)}.pdf`), {
        method: "GET",
        headers: { ...authHeaders },
      });

      if (res.status === 401) return handle401();
      if (!res.ok) return showToast(t("errors.openBrochure", "Could not open brochure"), "danger");

      const blob = await res.blob();
      triggerDownloadFromBlob(blob, `brochure_${packageId}.pdf`);
      showToast(t("toast.brochureDownloaded", "Brochure downloaded"), "success");
    },
    [authHeaders, getToken, handle401, showToast, t]
  );

  const updateTestimonialStatus = useCallback(
    async (id, status) => {
      if (!id) return;
      if (!getToken()) return handle401();

      const prev = testimonials;
      setTestimonials((items) => items.map((t) => (String(t._id || t.id) === String(id) ? { ...t, status } : t)));

      const res = await fetchJSON(api(`testimonials/${encodeURIComponent(id)}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ status }),
        timeoutMs: 15000,
      });

      if (!res.ok) {
        if (res.status === 401) return handle401();
        setTestimonials(prev);
        showToast(t("testimonials.updateFailed", "Could not update testimonial."), "danger");
        return;
      }

      showToast(t("testimonials.updated", "Testimonial updated."), "success");
      setLastUpdated(new Date());
    },
    [authHeaders, getToken, handle401, showToast, t, testimonials]
  );

  const exportBookingsCSVFromServer = useCallback(
    async ({ onlySelected = false } = {}) => {
      if (!getToken()) return handle401();

      const ids = Array.from(selectedIds);
      if (onlySelected && ids.length === 0) return showToast(t("toast.noSelected", "No bookings selected"), "info");

      // Client-side export for selected
      if (onlySelected) {
        const rows = bookingsResp.items.filter((b) => selectedIds.has(bookingDbId(b)));
        const header = [
          t("export.bookingId", "BookingID"),
          t("export.dbId", "DB_ID"),
          t("export.date", "Date"),
          t("export.status", "Status"),
          t("export.package", "Package"),
          t("export.customer", "Customer"),
          t("export.email", "Email"),
          t("export.phone", "Phone"),
          t("export.adults", "Adults"),
          t("export.children", "Children"),
          t("export.total", "Total"),
          t("export.currency", "Currency"),
          t("export.createdAt", "CreatedAt"),
        ];

        const esc = (v) => {
          const s = String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };

        const csv = [
          header.join(","),
          ...rows.map((b) => {
            const cust = b.customer || {};
            const cur = (b.currency || "PEN").toUpperCase();
            return [
              bookingIdForUI(b),
              bookingDbId(b),
              b.date ? new Date(b.date).toISOString() : "",
              b.status || "",
              b.packageMeta?.title || b.package?.title || "",
              cust.name || "",
              cust.email || "",
              cust.phone || "",
              b.people?.adults ?? "",
              b.people?.children ?? "",
              b.totalPrice ?? 0,
              cur,
              b.createdAt ? new Date(b.createdAt).toISOString() : "",
            ]
              .map(esc)
              .join(",");
          }),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        triggerDownloadFromBlob(blob, `reservas_seleccionadas_${new Date().toISOString().slice(0, 10)}.csv`);
        showToast(t("toast.exportedSelected", "Exported (selected)"), "success");
        return;
      }

      // Server export for filtered
      const qs = new URLSearchParams();
      if (bQDebounced.trim()) qs.set("q", bQDebounced.trim());
      if (bStatus) qs.set("status", bStatus);
      qs.set("includeCancelled", showCancelled ? "true" : "false");

      const url = api(`bookings/export.csv?${qs.toString()}`);
      const res = await fetch(url, { method: "GET", headers: { ...authHeaders } });

      if (res.status === 401) return handle401();
      if (!res.ok) return showToast(t("errors.export", "Could not export"), "danger");

      const blob = await res.blob();
      triggerDownloadFromBlob(blob, `reservas_${new Date().toISOString().slice(0, 10)}.csv`);
      showToast(t("toast.exportedFiltered", "Exported (filtered)"), "success");
    },
    [authHeaders, bQDebounced, bStatus, bookingsResp.items, getToken, handle401, selectedIds, showCancelled, showToast, t]
  );

  const deletePackage = useCallback(
    async (id, title) => {
      if (!id) return;
      if (!confirm(`${t("confirm.deletePackage", "Delete")} "${title || t("packages.thisPackage", "this package")}"? ${t("confirm.cannotUndo", "This action cannot be undone.")}`)) return;

      if (!getToken()) return handle401();

      try {
        setDeletingPkgId(id);
        const res = await fetchJSON(api(`packages/${encodeURIComponent(id)}`), {
          method: "DELETE",
          headers: { ...authHeaders },
          timeoutMs: 20000,
        });

        if (!res.ok) throw new Error(res.json?.message || t("errors.deletePackage", "Failed to delete package."));
        setPackages((prev) => prev.filter((p) => (p._id || p.id) !== id));
        showToast(t("toast.packageDeleted", "Package deleted"), "success");
      } catch (e) {
        setErr(e?.message || t("errors.deletePackage", "Failed to delete package."));
      } finally {
        setDeletingPkgId(null);
      }
    },
    [authHeaders, getToken, handle401, showToast, t]
  );

  /* ===================== Selection helpers ===================== */
  const toggleSelect = useCallback((dbId) => {
    const key = String(dbId);
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      for (const b of bookingsResp.items) {
        const id = bookingDbId(b);
        if (id) n.add(id);
      }
      return n;
    });
    showToast(t("toast.selectedPage", "Selected bookings on page"), "success");
  }, [bookingsResp.items, showToast, t]);

  const copyText = useCallback(
    async (text, key) => {
      try {
        await navigator.clipboard.writeText(String(text || ""));
        if (key) setLastCopiedKey(String(key));
        showToast(t("toast.copied", "Copied ✅"), "success");
        if (key) {
          setTimeout(() => {
            setLastCopiedKey((k) => (k === String(key) ? "" : k));
          }, 1500);
        }
      } catch {
        showToast(t("errors.copyFailed", "Could not copy"), "info");
      }
    },
    [showToast, t]
  );

  /* ===================== Derived ===================== */

  // Single source of truth for stats in UI
  const uiStats = useMemo(() => stats || null, [stats]);

  const packagesFiltered = useMemo(() => {
    const q = pQ.trim().toLowerCase();
    return packages.filter((p) => {
      if (pOnlyPromo && !p.isPromoActive) return false;
      if (!q) return true;
      const hay = [p.title, p.city, p.slug].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [packages, pQ, pOnlyPromo]);

  const testimonialsFiltered = useMemo(() => {
    const q = tQDebounced.trim().toLowerCase();
    if (!q) return testimonials;
    return testimonials.filter((t) => {
      const hay = [t.name, t.title, t.message, t.country, t.source, t.packageSlug]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [testimonials, tQDebounced]);

  const statusBadgeCls = useCallback((s) => {
    switch (s) {
      case "Finalizado":
        return "badge bg-emerald-600 text-white";
      case "En proceso":
        return "badge bg-sky-600 text-white";
      case "Cancelado":
        return "badge bg-rose-600 text-white";
      default:
        return "badge bg-amber-500 text-white";
    }
  }, []);

  const headerSubline = useMemo(() => {
    const parts = [];
    parts.push(online ? t("labels.online", "Online") : t("labels.offline", "Offline"));
    if (lastUpdated) parts.push(`${t("labels.lastUpdated", "Updated")}: ${fmtDT(lastUpdated, locale)}`);
    return parts.join(" · ");
  }, [online, lastUpdated, locale, t]);

  // Avoid stale error banner when data is visible
  const showGlobalError = Boolean(err) && bookingsResp.items.length === 0;

  // KPI Canceladas:
  // - Prefer backend stats if provided
  // - If filter is Cancelado, use current total
  // - Else fallback to count visible items
  const kpiCancelled = useMemo(() => {
    const fromStats = uiStats?.bookings?.cancelled;
    const isFiniteNumber = (n) => Number.isFinite(Number(n));
    if (isFiniteNumber(fromStats)) return Number(fromStats);

    if ((bStatus || "").toLowerCase() === "cancelado") return Number(bookingsResp.total || 0);

    return (bookingsResp.items || []).reduce(
      (acc, b) => acc + (((b?.status || "").toLowerCase() === "cancelado") ? 1 : 0),
      0
    );
  }, [uiStats, bStatus, bookingsResp.total, bookingsResp.items]);

  /* ===================== UI ===================== */
  return (
    <AdminGuard>
      <section className="container-default py-20">
        {/* Toast */}
        {toast && (
          <div
            className={classNames(
              "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow border text-sm",
              toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : toast.type === "danger"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-slate-50 border-slate-200 text-slate-800"
            )}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex items-center gap-3">
              {COMPANY_LOGO ? (
                <img
                  src={COMPANY_LOGO}
                  alt={COMPANY_NAME}
                  className="w-10 h-10 rounded-xl object-contain border bg-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                  {COMPANY_NAME.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {COMPANY_NAME} • {t("admin.title", "Admin")}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={classNames(
                      "text-xs px-2 py-1 rounded",
                      online ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"
                    )}
                  >
                    {headerSubline}
                  </span>
                  {loading && (
                    <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {t("dashboard.loading", "Loading…")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm bg-slate-50 border rounded-lg px-3 py-2">
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                {t("dashboard.autoRefresh", "Auto-refresh (30s)")}
              </label>

              <button className="btn" onClick={() => fetchAll()}>
                {t("actions.refresh", "Refresh")}
              </button>

              <Link href="/admin/packages" className="btn btn-ghost">
                {t("admin.packages", "Packages")}
              </Link>
              <Link href="/admin/testimonials" className="btn btn-ghost">
                {t("admin.testimonials", "Testimonials")}
              </Link>
              <Link href="/admin/activity" className="btn btn-ghost">
                {t("admin.activity", "Activity log")}
              </Link>

              <button
                onClick={handleLogout}
                className="btn btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
                title={t("actions.signOut", "Sign out")}
              >
                {t("actions.signOut", "Sign out")}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={classNames(
                "px-3 py-2 rounded-lg border text-sm",
                tab === "bookings" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
              )}
              onClick={() => setTab("bookings")}
            >
              {t("admin.bookings", "Bookings")}
            </button>
            <button
              className={classNames(
                "px-3 py-2 rounded-lg border text-sm",
                tab === "packages" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
              )}
              onClick={() => setTab("packages")}
            >
              {t("admin.packages", "Packages")}
            </button>
            <button
              className={classNames(
                "px-3 py-2 rounded-lg border text-sm",
                tab === "testimonials" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
              )}
              onClick={() => setTab("testimonials")}
            >
              {t("admin.testimonials", "Testimonials")}
            </button>
            <button
              className={classNames(
                "px-3 py-2 rounded-lg border text-sm",
                tab === "events" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
              )}
              onClick={() => setTab("events")}
            >
              {t("admin.events", "Events")}
            </button>
          </div>

          {/* Errors (only when no bookings are visible to avoid stale banner) */}
          {showGlobalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{err}</p>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <KPI title={t("kpi.totalPackages", "Total packages")} value={loadingStats ? "…" : uiStats?.packages?.total ?? packages.length} />
            <KPI
              title={t("kpi.activePackages", "Active packages")}
              value={loadingStats ? "…" : uiStats?.packages?.active ?? packages.filter((p) => p.active !== false).length}
            />
            <KPI
              title={t("kpi.promos", "Promos (any)")}
              value={loadingStats ? "…" : uiStats?.packages?.promoAny ?? packages.filter((p) => p.isPromoActive).length}
            />
            <KPI title={t("kpi.activeBookings", "Active bookings")} value={loadingStats ? "…" : uiStats?.bookings?.active ?? bookingsResp.total} />
            <KPI title={t("kpi.cancelled", "Cancelled")} value={loadingStats ? "…" : kpiCancelled} accent="danger" />

            {uiStats?.revenueByCurrency
              ? Object.entries(uiStats.revenueByCurrency).map(([cur, amount]) => (
                  <KPI
                    key={cur}
                    title={`${t("kpi.revenue", "Revenue")} · ${currencyLabel(cur)}`}
                    value={money(amount, cur, locale)}
                    subtitle={t("bookings.finalized", "(Finalized)")}
                  />
                ))
              : null}
          </div>
        </div>

        {/* ===================== TAB: BOOKINGS ===================== */}
        {tab === "bookings" && (
          <section className="mt-8 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h3 className="text-xl font-semibold">{t("admin.bookings", "Bookings")}</h3>

              <div className="flex flex-wrap items-center gap-2">
                <button className="btn btn-ghost" onClick={() => exportBookingsCSVFromServer({ onlySelected: false })}>
                  {t("bookings.exportFiltered", "Export (filtered)")}
                </button>
                <button className="btn btn-ghost" onClick={() => exportBookingsCSVFromServer({ onlySelected: true })}>
                  {t("bookings.exportSelected", "Export (selected)")}
                </button>
                <button className="btn btn-ghost" onClick={selectAllOnPage}>
                  {t("bookings.selectPage", "Select page")}
                </button>
                <button className="btn btn-ghost" onClick={clearSelection}>
                  {t("bookings.clearSelection", "Clear selection")}
                </button>

                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost" onClick={() => bulkUpdateStatus("En proceso")}>
                    {t("bookings.bulkInProgress", "Bulk: In progress")}
                  </button>
                  <button className="btn btn-ghost" onClick={() => bulkUpdateStatus("Finalizado")}>
                    {t("bookings.bulkFinalized", "Bulk: Finalized")}
                  </button>
                  <button className="btn btn-ghost text-rose-700" onClick={() => bulkUpdateStatus("Cancelado")}>
                    {t("bookings.bulkCancel", "Bulk: Cancel")}
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="card">
              <div className="card-body grid grid-cols-1 md:grid-cols-10 gap-3">
                <input
                  className="input md:col-span-4"
                  placeholder={t("bookings.searchPlaceholder", "Search (customer, email, package, ID)…")}
                  value={bQ}
                  onChange={(e) => {
                    setBQ(e.target.value);
                    setBPage(1);
                  }}
                />

                <select
                  className="input md:col-span-2"
                  value={bStatus}
                  onChange={(e) => {
                    setBStatus(e.target.value);
                    setBPage(1);
                  }}
                >
                  <option value="">{t("bookings.allStatuses", "All statuses")}</option>
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <select className="input md:col-span-2" value={bSort} onChange={(e) => setBSort(e.target.value)}>
                  {BOOKING_SORTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border md:col-span-2">
                  <input
                    type="checkbox"
                    checked={showCancelled}
                    onChange={(e) => {
                      setShowCancelled(e.target.checked);
                      setBPage(1);
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-700">{t("bookings.includeCancelled", "Include cancelled")}</span>
                </label>

                <div className="md:col-span-10 flex items-center justify-between gap-2 bg-slate-50 border rounded-lg p-2">
                  <div className="text-sm text-slate-700">
                    {t("labels.total", "Total")}: <b>{loadingBookings ? "…" : bookingsResp.total}</b> · {t("labels.page", "Page")}{" "}
                    <b>{bookingsResp.page}</b>/<b>{bookingsResp.pages}</b> · {t("labels.selected", "Selected")}:{" "}
                    <b>{selectedIds.size}</b>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      className="input !py-1 !h-9"
                      value={bLimit}
                      onChange={(e) => {
                        setBLimit(Number(e.target.value || 30));
                        setBPage(1);
                      }}
                      title={t("bookings.resultsPerPage", "Results per page")}
                    >
                      {[15, 30, 50, 80, 120].map((n) => (
                        <option key={n} value={n}>
                          {t("bookings.perPage", `${n}/page`).replace("{n}", String(n))}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => setBPage(1)} disabled={bPage === 1}>
                        «
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setBPage((p) => Math.max(1, p - 1))} disabled={bPage === 1}>
                        ‹
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setBPage((p) => Math.min(bookingsResp.pages || 1, p + 1))}
                        disabled={bPage >= (bookingsResp.pages || 1)}
                      >
                        ›
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setBPage(bookingsResp.pages || 1)} disabled={bPage >= (bookingsResp.pages || 1)}>
                        »
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bookings list */}
            {loadingBookings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card">
                    <div className="p-4 space-y-2 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                      <div className="h-10 bg-slate-200 rounded w-full mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : bookingsResp.items.length === 0 ? (
              <div className="card">
                <div className="card-body text-center py-10">
                  <p className="text-slate-600">{t("empty.noBookings", "No bookings found for these filters.")}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop: table */}
                <div className="hidden lg:block card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr className="text-left text-slate-600">
                          <th className="p-3 w-10">
                            <input
                              type="checkbox"
                              checked={
                                bookingsResp.items.length > 0 &&
                                bookingsResp.items.every((b) => selectedIds.has(bookingDbId(b)))
                              }
                              onChange={(e) => {
                                if (e.target.checked) selectAllOnPage();
                                else clearSelection();
                              }}
                            />
                          </th>
                          <th className="p-3">{t("table.package", "Package")}</th>
                          <th className="p-3">{t("table.date", "Date")}</th>
                          <th className="p-3">{t("table.customer", "Customer")}</th>
                          <th className="p-3">{t("table.total", "Total")}</th>
                          <th className="p-3">{t("table.status", "Status")}</th>
                          <th className="p-3">{t("table.actions", "Actions")}</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {bookingsResp.items.map((b) => {
                          const dbId = bookingDbId(b);
                          const uiId = bookingIdForUI(b);
                          const cust = b.customer || {};
                          const status = b.status || "Pendiente";
                          const city = b.packageMeta?.city || b.package?.city || "—";
                          const pkgTitle = b.packageMeta?.title || b.package?.title || "—";
                          const when = b.date ? new Date(b.date) : null;
                          const totalCur = (b.currency || "PEN").toUpperCase();
                          const waText = `${t("bookings.waMessageCompany", "Hi! About my booking")} (${uiId}) ${COMPANY_NAME}…`;
                          const wa = cust.phone ? buildWa(cust.phone, waText) : null;

                          return (
                            <tr key={dbId} className={classNames(status === "Cancelado" ? "bg-slate-50 opacity-80" : "")}>
                              <td className="p-3 align-top">
                                <input type="checkbox" checked={selectedIds.has(dbId)} onChange={() => toggleSelect(dbId)} />
                              </td>

                              <td className="p-3 align-top">
                                <div className="font-semibold">{pkgTitle}</div>
                                <div className="text-xs text-slate-500">
                                  {city} · {t("labels.id", "ID")}: <span className="font-mono">{uiId || "—"}</span>{" "}
                                  <button
                                    className="underline"
                                    onClick={() => copyText(uiId || dbId, `booking:${uiId || dbId}`)}
                                  >
                                    {lastCopiedKey === `booking:${uiId || dbId}`
                                      ? t("actions.copied", "Copied!")
                                      : t("actions.copy", "copy")}
                                  </button>
                                </div>
                              </td>

                              <td className="p-3 align-top text-slate-700">{fmtDT(when, locale)}</td>

                              <td className="p-3 align-top">
                                <div className="font-medium">{cust.name || "—"}</div>
                                <div className="text-xs text-slate-500">{cust.email || "—"}</div>
                                <div className="text-xs text-slate-500">{cust.phone || "—"}</div>
                              </td>

                              <td className="p-3 align-top">
                                <div className="font-semibold">{money(b.totalPrice ?? 0, totalCur, locale)}</div>
                                <div className="text-xs text-slate-500">{currencyLabel(totalCur)}</div>
                              </td>

                              <td className="p-3 align-top">
                                <span className={statusBadgeCls(status)}>
                                  {BOOKING_STATUSES.find((s) => s.value === status)?.label || status}
                                </span>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {BOOKING_STATUSES.map((s) => {
                                    const disabled = s.value === status;
                                    return (
                                      <button
                                        key={s.value}
                                        className={classNames(
                                          "px-2 py-1 rounded border text-xs",
                                          disabled
                                            ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                                            : s.value === "Cancelado"
                                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                            : "bg-white hover:bg-slate-50"
                                        )}
                                        onClick={() => !disabled && updateStatus(dbId, s.value)}
                                        disabled={disabled}
                                      >
                                        {s.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <div className="flex flex-wrap gap-2">
                                  {wa && (
                                    <a className="px-3 py-1 rounded border text-xs bg-white hover:bg-slate-50" href={wa} target="_blank" rel="noopener noreferrer">
                                      {t("labels.whatsapp", "WhatsApp")}
                                    </a>
                                  )}
                                  {cust.email && (
                                    <a className="px-3 py-1 rounded border text-xs bg-white hover:bg-slate-50" href={`mailto:${cust.email}`}>
                                      {t("labels.email", "Email")}
                                    </a>
                                  )}
                                  <button
                                    className="px-3 py-1 rounded border text-xs bg-white hover:bg-slate-50"
                                    onClick={() => copyText(cust.email || "", `email:${uiId || dbId}`)}
                                    disabled={!cust.email}
                                  >
                                    {lastCopiedKey === `email:${uiId || dbId}`
                                      ? t("actions.copied", "Copied!")
                                      : t("actions.copyEmail", "Copy email")}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile/cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:hidden">
                  {bookingsResp.items.map((b) => {
                    const dbId = bookingDbId(b);
                    const uiId = bookingIdForUI(b);

                    const pkgTitle = b.packageMeta?.title || b.package?.title || "—";
                    const city = b.packageMeta?.city || b.package?.city || "—";
                    const when = b.date ? new Date(b.date) : null;
                    const status = b.status || "Pendiente";
                    const cust = b.customer || {};
                    const totalCur = (b.currency || "PEN").toUpperCase();
                    const waText = `${t("bookings.waMessage", "Hi! About my booking")} (${uiId})…`;
                    const wa = cust.phone ? buildWa(cust.phone, waText) : null;

                    return (
                      <div key={dbId} className={classNames("card", status === "Cancelado" ? "bg-slate-50 opacity-80" : "")}>
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold line-clamp-1">{pkgTitle}</div>
                              <div className="text-xs text-slate-500">
                                {city} · {t("labels.id", "ID")}: <span className="font-mono">{uiId || "—"}</span>{" "}
                                <button
                                  className="underline"
                                  onClick={() => copyText(uiId || dbId, `booking:${uiId || dbId}`)}
                                >
                                  {lastCopiedKey === `booking:${uiId || dbId}`
                                    ? t("actions.copied", "Copied!")
                                    : t("actions.copy", "copy")}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={selectedIds.has(dbId)} onChange={() => toggleSelect(dbId)} />
                              <span className={statusBadgeCls(status)}>
                                {BOOKING_STATUSES.find((s) => s.value === status)?.label || status}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm text-slate-600">{fmtDT(when, locale)}</div>
                          <div className="text-sm">
                            <b>{cust.name || t("labels.customer", "Customer")}</b> • {cust.email || "—"}
                          </div>
                          <div className="text-sm text-slate-600">
                            {t("labels.phone", "Phone")}: {cust.phone || "—"}
                          </div>

                          <div className="text-sm">
                            {t("labels.total", "Total")}: <b>{money(b.totalPrice ?? 0, totalCur, locale)}</b>{" "}
                            <span className="text-xs text-slate-500">({currencyLabel(totalCur)})</span>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {wa && (
                              <a className="px-3 py-1 rounded border text-sm bg-white hover:bg-slate-50" href={wa} target="_blank" rel="noopener noreferrer">
                                {t("labels.whatsapp", "WhatsApp")}
                              </a>
                            )}
                            {cust.email && (
                              <a className="px-3 py-1 rounded border text-sm bg-white hover:bg-slate-50" href={`mailto:${cust.email}`}>
                                {t("labels.email", "Email")}
                              </a>
                            )}
                            <button
                              className="px-3 py-1 rounded border text-sm bg-white hover:bg-slate-50"
                              onClick={() => copyText(cust.email || "", `email:${uiId || dbId}`)}
                              disabled={!cust.email}
                            >
                              {lastCopiedKey === `email:${uiId || dbId}`
                                ? t("actions.copied", "Copied!")
                                : t("actions.copyEmail", "Copy email")}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            {BOOKING_STATUSES.map((s) => {
                              const disabled = s.value === status;
                              return (
                                <button
                                  key={s.value}
                                  className={classNames(
                                    "px-3 py-1 rounded border text-sm",
                                    disabled
                                      ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                                      : s.value === "Cancelado"
                                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                      : "bg-white hover:bg-slate-50"
                                  )}
                                  onClick={() => !disabled && updateStatus(dbId, s.value)}
                                  disabled={disabled}
                                >
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {/* ===================== TAB: PACKAGES ===================== */}
        {tab === "packages" && (
          <section className="mt-8 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h3 className="text-xl font-semibold">{t("admin.packages", "Packages")}</h3>
              <div className="text-xs text-slate-500">
                {t("packages.hint", "Create/edit also from")}{" "}
                <Link href="/admin/packages" className="underline">
                  {t("admin.packages", "Packages")}
                </Link>
              </div>
            </div>

            <div className="card">
              <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-3">
                <input
                  className="input md:col-span-3"
                  placeholder={t("packages.searchPlaceholder", "Search package (title, city, slug)…")}
                  value={pQ}
                  onChange={(e) => setPQ(e.target.value)}
                />

                <label className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border md:col-span-2">
                  <input type="checkbox" checked={pOnlyPromo} onChange={(e) => setPOnlyPromo(e.target.checked)} />
                  <span className="text-sm text-slate-700">{t("packages.onlyPromo", "Only promos")}</span>
                </label>

                <div className="text-sm text-slate-600 flex items-center md:col-span-1">
                  {t("labels.total", "Total")}: <b className="ml-1">{loadingPackages ? "…" : packagesFiltered.length}</b>
                </div>
              </div>
            </div>

            {loadingPackages ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card overflow-hidden">
                    <div className="h-44 bg-slate-200 animate-pulse" />
                    <div className="p-4 space-y-2 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-8 bg-slate-200 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : packagesFiltered.length === 0 ? (
              <p className="text-slate-600">{t("empty.noPackages", "No packages found for these filters.")}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {packagesFiltered.map((p) => {
                  const id = p._id || p.id;
                  const img = mediaUrl(p.media?.[0]?.url) || "https://picsum.photos/600/360";
                  const promo = !!p.isPromoActive;
                  const showEffective = promo && Number.isFinite(Number(p.effectivePrice));
                  const priceCurrent = showEffective ? p.effectivePrice : p.price;

                  return (
                    <div key={id} className="card overflow-hidden">
                      <div className="relative">
                        <img src={img} alt={p.title || t("labels.package", "Package")} className="w-full h-44 object-cover" />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className={classNames("badge", p.active !== false ? "bg-green-600 text-white" : "bg-slate-300 text-slate-800")}>
                            {p.active !== false ? t("labels.active", "Active") : t("labels.inactive", "Inactive")}
                          </span>
                          {promo && <span className="badge bg-amber-500 text-white">{t("labels.promo", "Promo")}</span>}
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="font-semibold line-clamp-1">{p.title}</div>
                        <div className="text-sm text-slate-600">{p.city}</div>

                        <div className="text-sm text-slate-700">
                          {showEffective ? (
                            <>
                              <span className="line-through mr-2 text-slate-500">{money(p.price, p.currency, locale)}</span>
                              <span className="font-semibold">{money(priceCurrent, p.currency, locale)}</span>
                            </>
                          ) : (
                            <span className="font-semibold">{money(priceCurrent, p.currency, locale)}</span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          {t("labels.slug", "Slug")}: {p.slug}{" "}
                          <button className="underline" onClick={() => copyText(p.slug, `slug:${p.slug}`)}>
                            {lastCopiedKey === `slug:${p.slug}`
                              ? t("actions.copied", "Copied!")
                              : t("actions.copy", "copy")}
                          </button>
                        </div>

                        <div className="pt-2 flex flex-wrap gap-2">
                          <Link href={`/admin/packages/${id}/edit`} className="btn btn-ghost btn-sm">
                            {t("actions.edit", "Edit")}
                          </Link>
                          <Link href={`/packages/${p.slug}`} className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer">
                            {t("actions.openPublic", "Open public")}
                          </Link>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-red-700"
                            onClick={() => deletePackage(id, p.title)}
                            disabled={deletingPkgId === id}
                          >
                            {deletingPkgId === id ? t("actions.deleting", "Deleting…") : t("actions.delete", "Delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ===================== TAB: TESTIMONIALS ===================== */}
        {tab === "testimonials" && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold">{t("testimonials.title", "Testimonials")}</h3>
              <button className="btn btn-ghost" onClick={fetchTestimonials} title={t("actions.refresh", "Refresh")}>
                {t("actions.refresh", "Refresh")}
              </button>
            </div>

            <div className="card mt-4">
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="label">{t("testimonials.filterStatus", "Status")}</label>
                    <select className="input w-full" value={tStatus} onChange={(e) => setTStatus(e.target.value)}>
                      <option value="pending">{t("testimonials.statusPending", "Pending")}</option>
                      <option value="approved">{t("testimonials.statusApproved", "Approved")}</option>
                      <option value="rejected">{t("testimonials.statusRejected", "Rejected")}</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">{t("testimonials.filterSearch", "Search")}</label>
                    <input
                      className="input w-full"
                      value={tQ}
                      onChange={(e) => setTQ(e.target.value)}
                      placeholder={t("testimonials.filterSearchPlaceholder", "Name, message, package, source…")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {loadingTestimonials ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card">
                    <div className="card-body animate-pulse space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : testimonialsFiltered.length === 0 ? (
              <div className="card mt-4">
                <div className="card-body">
                  <p className="text-slate-600">{t("testimonials.empty", "No testimonials found.")}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                {testimonialsFiltered.map((ts) => {
                  const id = ts._id || ts.id;
                  const status = ts.status || "pending";
                  const statusLabel =
                    status === "approved"
                      ? t("testimonials.statusApproved", "Approved")
                      : status === "rejected"
                      ? t("testimonials.statusRejected", "Rejected")
                      : t("testimonials.statusPending", "Pending");
                  const statusTone = status === "approved" ? "success" : status === "rejected" ? "danger" : "pending";
                  return (
                    <div key={id} className="card">
                      <div className="card-body">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">
                              {ts.name || t("testimonials.anon", "Traveler")}
                              {ts.country ? <span className="text-slate-500"> · {ts.country}</span> : null}
                            </div>
                            <div className="text-xs text-slate-500">
                              {fmtDT(ts.createdAt ? new Date(ts.createdAt) : null, locale)}
                            </div>
                          </div>
                          <div className="text-right">
                            <StatusBadge label={statusLabel} tone={statusTone} />
                            <Stars rating={ts.rating} className="text-amber-500 text-sm mt-1" />
                          </div>
                        </div>

                        {ts.title ? <div className="mt-2 font-semibold">{ts.title}</div> : null}
                        {ts.message ? <div className="mt-1 text-sm text-slate-700">{ts.message}</div> : null}

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          {ts.source ? (
                            ts.sourceUrl ? (
                              <a href={ts.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                {ts.source}
                              </a>
                            ) : (
                              <span>{ts.source}</span>
                            )
                          ) : null}
                          {ts.packageSlug ? (
                            <Link href={`/packages/${ts.packageSlug}`} target="_blank" className="underline">
                              {ts.packageSlug}
                            </Link>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className={classNames(
                              "btn btn-ghost btn-sm",
                              status === "approved" ? "bg-emerald-50 text-emerald-700" : ""
                            )}
                            onClick={() => updateTestimonialStatus(id, "approved")}
                            disabled={status === "approved"}
                          >
                            {t("testimonials.approve", "Approve")}
                          </button>
                          <button
                            className={classNames(
                              "btn btn-ghost btn-sm",
                              status === "rejected" ? "bg-rose-50 text-rose-700" : ""
                            )}
                            onClick={() => updateTestimonialStatus(id, "rejected")}
                            disabled={status === "rejected"}
                          >
                            {t("testimonials.reject", "Reject")}
                          </button>
                          <button
                            className={classNames(
                              "btn btn-ghost btn-sm",
                              status === "pending" ? "bg-amber-50 text-amber-700" : ""
                            )}
                            onClick={() => updateTestimonialStatus(id, "pending")}
                            disabled={status === "pending"}
                          >
                            {t("testimonials.markPending", "Mark pending")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ===================== TAB: EVENTS ===================== */}
        {tab === "events" && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold mb-3">{t("events.title", "Site events")}</h3>
              <button className="btn btn-ghost" onClick={fetchEvents} title={t("actions.refresh", "Refresh")}>
                {t("actions.refresh", "Refresh")}
              </button>
            </div>

            <div className="card mb-4">
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="label">{t("events.filterType", "Type")}</label>
                    <input
                      className="input w-full"
                      value={eType}
                      onChange={(e) => setEType(e.target.value)}
                      placeholder={t("events.filterTypePlaceholder", "e.g. booking_success")}
                    />
                  </div>
                  <div>
                    <label className="label">{t("events.filterSource", "Source")}</label>
                    <input
                      className="input w-full"
                      value={eSource}
                      onChange={(e) => setESource(e.target.value)}
                      placeholder={t("events.filterSourcePlaceholder", "e.g. booking_form")}
                    />
                  </div>
                  <div>
                    <label className="label">{t("events.filterFrom", "From")}</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={eFrom}
                      onChange={(e) => setEFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">{t("events.filterTo", "To")}</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={eTo}
                      onChange={(e) => setETo(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      className="btn btn-ghost w-full"
                      onClick={() => {
                        setEType("");
                        setESource("");
                        setEFrom("");
                        setETo("");
                      }}
                    >
                      {t("events.clearFilters", "Clear filters")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loadingEvents ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card">
                    <div className="card-body animate-pulse space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <p className="text-slate-600">{t("events.empty", "No events yet.")}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {events.map((ev, i) => (
                  <div key={ev.id || ev._id || i} className="card">
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{ev.type || t("events.event", "Event")}</div>
                        <div className="text-xs text-slate-500">{fmtDT(ev.createdAt ? new Date(ev.createdAt) : null, locale)}</div>
                      </div>
                      <div className="text-sm text-slate-700 mt-1">{ev.message || ev.description || "—"}</div>
                      {ev.meta && <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto max-h-40">{JSON.stringify(ev.meta, null, 2)}</pre>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </AdminGuard>
  );
}

/* ===================== UI helpers ===================== */
function KPI({ title, value, subtitle = "", accent = "default" }) {
  return (
    <div className="card">
      <div className="card-body">
        <p className="text-xs text-slate-500">{title}</p>
        <p className={classNames("text-xl font-semibold", accent === "danger" ? "text-rose-600" : "")}>{value}</p>
        {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}
      </div>
    </div>
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

function Stars({ rating = 5, className = "" }) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <span className={classNames("inline-flex items-center gap-0.5", className)} aria-label={`${r} / 5`}>
      {"★".repeat(r)}
      <span className="text-slate-300">{"★".repeat(5 - r)}</span>
    </span>
  );
}

function useDebouncedValue(value, delayMs = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}
