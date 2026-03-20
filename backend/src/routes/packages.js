// backend/src/routes/packages.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const slugify = require("slugify");
const Package = require("../models/Package");
const auth = require("../middleware/auth");
const { logAdminAction } = require("../utils/adminLog");

const router = express.Router();

/* ===================== Helpers ===================== */

function getBaseUrl(req) {
  const envBase = String(process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (envBase) return envBase;

  // trust proxy may be enabled; respect x-forwarded-proto when present
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http")
    .toString()
    .split(",")[0]
    .trim();
  return `${proto}://${req.get("host")}`;
}

function toAbsolute(base, u) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${base}${p}`;
}

function normalizeMediaVariantAbsolute(base, variant) {
  if (!variant || typeof variant !== 'object') return variant;
  return {
    ...variant,
    ...(variant.url ? { url: toAbsolute(base, variant.url) } : {}),
  };
}

function normalizeMediaAbsolute(base, media = []) {
  if (!Array.isArray(media)) return [];
  return media.map((m) => ({
    ...m,
    url: toAbsolute(base, m.url),
    ...(m.variants && typeof m.variants === 'object'
      ? {
          variants: Object.fromEntries(
            Object.entries(m.variants).map(([name, value]) => [name, normalizeMediaVariantAbsolute(base, value)])
          ),
        }
      : {}),
  }));
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parsePage(v, def = 1) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function parseLimit(v, def = 20) {
  const n = parseInt(v, 10);
  const safe = Number.isFinite(n) && n > 0 ? n : def;
  return Math.min(100, Math.max(1, safe));
}

const VALID_CITIES = new Set(["Puno", "Cusco", "Lima", "Arequipa", "Otros"]);
const VALID_CURRENCIES = new Set(["PEN", "USD", "EUR"]);
const VALID_DIFFICULTY = new Set(["Fácil", "Moderado", "Difícil"]);

function nonEmpty(s) {
  return typeof s === "string" && s.trim().length > 0;
}

/* ✅ NEW: normalize text (collapse spaces + trim) */
function normalizeText(v, { max = 4000 } = {}) {
  if (v === null || v === undefined) return v;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) : s;
}

/* ✅ NEW: consistent 400 response for express-validator */
function sendValidation400(res, errors) {
  return res.status(400).json({
    message: "Validación fallida",
    errors: (errors || []).map((e) => ({
      field: e.path || e.param || "unknown",
      msg: e.msg || "invalid",
      value: e.value,
    })),
  });
}

/* ✅ NEW: convert mongoose ValidationError to 400 (no more 500 on minlength) */
function handleMongooseValidation(err, res) {
  if (err?.name === "ValidationError" && err?.errors) {
    const errors = Object.entries(err.errors).map(([field, e]) => ({
      field,
      msg: e?.message || "invalid",
      value: e?.value,
    }));
    res.status(400).json({ message: "Validación fallida", errors });
    return true;
  }
  return false;
}

function normStringArray(v) {
  if (Array.isArray(v)) {
    return [...new Set(v.map((s) => String(s || "").trim()).filter(Boolean))];
  }
  if (typeof v === "string") {
    return [...new Set(v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
  }
  return [];
}

function normCsvArray(v) {
  if (Array.isArray(v)) {
    return [...new Set(v.map((s) => String(s || "").trim()).filter(Boolean))];
  }
  if (typeof v === "string") {
    return [...new Set(v.split(",").map((s) => s.trim()).filter(Boolean))];
  }
  return [];
}

function normLanguages(v) {
  if (Array.isArray(v)) {
    return [...new Set(v.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean))];
  }
  if (typeof v === "string") {
    return [...new Set(v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))];
  }
  return [];
}

function clamp(n, min, max) {
  const value = Number(n);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normLocation(loc) {
  if (!loc || typeof loc !== "object") return undefined;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
  return { lat, lng };
}

function isValidHttpUrl(v) {
  if (!nonEmpty(v)) return true;
  try {
    const u = new URL(String(v));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidBrochureUrl(v) {
  if (!nonEmpty(v)) return true;
  const s = String(v);
  if (s.startsWith("/uploads/")) return true;
  return isValidHttpUrl(s);
}

// Normalize media payload (server-side sanity + DEDUPE)
function normalizeMediaVariantPayload(v) {
  if (!v || typeof v !== 'object') return undefined;
  const url = String(v.url || '').trim();
  const relativePath = String(v.relativePath || '').trim();
  if (!url && !relativePath) return undefined;
  const width = Number.isFinite(Number(v.width)) ? Number(v.width) : undefined;
  const height = Number.isFinite(Number(v.height)) ? Number(v.height) : undefined;
  const format = nonEmpty(v.format) ? String(v.format).trim().slice(0, 20) : undefined;
  return {
    ...(url ? { url } : {}),
    ...(relativePath ? { relativePath } : {}),
    ...(Number.isFinite(width) ? { width } : {}),
    ...(Number.isFinite(height) ? { height } : {}),
    ...(format ? { format } : {}),
  };
}

function normalizeMediaInPayload(media) {
  if (!Array.isArray(media)) return [];
  const out = [];
  const seen = new Set();

  for (const m of media) {
    if (!m || typeof m !== "object") continue;
    const type = m.type === "video" ? "video" : "image";
    const url = String(m.url || "").trim();
    if (!url) continue;

    const key = `${type}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const relativePath = String(m.relativePath || '').trim();
    const width = Number.isFinite(Number(m.width)) ? Number(m.width) : undefined;
    const height = Number.isFinite(Number(m.height)) ? Number(m.height) : undefined;
    const variants = type === 'image' && m.variants && typeof m.variants === 'object'
      ? Object.fromEntries(
          Object.entries(m.variants)
            .map(([name, value]) => [name, normalizeMediaVariantPayload(value)])
            .filter(([, value]) => value)
        )
      : undefined;

    out.push({
      url,
      type,
      ...(relativePath ? { relativePath } : {}),
      ...(Number.isFinite(width) ? { width } : {}),
      ...(Number.isFinite(height) ? { height } : {}),
      ...(variants && Object.keys(variants).length ? { variants } : {}),
      ...(m.caption ? { caption: String(m.caption).slice(0, 500) } : {}),
    });
  }
  return out;
}

