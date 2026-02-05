// backend/src/routes/bookings.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Package = require("../models/Package");
const auth = require("../middleware/auth");
const { logAdminAction } = require("../utils/adminLog");
const { sendBookingEmails } = require("../utils/mailer");

const router = express.Router();

// Public lookup by reservationId (limited info)
router.get("/lookup", async (req, res) => {
  try {
    const reservationId = String(req.query.reservationId || "").trim();
    if (!reservationId) return res.status(400).json({ message: "reservationId requerido" });

    const booking = await Booking.findOne({ reservationId })
      .select("status packageMeta slug")
      .populate("package", "slug")
      .lean();

    if (!booking) return res.status(404).json({ message: "Reserva no encontrada" });

    const pkgSlug = booking?.packageMeta?.slug || booking?.package?.slug || "";
    return res.json({ ok: true, reservationId, status: booking.status, packageSlug: pkgSlug });
  } catch (e) {
    console.error("GET /api/bookings/lookup error:", e);
    return res.status(500).json({ message: "Error al buscar reserva" });
  }
});

/* ===================== Helpers ===================== */
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
function safeText(v, max = 120) {
  return String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function normalizeEmail(v) {
  return safeText(v, 180).toLowerCase();
}

/* ---------------- Demand + holiday helpers ---------------- */
const FF_SCALE = Object.freeze({
  normal: 1.0,
  bajo: 1.1,
  medio: 1.2,
  alto: 1.35,
  muy_alto: 1.5,
});

const HOLIDAYS_2026_PE = Object.freeze({
  "2026-04-02": { name: "Semana Santa (Jueves)", impact: "muy_alto" },
  "2026-04-03": { name: "Semana Santa (Viernes)", impact: "muy_alto" },
  "2026-05-01": { name: "Día del Trabajo", impact: "medio" },
  "2026-06-07": { name: "Batalla de Arica y Día de la Bandera", impact: "bajo" },
  "2026-06-29": { name: "San Pedro y San Pablo", impact: "medio" },
  "2026-07-23": { name: "Día de la Fuerza Aérea del Perú", impact: "bajo" },
  "2026-07-28": { name: "Fiestas Patrias", impact: "muy_alto" },
  "2026-07-29": { name: "Fiestas Patrias", impact: "muy_alto" },
  "2026-08-06": { name: "Batalla de Junín", impact: "medio" },
  "2026-08-30": { name: "Santa Rosa de Lima", impact: "medio" },
  "2026-10-08": { name: "Combate de Angamos", impact: "medio" },
  "2026-11-01": { name: "Día de Todos los Santos", impact: "medio" },
  "2026-12-08": { name: "Inmaculada Concepción", impact: "bajo" },
  "2026-12-09": { name: "Batalla de Ayacucho", impact: "bajo" },
  "2026-12-25": { name: "Navidad", impact: "bajo" },
});

function getFF(fechaISO, opts = {}) {
  const capMax = typeof opts.capMax === "number" ? opts.capMax : FF_SCALE.muy_alto;
  const info = HOLIDAYS_2026_PE[fechaISO];
  if (!info) {
    return { FF: FF_SCALE.normal, isHoliday: false, impact: "normal", name: null };
  }
  const impact = info.impact;
  const rawFF = FF_SCALE[impact] ?? FF_SCALE.normal;
  const FF = Math.min(rawFF, capMax);
  return { FF, isHoliday: true, impact, name: info.name };
}

function getFactorFeriado(fechaISO) {
  return getFF(fechaISO);
}

function calcularPrecioFinal({
  precioBase,
  reservas,
  capacidad,
  diasAntes,
  fechaTour,
  personas,
  ignoreGroupDiscount = false,
}) {
  const safeCap = Math.max(1, Number(capacidad || 1));
  const ID = Math.max(0, Number(reservas || 0)) / safeCap;

  const FT = diasAntes > 30 ? 0.8 : diasAntes >= 15 ? 1.0 : diasAntes >= 7 ? 1.2 : 1.5;
  const feriado = getFactorFeriado(fechaTour);
  const FF = feriado.FF;
  const DA = ID * FT * FF;

  let MD =
    DA < 0.6 ? 1.0 :
    DA < 0.8 ? 1.05 :
    DA < 1.0 ? 1.10 :
    DA < 1.2 ? 1.20 : 1.35;
  if (feriado.isHoliday) MD = Math.max(MD, FF);

  let DG =
    personas <= 2 ? 0 :
    personas <= 4 ? 0.08 :
    personas <= 6 ? 0.17 :
    personas <= 10 ? 0.25 : 0.30;

  if (ignoreGroupDiscount) DG = 0;

  if (DA > 1.0 && DG > 0.15) DG = 0.15;

  return {
    unitPrice: Math.round(Number(precioBase || 0) * MD * (1 - DG)),
    demandaAjustada: DA,
    factorFeriado: FF,
    factorTiempo: FT,
    factorDemanda: MD,
    descuentoGrupo: DG,
    isHoliday: feriado.isHoliday,
    holidayName: feriado.name,
  };
}

/** Date parser: accepts ISO, YYYY-MM-DD, DD/MM/YYYY */
function parseDateFlexible(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(+v) ? null : v;
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(+d) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;

  // native / ISO
  let d = new Date(s);
  if (!Number.isNaN(+d)) return d;

  // DD/MM/YYYY
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    d = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return Number.isNaN(+d) ? null : d;
  }

  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) {
    d = new Date(`${m2[1]}-${m2[2]}-${m2[3]}T00:00:00.000Z`);
    return Number.isNaN(+d) ? null : d;
  }

  return null;
}

