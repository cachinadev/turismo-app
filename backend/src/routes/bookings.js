// backend/src/routes/bookings.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Package = require("../models/Package");
const auth = require("../middleware/auth");
const { sendBookingEmails } = require("../utils/mailer");

const router = express.Router();

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

function computeEffectiveUnitPrice(pkg, now = new Date()) {
  const base = Math.max(0, Number(pkg?.price || 0));
  const currency = String(pkg?.currency || "PEN").toUpperCase();

  // If you ever add exclusivePrice in Package model, enable this:
  // const exclusiveBase = Math.max(0, Number(pkg?.exclusivePrice || 0));
  // if (exclusiveBase > 0 && ...) base = exclusiveBase;

  if (!isPromoCurrentlyActive(pkg, now)) {
    return {
      unitPrice: +base.toFixed(2),
      currency,
      isPromoActive: false,
      basePrice: +base.toFixed(2),
    };
  }

  const fixed = Math.max(0, Number(pkg?.promoPrice || 0));
  const percent = clamp(Math.max(0, Number(pkg?.promoPercent || 0)), 0, 100);

  let effective = null;
  if (fixed > 0) effective = fixed;
  else if (percent > 0) effective = base * (1 - percent / 100);
  if (effective == null) effective = base;

  return {
    unitPrice: +Math.max(0, effective).toFixed(2),
    currency,
    isPromoActive: true,
    basePrice: +base.toFixed(2),
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
      const adults = clamp(toNum(people.adults, 1), 1, 50);
      const children = clamp(toNum(people.children, 0), 0, 50);

      // 4) Tour type compatibility
      const finalTourType =
        typeof isExclusive === "boolean"
          ? isExclusive
            ? "exclusive"
            : "collective"
          : tourType === "exclusive"
          ? "exclusive"
          : "collective";

      // 5) ✅ Pricing (backend truth): promo-aware
      const pricing = computeEffectiveUnitPrice(pkg, new Date());
      const unitPrice = pricing.unitPrice;
      const currency = pricing.currency;

      // If you allow "price on request", remove this guard.
      if (!unitPrice || unitPrice <= 0) {
        return res.status(400).json({
          code: "PRICE_NOT_CONFIGURED",
          message: "El paquete no tiene precio configurado (0).",
        });
      }

      // 6) Create booking
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

      // 7) Send emails (do not fail booking if email fails)
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