// Normalize itinerary payload
const MAX_ITINERARY_STEPS = 80;
function normalizeItineraryInPayload(input) {
  const arr = Array.isArray(input) ? input : input ? [input] : [];
  const out = [];

  for (const s of arr) {
    if (!s || typeof s !== "object") continue;

    const time = String(s.time || "").trim().slice(0, 20);
    const title = String(s.title || "").trim().slice(0, 140);
    const details = String(s.details || "").trim().slice(0, 1200);
    const location = String(s.location || "").trim().slice(0, 180);
    const mapsUrl = String(s.mapsUrl || "").trim().slice(0, 2000);

    const durationMinRaw = s.durationMin;
    const durationMin =
      durationMinRaw === "" || durationMinRaw === null || durationMinRaw === undefined
        ? undefined
        : Math.max(0, Number(durationMinRaw || 0));

    const durationHoursRaw = s.durationHours;
    const durationHours =
      durationHoursRaw === "" || durationHoursRaw === null || durationHoursRaw === undefined
        ? undefined
        : clamp(Math.max(0, Number(durationHoursRaw || 0)), 0, 48);

    const durationMinutesRaw = s.durationMinutes;
    const durationMinutes =
      durationMinutesRaw === "" || durationMinutesRaw === null || durationMinutesRaw === undefined
        ? undefined
        : clamp(Math.max(0, Number(durationMinutesRaw || 0)), 0, 59);

    const dayRaw = s.day;
    const day =
      dayRaw === "" || dayRaw === null || dayRaw === undefined
        ? undefined
        : clamp(Math.max(1, Number(dayRaw || 0)), 1, 365);

    const transport = String(s.transport || "").trim();
    const guideNotes = String(s.guideNotes || "").trim();
    const guideLanguages = normLanguages(s.guideLanguages);

    if (!time && !title && !details && !location && !mapsUrl) continue;
    if (mapsUrl && !isValidHttpUrl(mapsUrl)) continue;

    const computedDurationMin =
      Number.isFinite(durationMin)
        ? durationMin
        : Number.isFinite(durationHours) || Number.isFinite(durationMinutes)
        ? Math.max(0, (Number(durationHours) || 0) * 60 + (Number(durationMinutes) || 0))
        : undefined;

    out.push({
      ...(time ? { time } : {}),
      ...(title ? { title } : {}),
      ...(details ? { details } : {}),
      ...(location ? { location } : {}),
      ...(Number.isFinite(computedDurationMin) ? { durationMin: computedDurationMin } : {}),
      ...(Number.isFinite(day) ? { day } : {}),
      ...(Number.isFinite(durationHours) ? { durationHours } : {}),
      ...(Number.isFinite(durationMinutes) ? { durationMinutes } : {}),
      ...(transport ? { transport } : {}),
      ...(guideLanguages.length ? { guideLanguages } : {}),
      ...(guideNotes ? { guideNotes } : {}),
      ...(mapsUrl ? { mapsUrl } : {}),
    });

    if (out.length >= MAX_ITINERARY_STEPS) break;
  }
  return out;
}