/* ---------------- Promo helpers (backend truth) ---------------- */
function isPromoCurrentlyActive(pkg, now = new Date()) {
  // Admin form uses: isPromo, promoPercent, promoPrice, promoStartAt, promoEndAt
  if (!pkg?.isPromo) return false;

  const start = pkg.promoStartAt ? new Date(pkg.promoStartAt) : null;
  const end = pkg.promoEndAt ? new Date(pkg.promoEndAt) : null;

  if (start && !Number.isNaN(+start) && now < start) return false;
  if (end && !Number.isNaN(+end) && now > end) return false;
  return true;
}


function calcularPrecioExclusive(precioBase, personas) {
  let descuento = 0;
  const p = Math.max(1, Number(personas || 1));

  if (p === 1) descuento = 0;
  else if (p <= 3) descuento = 0.05;
  else if (p <= 5) descuento = 0.10;
  else if (p === 6) descuento = 0.15;
  else if (p <= 8) descuento = 0.20;
  else if (p <= 15) descuento = 0.25;
  else descuento = 0.30;

  const unit = Math.round(Math.max(0, Number(precioBase || 0)) * (1 - descuento));
  return { unitPrice: unit, descuento };
}

function computeEffectiveUnitPrice(pkg, tourType = "collective", now = new Date(), demandCtx = {}) {
  const basePrice = Math.max(0, Number(pkg?.price || 0));
  const exclusiveBase = Math.max(0, Number(pkg?.exclusivePrice || 0));
  const base = tourType === "exclusive" && exclusiveBase > 0 ? exclusiveBase : basePrice;
  const currency = String(pkg?.currency || "PEN").toUpperCase();

  const demand = calcularPrecioFinal({
    precioBase: base,
    reservas: demandCtx.reservas,
    capacidad: demandCtx.capacidad,
    diasAntes: demandCtx.diasAntes,
    fechaTour: demandCtx.fechaTour,
    personas: demandCtx.personas,
    ignoreGroupDiscount: tourType === "exclusive",
  });

  if (tourType === "exclusive") {
    const excl = calcularPrecioExclusive(demand.unitPrice, demandCtx.personas);
    return {
      unitPrice: +Math.max(0, Number(excl.unitPrice || 0)).toFixed(2),
      currency,
      isPromoActive: false,
      basePrice: +base.toFixed(2),
      demandMeta: { demandaAjustada: demand.demandaAjustada, factorFeriado: demand.factorFeriado },
      exclusiveDiscount: excl.descuento,
    };
  }

  if (!isPromoCurrentlyActive(pkg, now)) {
    return {
      unitPrice: +Math.max(0, Number(demand.unitPrice || 0)).toFixed(2),
      currency,
      isPromoActive: false,
      basePrice: +base.toFixed(2),
      demandMeta: { demandaAjustada: demand.demandaAjustada, factorFeriado: demand.factorFeriado },
    };
  }

  const fixed = Math.max(0, Number(pkg?.promoPrice || 0));
  const percent = clamp(Math.max(0, Number(pkg?.promoPercent || 0)), 0, 100);

  let effective = Math.max(0, Number(demand.unitPrice || 0));
  if (fixed > 0) effective = fixed;
  else if (percent > 0) effective = effective * (1 - percent / 100);

  return {
    unitPrice: +Math.max(0, effective).toFixed(2),
    currency,
    isPromoActive: true,
    basePrice: +base.toFixed(2),
    demandMeta: { demandaAjustada: demand.demandaAjustada, factorFeriado: demand.factorFeriado },
  };
}

