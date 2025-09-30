// frontend/app/admin/dashboard/DashboardInner.jsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import AdminGuard from "../AdminGuard";
import { API_BASE } from "@/app/lib/config";
import { mediaUrl } from "@/app/lib/media";

/* ===== Branding ===== */
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Vicuña Adventures";
const COMPANY_LOGO = process.env.NEXT_PUBLIC_COMPANY_LOGO || "";

/* ===== Helpers ===== */
const money = (v, currency = "PEN", locale = "es-PE") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const fmtDT = (d, locale = "es-PE") =>
  d
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d)
    : "—";

const parseList = (j) => (Array.isArray(j) ? j : j?.items || []);

const currencyHuman = (c) => {
  switch ((c || "").toUpperCase()) {
    case "PEN":
      return "soles (PEN)";
    case "USD":
      return "dólares (USD)";
    case "EUR":
      return "euros (EUR)";
    default:
      return (c || "").toUpperCase();
  }
};

const getBookingValue = (b) => {
  if (Number.isFinite(Number(b?.totalPrice))) return Number(b.totalPrice);
  const unit = Number(b?.unitPrice || 0);
  const people =
    Number(b?.people?.adults || 0) + Number(b?.people?.children || 0);
  return unit * Math.max(1, people || 1);
};

const BOOKING_STATUSES = ["Pendiente", "En proceso", "Finalizado", "Cancelado"];