/* ===================== Promo helpers ===================== */
function isPromoCurrentlyActive(doc, now = new Date()) {
  if (!doc?.isPromo) return false;
  const start = doc.promoStartAt ? new Date(doc.promoStartAt) : null;
  const end = doc.promoEndAt ? new Date(doc.promoEndAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function computeEffectivePrice(doc, now = new Date()) {
  if (!isPromoCurrentlyActive(doc, now)) return null;
  const base = Math.max(0, Number(doc.price || 0));
  const fixed = Math.max(0, Number(doc.promoPrice || 0));
  const percent = Math.max(0, Math.min(100, Number(doc.promoPercent || 0)));

  if (fixed > 0) return +fixed.toFixed(2);
  if (percent > 0) {
    const val = base * (1 - percent / 100);
    return +Math.max(0, val).toFixed(2);
  }
  return null;
}

// Serialize doc for responses (absolute media + computed fields)
function serializePackage(doc, base) {
  const d = { ...doc };
  d.media = normalizeMediaAbsolute(base, d.media);
  if (d.brochurePdf?.url) {
    d.brochurePdf = {
      ...d.brochurePdf,
      url: toAbsolute(base, d.brochurePdf.url),
    };
  }

  const now = new Date();
  d.isPromoActive = isPromoCurrentlyActive(d, now);
  d.effectivePrice = computeEffectivePrice(d, now);

  if (d.isPromoActive && Number(d.price) > 0 && d.effectivePrice != null) {
    d.discountPercent = Math.max(
      0,
      Math.min(100, Math.round((1 - Number(d.effectivePrice) / Number(d.price)) * 100))
    );
  } else {
    d.discountPercent = 0;
  }

  d.promoStart = d.promoStartAt || null;
  d.promoEnd = d.promoEndAt || null;

  return d;
}

/* ===================== Whitelist fields (mirror schema) ===================== */
const ALLOWED_FIELDS = new Set([
  "title",
  "description",
  "price",
  "exclusivePrice",
  "currency",
  "city",
  "country",
  "category",
  "durationHours",
  "dailyCapacity",
  "languages",

  "highlights",
  "includes",
  "excludes",
  "whatToBring",
  "recommendations",

  "media",
  "brochurePdf",
  "active",

  "location",
  "mapsUrl",
  "meetingPoint",
  "dropoffPoint",

  "startTimes",
  "availableDays",

  "difficulty",
  "ageMin",
  "minPeople",
  "maxPeople",

  "itinerary",

  "isPromo",
  "promoPercent",
  "promoPrice",
  "promoStartAt",
  "promoEndAt",
]);

const pickAllowed = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => ALLOWED_FIELDS.has(k)));

/* ===================== LIST (public, with optional preview) ===================== */
/**
 * GET /api/packages
 * Query:
 *  - q, city, category, difficulty
 *  - minPrice, maxPrice (Number)
 *  - maxDur (Number)
 *  - promo=active|true|1 | any
 *  - preview=1 to ignore active filter (+ optional active=true/false)
 *  - sort = recent | price_asc | price_desc
 *  - page, limit
 */