/* ---------------- Admin constants ---------------- */
const VALID_STATUS = new Set(["Pendiente", "En proceso", "Finalizado", "Cancelado"]);
const VALID_SORT = new Set([
  "created_desc",
  "created_asc",
  "date_desc",
  "date_asc",
  "total_desc",
  "total_asc",
]);

function parsePage(v, def = 1) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function parseLimit(v, def = 20) {
  const n = parseInt(v, 10);
  const safe = Number.isFinite(n) && n > 0 ? n : def;
  return Math.min(200, Math.max(1, safe));
}

/* =========================================================
 * Create booking (public)
 * POST /api/bookings
 * ========================================================= */
router.post(
  "/",
  [
    body("date").notEmpty().withMessage("date requerido"),

    // allow packageId OR packageSlug
    body().custom((value) => {
      const hasId = Boolean(value?.packageId);
      const hasSlug = Boolean(value?.packageSlug);
      if (!hasId && !hasSlug) throw new Error("packageId o packageSlug requerido");
      return true;
    }),

    body("customer.name").notEmpty().withMessage("Nombre requerido"),
    body("customer.email").isEmail().withMessage("Email inválido"),

    body("people.adults").optional().isInt({ min: 1, max: 50 }),
    body("people.children").optional().isInt({ min: 0, max: 50 }),

    body("tourType").optional().isIn(["collective", "exclusive"]),
    body("isExclusive").optional().isBoolean(),

    body("notes").optional().isString(),
    body("sourceUrl").optional().isString(),
    body("customer.phone").optional().isString(),
    body("customer.country").optional().isString(),
    body("customer.language").optional().isString(),

    // Ignore if frontend sends unitPrice/currency (backend is source of truth)
    body("unitPrice").optional().customSanitizer(() => undefined),
    body("currency").optional().customSanitizer(() => undefined),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ code: "VALIDATION_ERROR", errors: errors.array() });
      }

      const {
        packageId,
        packageSlug,
        date,
        people = {},
        tourType,
        isExclusive,
        customer = {},
        notes = "",
        sourceUrl = "",
      } = req.body || {};

      // 1) Resolve package (ID preferred)
      let pkg = null;
      if (packageId && isObjectId(packageId)) {
        pkg = await Package.findById(packageId).lean();
      } else if (packageSlug) {
        pkg = await Package.findOne({ slug: safeText(packageSlug, 200) }).lean();
      }

      if (!pkg) {
        return res.status(404).json({ code: "PACKAGE_NOT_FOUND", message: "Paquete no encontrado" });
      }
      if (pkg.active === false) {
        return res.status(400).json({ code: "PACKAGE_INACTIVE", message: "Paquete no disponible" });
      }

      // 2) Parse date
      const d = parseDateFlexible(date);
      if (!d) {
        return res.status(400).json({ code: "BAD_DATE", message: "Fecha inválida" });
      }

      // Optional: prevent past dates (use UTC midnight compare)
      const today = new Date();
      const midnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const tourDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      if (tourDay < midnight) {
        return res.status(400).json({ code: "PAST_DATE", message: "La fecha no puede ser pasada" });
      }

      // 3) Normalize people
      let adults = clamp(toNum(people.adults, 1), 1, 15);
      let children = clamp(toNum(people.children, 0), 0, 15);
      let totalPeople = Math.max(1, adults + children);
      if (totalPeople > 15) {
        const overflow = totalPeople - 15;
        children = Math.max(0, children - overflow);
        totalPeople = Math.max(1, adults + children);
      }

      // 4) Tour type compatibility
      const finalTourType =
        typeof isExclusive === "boolean"
          ? isExclusive
            ? "exclusive"
          : "collective"
          : tourType === "exclusive"
          ? "exclusive"
          : "collective";

      // 5) Demand context (reservations + capacity + days before)
      const tourDayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const tourDayEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
      const diasAntes = Math.max(0, Math.ceil((tourDayStart - midnight) / 86400000));
      const fechaISO = tourDayStart.toISOString().slice(0, 10);

      const cap =
        Number(pkg?.dailyCapacity ?? pkg?.capacity ?? pkg?.maxPeople ?? 0);
      const capacidad = Number.isFinite(cap) && cap > 0 ? cap : 1;

      const agg = await Booking.aggregate([
        {
          $match: {
            package: pkg._id,
            date: { $gte: tourDayStart, $lt: tourDayEnd },
            status: { $ne: "Cancelado" },
          },
        },
        {
          $group: {
            _id: null,
            people: {
              $sum: {
                $add: [
                  { $ifNull: ["$people.adults", 0] },
                  { $ifNull: ["$people.children", 0] },
                ],
              },
            },
          },
        },
      ]);
      const reservas = agg?.[0]?.people || 0;
      const reservasIncluyendoActual = reservas + totalPeople;

      // 6) ✅ Pricing (backend truth): demand + holiday + group (+ promos for collective)
      const pricing = computeEffectiveUnitPrice(pkg, finalTourType, new Date(), {
        reservas: reservasIncluyendoActual,
        capacidad,
        diasAntes,
        fechaTour: fechaISO,
        personas: totalPeople,
      });
      const unitPrice = pricing.unitPrice;
      const currency = pricing.currency;

      // If you allow "price on request", remove this guard.
      if (!unitPrice || unitPrice <= 0) {
        return res.status(400).json({
          code: "PRICE_NOT_CONFIGURED",
          message: "El paquete no tiene precio configurado (0).",
        });
      }

      // 7) Create booking
      const booking = await Booking.create({
        package: pkg._id,
        packageMeta: {
          slug: pkg.slug || "",
          title: pkg.title || "",
          city: pkg.city || "",
        },
        status: "Pendiente",
        date: d,
        people: { adults, children },
        tourType: finalTourType,
        isExclusive: finalTourType === "exclusive",
        customer: {
          name: safeText(customer.name, 120),
          email: normalizeEmail(customer.email),
          phone: safeText(customer.phone, 40),
          country: safeText(customer.country, 80),
          language: safeText(customer.language || "es", 10),
        },
        notes: safeText(notes, 4000),
        unitPrice,
        currency,
        sourceUrl: safeText(sourceUrl, 500),
      });

      // 8) Send emails (do not fail booking if email fails)
      // IMPORTANT: we should NOT block the response.
      // Also: sendBookingEmails expects "booking" and "pkg" objects.
      let email = { user: "unknown", admin: "unknown" };
      sendBookingEmails({ booking, pkg })
        .then((results) => {
          email = {
            user: results?.[0]?.status || "unknown",
            admin: results?.[1]?.status || "unknown",
          };
        })
        .catch((e) => console.warn("[bookings] sendBookingEmails error:", e?.message || e));

      return res.status(201).json({
        ok: true,
        bookingId: booking._id,
        reservationId: booking.reservationId,
        status: booking.status,
        tourType: booking.tourType,
        isExclusive: booking.isExclusive,
        unitPrice: booking.unitPrice,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
        pricing: {
          basePrice: pricing.basePrice,
          isPromoActive: pricing.isPromoActive,
        },
        email,
      });
    } catch (e) {
      console.error("POST /api/bookings error:", e);
      return res
        .status(500)
        .json({ code: "BOOKING_CREATE_ERROR", message: "Error al crear reserva" });
    }
  }
);