export default function DashboardInner() {
  /* ===== State ===== */
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters
  const [bQ, setBQ] = useState("");
  const [bStatus, setBStatus] = useState("");
  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");

  // UI state
  const [deletingPkgId, setDeletingPkgId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchingRef = useRef(false);
  const autoRefreshRef = useRef(null);

  const getToken = () => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  };

  /* ===== Fetch data ===== */
  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setLoading(true);
    setErr("");
    const token = getToken();

    try {
      const [pRes, bRes, eRes] = await Promise.all([
        fetch(`${API_BASE}/api/packages?preview=1&limit=120`, { cache: "no-store" }),
        fetch(`${API_BASE}/api/bookings?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${API_BASE}/api/events?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).catch(() => null),
      ]);

      // Packages
      let pJson;
      try {
        pJson = await pRes.json();
      } catch {
        pJson = [];
      }
      const pkgs = parseList(pJson).map((p) => ({
        ...p,
        media: Array.isArray(p.media)
          ? p.media.map((m) => ({ ...m, url: mediaUrl(m?.url) }))
          : [],
      }));
      setPackages(pkgs);

      // Bookings
      let bJson = [];
      if (bRes.ok) {
        try {
          bJson = await bRes.json();
        } catch {
          bJson = [];
        }
      } else {
        setErr(
          (prev) =>
            prev ||
            (bRes.status === 401
              ? "Sesión expirada. Vuelve a iniciar sesión."
              : "No se pudo cargar reservas.")
        );
      }
      setBookings(parseList(bJson));

      // Events
      if (eRes && eRes.ok) {
        let eJson;
        try {
          eJson = await eRes.json();
        } catch {
          eJson = [];
        }
        setEvents(parseList(eJson));
      } else {
        setEvents([]);
      }

      setLastUpdated(new Date());
    } catch {
      setErr(
        "No se pudo cargar los datos. Verifica tu conexión o vuelve a intentar."
      );
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ===== Auto refresh ===== */
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(fetchData, 30000);
      return () => clearInterval(autoRefreshRef.current);
    }
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
  }, [autoRefresh, fetchData]);

  /* ===== Update booking status ===== */
  const updateStatus = useCallback(async (id, status) => {
    const token = getToken();
    let prevBooking = null;

    setBookings((prev) =>
      prev.map((b) => {
        if ((b._id || b.id) === id) prevBooking = b;
        return b;
      })
    );

    // optimistic update
    setBookings((prev) =>
      prev.map((b) => {
        if ((b._id || b.id) !== id) return b;
        const patch = { status };
        if (status === "Finalizado" && !Number.isFinite(Number(b.totalPrice))) {
          patch.totalPrice = getBookingValue(b);
        }
        return { ...b, ...patch };
      })
    );

    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          ...(status === "Finalizado"
            ? { totalPrice: getBookingValue(prevBooking || {}) }
            : {}),
        }),
      });
      if (!res.ok) throw new Error();
      setLastUpdated(new Date());
    } catch {
      setBookings((prev) =>
        prev.map((b) => ((b._id || b.id) === id ? prevBooking : b))
      );
      setErr("No se pudo actualizar el estado.");
    }
  }, []);

  /* ===== Delete package ===== */
  const deletePackage = useCallback(async (id, title) => {
    if (!id) return;
    if (
      !confirm(
        `¿Eliminar "${title || "este paquete"}"? Esta acción no se puede deshacer.`
      )
    )
      return;

    const token = getToken();
    try {
      setDeletingPkgId(id);
      const res = await fetch(`${API_BASE}/api/packages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo eliminar.");
      setPackages((prev) => prev.filter((p) => (p._id || p.id) !== id));
    } catch (e) {
      setErr(e.message || "Error al eliminar el paquete.");
    } finally {
      setDeletingPkgId(null);
    }
  }, []);

  /* ===== Filters ===== */
  const bookingsFiltered = useMemo(() => {
    const q = bQ.trim().toLowerCase();
    const from = bFrom ? new Date(bFrom) : null;
    const toInclusive = bTo ? new Date(`${bTo}T23:59:59.999`) : null;

    return bookings.filter((b) => {
      if (bStatus && (b.status || "Pendiente") !== bStatus) return false;

      const when = b.date ? new Date(b.date) : null;
      if (from && when && when < from) return false;
      if (toInclusive && when && when > toInclusive) return false;

      if (q) {
        const hay = [
          b.package?.title,
          b.customer?.name,
          b.customer?.email,
          b.customer?.phone,
          b.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, bQ, bStatus, bFrom, bTo]);

  /* ===== KPIs ===== */
  const kpis = useMemo(() => {
    const byStatus = bookings.reduce((acc, b) => {
      const s = b.status || "Pendiente";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const revenueByCurrency = bookings
      .filter((b) => (b.status || "") === "Finalizado")
      .reduce((acc, b) => {
        const cur = (b.currency || "PEN").toUpperCase();
        const val = getBookingValue(b);
        acc[cur] = (acc[cur] || 0) + val;
        return acc;
      }, {});

    return {
      totalPkgs: packages.length,
      activePkgs: packages.filter((p) => p.active !== false).length,
      promoPkgs: packages.filter((p) => p.isPromoActive).length,
      byStatus,
      revenueByCurrency,
    };
  }, [packages, bookings]);

  /* ===== CSV export ===== */
  const exportCSV = () => {
    const rows = [
      [
        "BookingID",
        "Fecha",
        "Status",
        "Paquete",
        "Cliente",
        "Email",
        "Teléfono",
        "Adultos",
        "Niños",
        "Total",
        "Moneda",
      ],
      ...bookingsFiltered.map((b) => [
        b._id || b.id || "",
        b.date ? new Date(b.date).toISOString() : "",
        b.status || "",
        b.package?.title || "",
        b.customer?.name || "",
        b.customer?.email || "",
        b.customer?.phone || "",
        b.people?.adults ?? "",
        b.people?.children ?? "",
        getBookingValue(b),
        (b.currency || "PEN").toUpperCase(),
      ]),
    ];

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const statusBadgeCls = (s) => {
    switch (s) {
      case "Finalizado":
        return "badge bg-emerald-600 text-white";
      case "En proceso":
        return "badge bg-sky-600 text-white";
      case "Cancelado":
        return "badge bg-rose-600 text-white";
      default:
        return "badge";
    }
  };

  /* ===== UI ===== */
  return (
    <AdminGuard>
      <section className="container-default py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            {COMPANY_LOGO ? (
              <img
                src={COMPANY_LOGO}
                alt={COMPANY_NAME}
                className="w-9 h-9 rounded-lg object-contain border bg-white"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
                {COMPANY_NAME.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{COMPANY_NAME} • Panel Admin</h2>
              {lastUpdated && (
                <p className="text-xs text-slate-500">
                  Actualizado: {fmtDT(lastUpdated)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-actualizar (30s)
            </label>
            <button className="btn" onClick={fetchData}>
              Actualizar
            </button>
            <Link href="/admin/packages" className="btn btn-ghost">
              Gestión de paquetes
            </Link>
          </div>
        </div>

        {err && <p className="text-red-600 mt-2">{err}</p>}
        {loading && <p className="text-slate-600 mt-2">Cargando…</p>}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
          <div className="card">
            <div className="card-body">
              <p className="text-xs text-slate-500">Paquetes totales</p>
              <p className="text-xl font-semibold">{kpis.totalPkgs}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="text-xs text-slate-500">Paquetes activos</p>
              <p className="text-xl font-semibold">{kpis.activePkgs}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="text-xs text-slate-500">Promos activas</p>
              <p className="text-xl font-semibold">{kpis.promoPkgs}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="text-xs text-slate-500">Reservas</p>
              <p className="text-xl font-semibold">{bookings.length}</p>
            </div>
          </div>
          {Object.entries(kpis.revenueByCurrency).map(([cur, amount]) => (
            <div key={cur} className="card">
              <div className="card-body">
                <p className="text-xs text-slate-500">
                  Ingresos · {currencyHuman(cur)}
                </p>
                <p className="text-xl font-semibold">{money(amount, cur)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* RESERVAS */}
        <section className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Reservas</h3>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-600">
                {BOOKING_STATUSES.map((s) => (
                  <span key={s} className="px-2 py-1 rounded bg-slate-100">
                    {s}: {kpis.byStatus[s] || 0}
                  </span>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={exportCSV}>
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="card">
            <div className="card-body grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                className="input md:col-span-2"
                placeholder="Buscar…"
                value={bQ}
                onChange={(e) => setBQ(e.target.value)}
              />
              <select
                className="input"
                value={bStatus}
                onChange={(e) => setBStatus(e.target.value)}
              >
                <option value="">Todos los estados</option>
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="input"
                value={bFrom}
                onChange={(e) => setBFrom(e.target.value)}
              />
              <input
                type="date"
                className="input"
                value={bTo}
                onChange={(e) => setBTo(e.target.value)}
              />
            </div>
          </div>

          {(!loading && bookingsFiltered.length === 0) ? (
            <p className="text-slate-600">No hay reservas con esos filtros.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {bookingsFiltered.map((b) => {
                const id = b._id || b.id;
                const pkgTitle = b.package?.title ?? "—";
                const when = b.date ? new Date(b.date) : null;
                const status = b.status || "Pendiente";
                const cust = b.customer || {};
                const adults = b.people?.adults ?? 1;
                const children = b.people?.children ?? null;

                return (
                  <div key={id} className="card">
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold line-clamp-1">{pkgTitle}</div>
                        <span className={statusBadgeCls(status)}>{status}</span>
                      </div>

                      <div className="text-sm text-slate-600">{fmtDT(when)}</div>
                      <div className="text-sm">
                        {cust.name || "Cliente"} • {cust.email || "—"}
                        {cust.phone ? ` • ${cust.phone}` : ""}
                      </div>
                      <div className="text-sm">
                        Personas: A {adults}
                        {children !== null ? ` / N ${children}` : ""}
                      </div>
                      <div className="text-sm">
                        Total:{" "}
                        {money(
                          getBookingValue(b),
                          (b.currency || "PEN").toUpperCase()
                        )}{" "}
                        <span className="text-xs text-slate-500">
                          ({currencyHuman((b.currency || "PEN").toUpperCase())})
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {BOOKING_STATUSES.map((s) => {
                          const disabled = s === status;
                          return (
                            <button
                              key={s}
                              className={`px-3 py-1 rounded border text-sm ${
                                disabled
                                  ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                                  : "bg-white hover:bg-slate-50"
                              }`}
                              onClick={() => !disabled && updateStatus(id, s)}
                              disabled={disabled}
                              title={`Marcar como ${s}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>

                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-slate-600">
                          Más detalles
                        </summary>
                        <div className="mt-2 space-y-1 text-slate-700">
                          <div>Idioma: {cust.language || "—"}</div>
                          <div>País: {cust.country || "—"}</div>
                          <div>Notas: {b.notes || "—"}</div>
                          {b.sourceUrl && (
                            <div className="break-all text-xs text-slate-500">
                              Origen:{" "}
                              <a
                                href={b.sourceUrl}
                                target="_blank"
                                className="underline"
                                rel="noopener noreferrer"
                              >
                                {b.sourceUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PAQUETES */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold">Paquetes</h3>
            <div className="text-xs text-slate-500">
              Crea/edita también desde{" "}
              <Link href="/admin/packages" className="underline">
                Paquetes
              </Link>
            </div>
          </div>
          {(!loading && packages.length === 0) ? (
            <p className="text-slate-600">No hay paquetes publicados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {packages.map((p) => {
                const id = p._id || p.id;
                const img =
                  mediaUrl(p.media?.[0]?.url) || "https://picsum.photos/600/360";
                const promo = !!p.isPromoActive;
                const showEffective =
                  promo && Number.isFinite(Number(p.effectivePrice));
                const priceCurrent = showEffective ? p.effectivePrice : p.price;

                return (
                  <div key={id} className="card overflow-hidden">
                    <div className="relative">
                      <img
                        src={img}
                        alt={p.title || "Paquete"}
                        className="w-full h-44 object-cover"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span
                          className={`badge ${
                            p.active !== false
                              ? "bg-green-600 text-white"
                              : "bg-slate-300 text-slate-800"
                          }`}
                        >
                          {p.active !== false ? "Activo" : "Inactivo"}
                        </span>
                        {promo && (
                          <span className="badge bg-amber-500 text-white">
                            Promo
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="font-semibold line-clamp-1">
                        {p.title}
                      </div>
                      <div className="text-sm text-slate-600">{p.city}</div>
                      <div className="text-sm text-slate-700">
                        {showEffective ? (
                          <>
                            <span className="line-through mr-2 text-slate-500">
                              {money(p.price, p.currency)}
                            </span>
                            <span className="font-semibold">
                              {money(priceCurrent, p.currency)}
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold">
                            {money(priceCurrent, p.currency)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">Slug: {p.slug}</div>
                      <div className="pt-2 flex flex-wrap gap-2">
                        <Link
                          href={`/admin/packages/${id}/edit`}
                          className="btn btn-ghost btn-sm"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/packages/${p.slug}`}
                          className="btn btn-ghost btn-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver público
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-red-700"
                          onClick={() => deletePackage(id, p.title)}
                          disabled={deletingPkgId === id}
                        >
                          {deletingPkgId === id ? "Eliminando…" : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* EVENTOS */}
        <section className="mt-10">
          <h3 className="text-xl font-semibold mb-3">Eventos del sitio</h3>
          {events.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <p className="text-slate-600">
                  No hay eventos. Implementa <code>/api/events</code> para
                  registrar actividad.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {events.map((ev, i) => (
                <div key={ev.id || ev._id || i} className="card">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{ev.type || "Evento"}</div>
                      <div className="text-xs text-slate-500">
                        {fmtDT(ev.createdAt ? new Date(ev.createdAt) : null)}
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 mt-1">
                      {ev.message || ev.description || "—"}
                    </div>
                    {ev.meta && (
                      <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(ev.meta, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </AdminGuard>
  );
}