router.get("/", async (req, res) => {
  try {
    const { q, city, category, difficulty, preview, active, minPrice, maxPrice, maxDur, sort, promo } = req.query;

    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20);
    const skip = (page - 1) * limit;

    const filter = {};

    // active handling
    if (preview) {
      if (typeof active === "string") {
        if (active === "true") filter.active = true;
        else if (active === "false") filter.active = false;
      }
    } else {
      filter.active = true;
    }

    // promo prefilter
    if (typeof promo === "string") {
      const val = String(promo).toLowerCase();
      if (val === "any") filter.isPromo = true;
      else if (val === "active" || val === "true" || val === "1") filter.isPromo = true;
    }

    // basic filters
    if (city) filter.city = city;
    if (category) filter.category = category;
    if (difficulty && VALID_DIFFICULTY.has(difficulty)) filter.difficulty = difficulty;

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    // numeric filters
    const minP = Number(minPrice);
    const maxP = Number(maxPrice);
    const mDur = Number(maxDur);

    if (Number.isFinite(minP) || Number.isFinite(maxP)) {
      filter.price = {};
      if (Number.isFinite(minP)) filter.price.$gte = minP;
      if (Number.isFinite(maxP)) filter.price.$lte = maxP;
    }
    if (Number.isFinite(mDur)) filter.durationHours = { $lte: mDur };

    // sort
    let sortObj = { createdAt: -1 };
    if (sort === "price_asc") sortObj = { price: 1, createdAt: -1 };
    if (sort === "price_desc") sortObj = { price: -1, createdAt: -1 };
    if (sort === "recent") sortObj = { createdAt: -1 };

    const projection = [
      "title",
      "slug",
      "price",
      "exclusivePrice",
      "currency",
      "city",
      "country",
      "category",
      "description",
      "durationHours",
      "dailyCapacity",
      "languages",
      "highlights",
      "includes",
      "excludes",
      "whatToBring",
      "recommendations",
      "media",
      "active",
      "location",
      "mapsUrl",
      "meetingPoint",
      "dropoffPoint",
      "startTimes",
      "availableDays",
      "difficulty",
      "ageMin",
      "minPeople",
      "maxPeople",
      "itinerary",
      "isPromo",
      "promoPercent",
      "promoPrice",
      "promoStartAt",
      "promoEndAt",
      "createdAt",
      "updatedAt",
    ].join(" ");

    const [items, total] = await Promise.all([
      Package.find(filter).select(projection).sort(sortObj).skip(skip).limit(limit).lean(),
      Package.countDocuments(filter),
    ]);

    const base = getBaseUrl(req);
    let data = items.map((doc) => serializePackage(doc, base));

    // finalize promo=active at runtime (date window)
    if (typeof promo === "string") {
      const val = String(promo).toLowerCase();
      if (val === "active" || val === "true" || val === "1") {
        data = data.filter((d) => d.isPromoActive === true);
      }
    }

    res.json({ page, limit, total, pages: Math.ceil(total / limit), items: data });
  } catch (err) {
    console.error("GET /api/packages error:", err);
    res.status(500).json({ message: "Error al listar paquetes" });
  }
});

/* ===================== Get by id (admin/general) ===================== */
router.get("/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "ID inválido" });

    const doc = await Package.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Paquete no encontrado" });

    const base = getBaseUrl(req);
    res.json(serializePackage(doc, base));
  } catch (err) {
    console.error("GET /api/packages/id/:id error:", err);
    res.status(500).json({ message: "Error al obtener paquete" });
  }
});

/* ===================== Detail by slug (public; preview optional) ===================== */
router.get("/:slug", async (req, res) => {
  try {
    const { preview } = req.query;
    const slug = String(req.params.slug || "").trim();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(404).json({ message: "Paquete no encontrado" });
    }

    const filter = { slug };
    if (!preview) filter.active = true;

    const doc = await Package.findOne(filter).lean();
    if (!doc) return res.status(404).json({ message: "Paquete no encontrado" });

    const base = getBaseUrl(req);
    res.json(serializePackage(doc, base));
  } catch (err) {
    console.error("GET /api/packages/:slug error:", err);
    res.status(500).json({ message: "Error al obtener paquete" });
  }
});