/* ===================== Quote (public) ===================== */
router.post(
  "/quote",
  [
    body("packageId").isMongoId(),
    body("date").isString().notEmpty(),
    body("people.adults").optional().isInt({ min: 1, max: 50 }),
    body("people.children").optional().isInt({ min: 0, max: 50 }),
    body("tourType").optional().isIn(["collective", "exclusive"]),
    body("isExclusive").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendValidation400(res, errors.array());

      const { packageId, date, people = {}, tourType, isExclusive } = req.body || {};
      const pkg = await Package.findById(packageId).lean();
      if (!pkg || pkg.active === false) {
        return res.status(404).json({ message: "Paquete no encontrado" });
      }

      const d = parseDateFlexible(date);
      if (!d) return res.status(400).json({ message: "Fecha inválida" });

      let adults = clamp(toNum(people.adults, 1), 1, 15);
      let children = clamp(toNum(people.children, 0), 0, 15);
      let totalPeople = Math.max(1, adults + children);
      if (totalPeople > 15) {
        const overflow = totalPeople - 15;
        children = Math.max(0, children - overflow);
        totalPeople = Math.max(1, adults + children);
      }

      const finalTourType =
        typeof isExclusive === "boolean"
          ? isExclusive
            ? "exclusive"
            : "collective"
          : tourType === "exclusive"
          ? "exclusive"
          : "collective";

      const today = new Date();
      const midnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const tourDayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const tourDayEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
      const diasAntes = Math.max(0, Math.ceil((tourDayStart - midnight) / 86400000));
      const fechaISO = tourDayStart.toISOString().slice(0, 10);

      const cap = Number(pkg?.dailyCapacity ?? pkg?.capacity ?? pkg?.maxPeople ?? 0);
      const capacidad = Number.isFinite(cap) && cap > 0 ? cap : 1;

      const agg = await Booking.aggregate([
        {
          $match: {
            package: pkg._id,
            date: { $gte: tourDayStart, $lt: tourDayEnd },
            status: { $ne: "Cancelado" },
          },
        },
        {
          $group: {
            _id: null,
            people: {
              $sum: {
                $add: [
                  { $ifNull: ["$people.adults", 0] },
                  { $ifNull: ["$people.children", 0] },
                ],
              },
            },
          },
        },
      ]);
      const reservas = agg?.[0]?.people || 0;
      const reservasIncluyendoActual = reservas + totalPeople;

      const pricing = computeEffectiveUnitPrice(pkg, finalTourType, new Date(), {
        reservas: reservasIncluyendoActual,
        capacidad,
        diasAntes,
        fechaTour: fechaISO,
        personas: totalPeople,
      });

      const isExclusiveTour = finalTourType === "exclusive";
      const billedPeople = isExclusiveTour ? totalPeople : adults + children * 0.5;
      const totalPrice = +(pricing.unitPrice * Math.max(1, billedPeople)).toFixed(2);

      return res.json({
        unitPrice: pricing.unitPrice,
        currency: pricing.currency,
        totalPrice,
        demandMeta: pricing.demandMeta || null,
        breakdown: {
          basePrice: pricing.basePrice,
          factorFeriado: pricing.demandMeta?.factorFeriado ?? null,
          factorDemanda: pricing.demandMeta?.factorDemanda ?? null,
          factorTiempo: pricing.demandMeta?.factorTiempo ?? null,
          descuentoGrupo: pricing.demandMeta?.descuentoGrupo ?? null,
          isHoliday: pricing.demandMeta?.isHoliday ?? false,
          holidayName: pricing.demandMeta?.holidayName ?? null,
          reservas: reservas,
          capacidad,
          disponibles: Math.max(0, capacidad - reservas),
        },
        isPromoActive: pricing.isPromoActive || false,
      });
    } catch (err) {
      console.error("POST /api/bookings/quote error:", err);
      res.status(500).json({ message: "No se pudo calcular el precio" });
    }
  }
);