/* ===================== Create (admin) ===================== */
router.post(
  "/",
  auth("admin"),
  [
    body("title")
      .isString()
      .trim()
      .isLength({ min: 3, max: 140 })
      .withMessage("title: mínimo 3 caracteres"),
    body("description")
      .isString()
      .trim()
      .isLength({ min: 10, max: 4000 })
      .withMessage("description: mínimo 10 caracteres"),
    body("price").isFloat({ min: 0 }),
    body("exclusivePrice").optional({ checkFalsy: true }).isFloat({ min: 0 }),

    body("currency").optional({ checkFalsy: true }).isString().isLength({ min: 1, max: 5 }),
    body("durationHours").optional({ checkFalsy: true }).isInt({ min: 1, max: 240 }),
    body("dailyCapacity").optional({ checkFalsy: true }).isInt({ min: 0, max: 2000 }),

    body("city").optional({ checkFalsy: true }).isString().trim(),
    body("country").optional({ checkFalsy: true }).isString().trim(),
    body("category").optional({ checkFalsy: true }).isString().trim(),

    // lists
    body("languages").optional({ checkFalsy: true }),
    body("highlights").optional({ checkFalsy: true }),
    body("includes").optional({ checkFalsy: true }),
    body("excludes").optional({ checkFalsy: true }),
    body("whatToBring").optional({ checkFalsy: true }),
    body("recommendations").optional({ checkFalsy: true }),

    // media / flags
    body("media").optional({ checkFalsy: true }),
    body("brochurePdf.url")
      .optional({ checkFalsy: true })
      .custom((v) => isValidBrochureUrl(v))
      .withMessage("brochurePdf.url invalid"),
    body("brochurePdf.relativePath").optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
    body("brochurePdf.filename").optional({ checkFalsy: true }).isString().trim().isLength({ max: 255 }),
    body("brochurePdf.size").optional({ checkFalsy: true }).isInt({ min: 0 }),
    body("active").optional({ checkFalsy: true }).isBoolean(),

    // geo
    body("location.lat").optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body("location.lng").optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),

    // maps
    body("mapsUrl")
      .optional({ checkFalsy: true })
      .isURL({ protocols: ["http", "https"], require_protocol: true }),
    body("meetingPoint").optional({ checkFalsy: true }).isString().trim().isLength({ max: 220 }),
    body("dropoffPoint").optional({ checkFalsy: true }).isString().trim().isLength({ max: 220 }),

    // schedule / constraints
    body("startTimes").optional({ checkFalsy: true }),
    body("availableDays").optional({ checkFalsy: true }),
    body("difficulty").optional({ checkFalsy: true }).isIn(Array.from(VALID_DIFFICULTY)),
    body("ageMin").optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }),
    body("minPeople").optional({ checkFalsy: true }).isInt({ min: 1, max: 500 }),
    body("maxPeople").optional({ checkFalsy: true }).isInt({ min: 1, max: 500 }),

    // itinerary
    body("itinerary")
      .optional({ checkFalsy: true })
      .custom((v) => {
        if (!Array.isArray(v)) return true;
        if (v.length > MAX_ITINERARY_STEPS) throw new Error(`itinerary max ${MAX_ITINERARY_STEPS} items`);
        for (const step of v) {
          if (!step || typeof step !== "object") continue;
          if (step.mapsUrl && !isValidHttpUrl(step.mapsUrl)) throw new Error("itinerary.mapsUrl invalid");
        }
        return true;
      }),

    // promotions
    body("isPromo").optional({ checkFalsy: true }).isBoolean(),
    body("promoPercent").optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
    body("promoPrice").optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body("promoStartAt").optional({ checkFalsy: true }).isISO8601(),
    body("promoEndAt").optional({ checkFalsy: true }).isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendValidation400(res, errors.array());

      const payload = pickAllowed(req.body);

      // ✅ normalize core text fields (prevents weird whitespace)
      if (payload.title !== undefined) payload.title = normalizeText(payload.title, { max: 140 });
      if (payload.description !== undefined) payload.description = normalizeText(payload.description, { max: 4000 });

      // normalize fields
      if (payload.city && !VALID_CITIES.has(payload.city)) payload.city = "Puno";
      if (payload.currency && !VALID_CURRENCIES.has(String(payload.currency).toUpperCase())) payload.currency = "PEN";
      if (payload.currency) payload.currency = String(payload.currency).toUpperCase();

      if (payload.languages) payload.languages = normLanguages(payload.languages);

      if (payload.highlights) payload.highlights = normStringArray(payload.highlights);
      if (payload.includes) payload.includes = normStringArray(payload.includes);
      if (payload.excludes) payload.excludes = normStringArray(payload.excludes);
      if (payload.whatToBring) payload.whatToBring = normStringArray(payload.whatToBring);
      if (payload.recommendations) payload.recommendations = normStringArray(payload.recommendations);

      if (payload.location) payload.location = normLocation(payload.location);

      if (payload.media) payload.media = normalizeMediaInPayload(payload.media);
      if (payload.brochurePdf) {
        const bp = payload.brochurePdf || {};
        const clean = {};
        if (bp.url && isValidBrochureUrl(bp.url)) clean.url = String(bp.url).trim();
        if (bp.relativePath && String(bp.relativePath).startsWith("/uploads/")) {
          clean.relativePath = String(bp.relativePath).trim();
        }
        if (bp.filename) clean.filename = String(bp.filename).trim().slice(0, 255);
        if (bp.size !== undefined && Number.isFinite(Number(bp.size))) clean.size = Number(bp.size);
        if (Object.keys(clean).length) payload.brochurePdf = clean;
        else delete payload.brochurePdf;
      }

      if (payload.mapsUrl && !isValidHttpUrl(payload.mapsUrl)) delete payload.mapsUrl;

      if (payload.startTimes) payload.startTimes = normCsvArray(payload.startTimes).map((x) => x.replace(/\s+/g, ""));
      if (payload.availableDays) payload.availableDays = normCsvArray(payload.availableDays).map((x) => x.trim());

      if (payload.difficulty && !VALID_DIFFICULTY.has(payload.difficulty)) payload.difficulty = "Fácil";

      if (payload.minPeople && payload.maxPeople && Number(payload.minPeople) > Number(payload.maxPeople)) {
        const tmp = payload.minPeople;
        payload.minPeople = payload.maxPeople;
        payload.maxPeople = tmp;
      }

      if (payload.itinerary) payload.itinerary = normalizeItineraryInPayload(payload.itinerary);

      // promo dates
      if (payload.promoStartAt) payload.promoStartAt = new Date(payload.promoStartAt);
      if (payload.promoEndAt) payload.promoEndAt = new Date(payload.promoEndAt);
      if (payload.promoStartAt && payload.promoEndAt && payload.promoStartAt > payload.promoEndAt) {
        const tmp = payload.promoStartAt;
        payload.promoStartAt = payload.promoEndAt;
        payload.promoEndAt = tmp;
      }

      const slug = await uniqueSlug(payload.title);
      const pkg = await Package.create({ ...payload, slug });

      const base = getBaseUrl(req);
      await logAdminAction(req, {
        action: "package_create",
        entity: "package",
        entityId: pkg._id?.toString(),
        meta: { title: pkg.title, slug: pkg.slug },
      });
      res.status(201).json(serializePackage(pkg.toObject(), base));
    } catch (err) {
      if (handleMongooseValidation(err, res)) return;
      console.error("POST /api/packages error:", err);
      res.status(500).json({ message: "No se pudo crear el paquete" });
    }
  }
);