/* ===================== List bookings (admin) ===================== */
router.get("/", auth("admin"), async (req, res) => {
  try {
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 30);
    const skip = (page - 1) * limit;

    const includeCancelled = String(req.query.includeCancelled || "true").toLowerCase() !== "false";

    const q = safeText(req.query.q, 200).toLowerCase();
    const status = safeText(req.query.status, 40);
    const city = safeText(req.query.city, 80);

    const fromRaw = String(req.query.from || "").trim();
    const toRaw = String(req.query.to || "").trim();

    const filter = {};

    if (!includeCancelled) filter.status = { $ne: "Cancelado" };
    if (status && VALID_STATUS.has(status)) filter.status = status;

    if (fromRaw || toRaw) {
      filter.date = {};
      if (fromRaw) {
        const f = new Date(fromRaw);
        if (!Number.isNaN(+f)) filter.date.$gte = f;
      }
      if (toRaw) {
        let t = new Date(toRaw);
        if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) t = new Date(`${toRaw}T23:59:59.999Z`);
        if (!Number.isNaN(+t)) filter.date.$lte = t;
      }
      if (Object.keys(filter.date).length === 0) delete filter.date;
    }

    if (city) {
      // keep compatible with q logic below
      filter.$or = [{ "packageMeta.city": city }];
    }

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const qOr = [
        { "packageMeta.title": rx },
        { "packageMeta.slug": rx },
        { "customer.name": rx },
        { "customer.email": rx },
        { "customer.phone": rx },
        { notes: rx },
        { reservationId: rx },
      ];

      if (mongoose.Types.ObjectId.isValid(q)) qOr.push({ _id: q });

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: qOr }];
        delete filter.$or;
      } else {
        filter.$or = qOr;
      }
    }

    const sortKey = VALID_SORT.has(String(req.query.sort))
      ? String(req.query.sort)
      : "created_desc";
    const sortObj =
      sortKey === "created_asc"
        ? { createdAt: 1 }
        : sortKey === "date_desc"
        ? { date: -1, createdAt: -1 }
        : sortKey === "date_asc"
        ? { date: 1, createdAt: -1 }
        : sortKey === "total_desc"
        ? { totalPrice: -1, createdAt: -1 }
        : sortKey === "total_asc"
        ? { totalPrice: 1, createdAt: -1 }
        : { createdAt: -1 };

    const projection =
      "package packageMeta reservationId date people customer.name customer.email customer.phone customer.country customer.language notes unitPrice currency totalPrice tourType isExclusive status sourceUrl createdAt updatedAt";

    const [items, total] = await Promise.all([
      Booking.find(filter)
        .populate({ path: "package", select: "title slug city price currency isPromo promoPrice promoPercent promoStartAt promoEndAt" })
        .select(projection)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    const normalized = items.map((b) => {
      const pkg = b.package && typeof b.package === "object" ? b.package : null;
      const meta = b.packageMeta || {};
      return {
        ...b,
        packageMeta: {
          slug: meta.slug || pkg?.slug || "",
          title: meta.title || pkg?.title || "",
          city: meta.city || pkg?.city || "",
        },
      };
    });

    res.json({ page, limit, total, pages: Math.ceil(total / limit), items: normalized });
  } catch (e) {
    console.error("GET /api/bookings error:", e);
    res.status(500).json({ message: "Error al listar reservas" });
  }
});

/* ===================== Update status (admin) ===================== */
router.patch("/:id/status", auth("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "ID inválido" });

    const { status } = req.body || {};
    if (!VALID_STATUS.has(status)) return res.status(400).json({ message: "Estado inválido" });

    const updated = await Booking.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "No encontrado" });
    await logAdminAction(req, {
      action: "booking_status_update",
      entity: "booking",
      entityId: id,
      meta: { status },
    });
    res.json(updated);
  } catch (e) {
    console.error("PATCH /api/bookings/:id/status error:", e);
    res.status(500).json({ message: "Error al actualizar estado" });
  }
});

/* ===================== Bulk status (admin) ===================== */
/**
 * IMPORTANT: this route MUST be defined before "/:id/status" to avoid conflicts
 * but since it's "/bulk/status" it’s safe. Still, we keep it above export in case.
 */
router.patch("/bulk/status", auth("admin"), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const status = req.body?.status;

    if (!VALID_STATUS.has(status)) return res.status(400).json({ message: "Estado inválido" });
    if (ids.length === 0) return res.status(400).json({ message: "ids requerido" });

    const safeIds = ids.filter((x) => isObjectId(x));
    if (safeIds.length === 0) return res.status(400).json({ message: "ids inválidos" });

    const result = await Booking.updateMany({ _id: { $in: safeIds } }, { $set: { status } });

    await logAdminAction(req, {
      action: "booking_status_bulk",
      entity: "booking",
      meta: { status, count: safeIds.length },
    });
    res.json({
      ok: true,
      matched: result.matchedCount ?? result.n,
      modified: result.modifiedCount ?? result.nModified,
    });
  } catch (e) {
    console.error("PATCH /api/bookings/bulk/status error:", e);
    res.status(500).json({ message: "Error en actualización masiva" });
  }
});