/* ===================== Update (admin) ===================== */
router.put(
  "/:id",
  auth("admin"),
  [
    body("title")
      .optional({ checkFalsy: true })
      .isString()
      .trim()
      .isLength({ min: 3, max: 140 })
      .withMessage("title: mínimo 3 caracteres"),
    body("description")
      .optional({ checkFalsy: true })
      .isString()
      .trim()
      .isLength({ min: 10, max: 4000 })
      .withMessage("description: mínimo 10 caracteres"),
    body("price").optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body("exclusivePrice").optional({ checkFalsy: true }).isFloat({ min: 0 }),

    body("currency").optional({ checkFalsy: true }).isString().isLength({ min: 1, max: 5 }),
    body("durationHours").optional({ checkFalsy: true }).isInt({ min: 1, max: 240 }),
    body("dailyCapacity").optional({ checkFalsy: true }).isInt({ min: 0, max: 2000 }),

    body("city").optional({ checkFalsy: true }).isString().trim(),
    body("country").optional({ checkFalsy: true }).isString().trim(),
    body("category").optional({ checkFalsy: true }).isString().trim(),

    // lists
    body("languages").optional({ checkFalsy: true }),
    body("highlights").optional({ checkFalsy: true }),
    body("includes").optional({ checkFalsy: true }),
    body("excludes").optional({ checkFalsy: true }),
    body("whatToBring").optional({ checkFalsy: true }),
    body("recommendations").optional({ checkFalsy: true }),

    // media / flags
    body("media").optional({ checkFalsy: true }),
    body("brochurePdf.url")
      .optional({ checkFalsy: true })
      .custom((v) => isValidBrochureUrl(v))
      .withMessage("brochurePdf.url invalid"),
    body("brochurePdf.relativePath").optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
    body("brochurePdf.filename").optional({ checkFalsy: true }).isString().trim().isLength({ max: 255 }),
    body("brochurePdf.size").optional({ checkFalsy: true }).isInt({ min: 0 }),
    body("active").optional({ checkFalsy: true }).isBoolean(),

    // geo
    body("location.lat").optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body("location.lng").optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),

    // maps
    body("mapsUrl")
      .optional({ checkFalsy: true })
      .isURL({ protocols: ["http", "https"], require_protocol: true }),
    body("meetingPoint").optional({ checkFalsy: true }).isString().trim().isLength({ max: 220 }),
    body("dropoffPoint").optional({ checkFalsy: true }).isString().trim().isLength({ max: 220 }),

    // schedule / constraints
    body("startTimes").optional({ checkFalsy: true }),
    body("availableDays").optional({ checkFalsy: true }),
    body("difficulty").optional({ checkFalsy: true }).isIn(Array.from(VALID_DIFFICULTY)),
    body("ageMin").optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }),
    body("minPeople").optional({ checkFalsy: true }).isInt({ min: 1, max: 500 }),
    body("maxPeople").optional({ checkFalsy: true }).isInt({ min: 1, max: 500 }),

    // itinerary
    body("itinerary")
      .optional({ checkFalsy: true })
      .custom((v) => {
        if (!Array.isArray(v)) return true;
        if (v.length > MAX_ITINERARY_STEPS) throw new Error(`itinerary max ${MAX_ITINERARY_STEPS} items`);
        for (const step of v) {
          if (!step || typeof step !== "object") continue;
          if (step.mapsUrl && !isValidHttpUrl(step.mapsUrl)) throw new Error("itinerary.mapsUrl invalid");
        }
        return true;
      }),

    // promotions
    body("isPromo").optional({ checkFalsy: true }).isBoolean(),
    body("promoPercent").optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
    body("promoPrice").optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body("promoStartAt").optional({ checkFalsy: true }).isISO8601(),
    body("promoEndAt").optional({ checkFalsy: true }).isISO8601(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ message: "ID inválido" });

      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendValidation400(res, errors.array());

      const bodyObj = pickAllowed(req.body);

      // ✅ normalize core text fields
      if (bodyObj.title !== undefined) bodyObj.title = normalizeText(bodyObj.title, { max: 140 });
      if (bodyObj.description !== undefined) bodyObj.description = normalizeText(bodyObj.description, { max: 4000 });

      // slug update if title changes
      if (typeof bodyObj.title === "string" && bodyObj.title.trim()) {
        bodyObj.slug = await uniqueSlug(bodyObj.title, id);
      }

      if (bodyObj.city && !VALID_CITIES.has(bodyObj.city)) bodyObj.city = "Puno";
      if (bodyObj.currency && !VALID_CURRENCIES.has(String(bodyObj.currency).toUpperCase())) bodyObj.currency = "PEN";
      if (bodyObj.currency) bodyObj.currency = String(bodyObj.currency).toUpperCase();

      if (bodyObj.languages) bodyObj.languages = normLanguages(bodyObj.languages);

      if (bodyObj.highlights) bodyObj.highlights = normStringArray(bodyObj.highlights);
      if (bodyObj.includes) bodyObj.includes = normStringArray(bodyObj.includes);
      if (bodyObj.excludes) bodyObj.excludes = normStringArray(bodyObj.excludes);
      if (bodyObj.whatToBring) bodyObj.whatToBring = normStringArray(bodyObj.whatToBring);
      if (bodyObj.recommendations) bodyObj.recommendations = normStringArray(bodyObj.recommendations);

      if (bodyObj.location) bodyObj.location = normLocation(bodyObj.location);

      if (bodyObj.media) bodyObj.media = normalizeMediaInPayload(bodyObj.media);
      if (bodyObj.brochurePdf) {
        const bp = bodyObj.brochurePdf || {};
        const clean = {};
        if (bp.url && isValidBrochureUrl(bp.url)) clean.url = String(bp.url).trim();
        if (bp.relativePath && String(bp.relativePath).startsWith("/uploads/")) {
          clean.relativePath = String(bp.relativePath).trim();
        }
        if (bp.filename) clean.filename = String(bp.filename).trim().slice(0, 255);
        if (bp.size !== undefined && Number.isFinite(Number(bp.size))) clean.size = Number(bp.size);
        if (Object.keys(clean).length) bodyObj.brochurePdf = clean;
        else delete bodyObj.brochurePdf;
      }

      if (bodyObj.mapsUrl && !isValidHttpUrl(bodyObj.mapsUrl)) delete bodyObj.mapsUrl;

      if (bodyObj.startTimes) bodyObj.startTimes = normCsvArray(bodyObj.startTimes).map((x) => x.replace(/\s+/g, ""));
      if (bodyObj.availableDays) bodyObj.availableDays = normCsvArray(bodyObj.availableDays).map((x) => x.trim());

      if (bodyObj.difficulty && !VALID_DIFFICULTY.has(bodyObj.difficulty)) bodyObj.difficulty = "Fácil";

      if (bodyObj.minPeople && bodyObj.maxPeople && Number(bodyObj.minPeople) > Number(bodyObj.maxPeople)) {
        const tmp = bodyObj.minPeople;
        bodyObj.minPeople = bodyObj.maxPeople;
        bodyObj.maxPeople = tmp;
      }

      if (bodyObj.itinerary) bodyObj.itinerary = normalizeItineraryInPayload(bodyObj.itinerary);

      if (bodyObj.promoStartAt) bodyObj.promoStartAt = new Date(bodyObj.promoStartAt);
      if (bodyObj.promoEndAt) bodyObj.promoEndAt = new Date(bodyObj.promoEndAt);
      if (bodyObj.promoStartAt && bodyObj.promoEndAt && bodyObj.promoStartAt > bodyObj.promoEndAt) {
        const tmp = bodyObj.promoStartAt;
        bodyObj.promoStartAt = bodyObj.promoEndAt;
        bodyObj.promoEndAt = tmp;
      }

      const updated = await Package.findByIdAndUpdate(id, { $set: bodyObj }, { new: true, runValidators: true }).lean();

      if (!updated) return res.status(404).json({ message: "No encontrado" });

      const base = getBaseUrl(req);
      await logAdminAction(req, {
        action: "package_update",
        entity: "package",
        entityId: id,
        meta: { title: updated.title, slug: updated.slug },
      });
      res.json(serializePackage(updated, base));
    } catch (err) {
      if (handleMongooseValidation(err, res)) return;
      console.error("PUT /api/packages/:id error:", err);
      res.status(500).json({ message: "No se pudo actualizar el paquete" });
    }
  }
);

/* ===================== Delete (admin) ===================== */
router.delete("/:id", auth("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "ID inválido" });

    const deleted = await Package.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "No encontrado" });

    await logAdminAction(req, {
      action: "package_delete",
      entity: "package",
      entityId: id,
      meta: { title: deleted.title, slug: deleted.slug },
    });
    res.json({ ok: true, id });
  } catch (err) {
    console.error("DELETE /api/packages/:id error:", err);
    res.status(500).json({ message: "Error al eliminar el paquete" });
  }
});

/* ===================== Slug generator ===================== */
async function uniqueSlug(baseTitle, existingId = null) {
  const base = slugify(baseTitle || "", { lower: true, strict: true }) || "paquete";
  let candidate = base;
  let i = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await Package.findOne({ slug: candidate, _id: { $ne: existingId } }).select("_id").lean();
    if (!clash) return candidate;
    candidate = `${base}-${i++}`;
  }
}

/* ===================== Toggle active (admin) ===================== */
// PATCH /api/packages/:id/toggle
router.patch("/:id/toggle", auth("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "ID inválido" });

    const doc = await Package.findById(id);
    if (!doc) return res.status(404).json({ message: "No encontrado" });

    doc.active = !doc.active;
    await doc.save();

    const base = getBaseUrl(req);
    await logAdminAction(req, {
      action: "package_toggle_active",
      entity: "package",
      entityId: id,
      meta: { active: doc.active, title: doc.title, slug: doc.slug },
    });
    res.json(serializePackage(doc.toObject(), base));
  } catch (err) {
    if (handleMongooseValidation(err, res)) return;
    console.error("PATCH /api/packages/:id/toggle error:", err);
    res.status(500).json({ message: "No se pudo cambiar estado" });
  }
});

module.exports = router;