/* ===================== Export CSV (admin) ===================== */
router.get("/export.csv", auth("admin"), async (req, res) => {
  try {
    const includeCancelled = String(req.query.includeCancelled || "true").toLowerCase() !== "false";
    const q = safeText(req.query.q, 200).toLowerCase();
    const status = safeText(req.query.status, 40);
    const city = safeText(req.query.city, 80);

    const fromRaw = String(req.query.from || "").trim();
    const toRaw = String(req.query.to || "").trim();

    const filter = {};
    if (!includeCancelled) filter.status = { $ne: "Cancelado" };
    if (status && VALID_STATUS.has(status)) filter.status = status;

    if (fromRaw || toRaw) {
      filter.date = {};
      if (fromRaw) {
        const f = new Date(fromRaw);
        if (!Number.isNaN(+f)) filter.date.$gte = f;
      }
      if (toRaw) {
        let t = new Date(toRaw);
        if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) t = new Date(`${toRaw}T23:59:59.999Z`);
        if (!Number.isNaN(+t)) filter.date.$lte = t;
      }
      if (Object.keys(filter.date).length === 0) delete filter.date;
    }

    if (city) filter["packageMeta.city"] = city;

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { reservationId: rx },
        { "packageMeta.title": rx },
        { "customer.name": rx },
        { "customer.email": rx },
        { "customer.phone": rx },
        { notes: rx },
      ];
      if (mongoose.Types.ObjectId.isValid(q)) filter.$or.push({ _id: q });
    }

    const rows = await Booking.find(filter)
      .select(
        "reservationId packageMeta date status tourType isExclusive customer.name customer.email customer.phone people unitPrice currency totalPrice notes sourceUrl createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    const header = [
      "ReservationId",
      "BookingID",
      "Fecha",
      "Estado",
      "TourType",
      "Exclusivo",
      "Ciudad",
      "Paquete",
      "Cliente",
      "Email",
      "Telefono",
      "Adultos",
      "Ninos",
      "UnitPrice",
      "Total",
      "Moneda",
      "Notes",
      "SourceUrl",
      "CreatedAt",
    ];

    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [
      header.join(","),
      ...rows.map((b) =>
        [
          b.reservationId || "",
          b._id,
          b.date ? new Date(b.date).toISOString() : "",
          b.status || "",
          b.tourType || "",
          b.isExclusive ? "true" : "false",
          b.packageMeta?.city || "",
          b.packageMeta?.title || "",
          b.customer?.name || "",
          b.customer?.email || "",
          b.customer?.phone || "",
          b.people?.adults ?? "",
          b.people?.children ?? "",
          b.unitPrice ?? 0,
          b.totalPrice ?? 0,
          b.currency || "PEN",
          (b.notes || "").replace(/\s+/g, " ").trim(),
          b.sourceUrl || "",
          b.createdAt ? new Date(b.createdAt).toISOString() : "",
        ]
          .map(esc)
          .join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reservas_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (e) {
    console.error("GET /api/bookings/export.csv error:", e);
    res.status(500).json({ message: "Error al exportar" });
  }
});

module.exports = router;
/* ===================== End of bookings.js ===================== */
