// backend/src/routes/packages.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const slugify = require('slugify');
const Package = require('../models/Package');
const auth = require('../middleware/auth');

const router = express.Router();

/* ===================== Helpers ===================== */

function getBaseUrl(req) {
  const envBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (envBase) return envBase;
  return `${req.protocol}://${req.get('host')}`;
}

function toAbsolute(base, u) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${base}${path}`;
}

function normalizeMediaAbsolute(base, media = []) {
  if (!Array.isArray(media)) return [];
  return media.map((m) => ({ ...m, url: toAbsolute(base, m.url) }));
}

// Whitelist fields (mirror schema)
const ALLOWED_FIELDS = new Set([
  'title', 'description',
  'price', 'currency',
  'city', 'country', 'category',
  'durationHours',
  'languages',
  'highlights', 'includes', 'excludes',
  'media',
  'active',
  // Geo
  'location',
  // Promotions
  'isPromo', 'promoPercent', 'promoPrice', 'promoStartAt', 'promoEndAt',
]);

const pickAllowed = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => ALLOWED_FIELDS.has(k)));

const VALID_CITIES = new Set(['Puno', 'Cusco', 'Lima', 'Arequipa', 'Otros']);
const VALID_CURRENCIES = new Set(['PEN', 'USD', 'EUR']);

function parsePage(v, def = 1) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function parseLimit(v, def = 20) {
  const n = parseInt(v, 10);
  const safe = Number.isFinite(n) && n > 0 ? n : def;
  return Math.min(100, Math.max(1, safe));
}
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Normalize arrays/lists coming from client
function normStringArray(v) {
  if (Array.isArray(v)) {
    return [...new Set(v.map((s) => String(s || '').trim()).filter(Boolean))];
  }
  if (typeof v === 'string') {
    return [...new Set(v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
  }
  return [];
}
function normLanguages(v) {
  if (Array.isArray(v)) {
    return [...new Set(v.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean))];
  }
  if (typeof v === 'string') {
    return [...new Set(v.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))];
  }
  return [];
}
function normLocation(loc) {
  if (!loc || typeof loc !== 'object') return undefined;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
  return { lat, lng };
}

// Normalize media payload (server-side sanity + DEDUPE)
function normalizeMediaInPayload(media) {
  if (!Array.isArray(media)) return [];
  const out = [];
  const seen = new Set();
  for (const m of media) {
    if (!m || typeof m !== 'object') continue;
    const type = m.type === 'video' ? 'video' : 'image';
    const url = String(m.url || '').trim();
    if (!url) continue;
    const key = `${type}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      url,
      type,
      ...(m.caption ? { caption: String(m.caption).slice(0, 500) } : {}),
    });
  }
  return out;
}

// Promo helpers
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
  if (fixed > 0) return +(fixed.toFixed(2));
  if (percent > 0) {
    const val = base * (1 - percent / 100);
    return +((Math.max(0, val)).toFixed(2));
  }
  return null;
}

// Serialize doc for responses (absolute media + computed fields)
function serializePackage(doc, base) {
  const d = { ...doc };
  d.media = normalizeMediaAbsolute(base, d.media);
  const now = new Date();

  d.isPromoActive = isPromoCurrentlyActive(d, now);
  d.effectivePrice = computeEffectivePrice(d, now);

  // convenience: percent for UI badges
  if (d.isPromoActive && Number(d.price) > 0 && d.effectivePrice != null) {
    d.discountPercent = Math.max(
      0,
      Math.min(100, Math.round((1 - (Number(d.effectivePrice) / Number(d.price))) * 100))
    );
  } else {
    d.discountPercent = 0;
  }

  // mirror dates to friendlier names (keeps older frontends working)
  d.promoStart = d.promoStartAt || null;
  d.promoEnd = d.promoEndAt || null;

  return d;
}

/* ===================== LIST (public, with optional preview) ===================== */
/**
 * GET /api/packages
 * Query:
 *  - q, city, category
 *  - minPrice, maxPrice (Number)  -> base price filter (not effective)
 *  - maxDur (Number)
 *  - sort = recent | price_asc | price_desc
 *  - preview=1 to ignore active filter (+ optional active=true/false)
 *  - promo=active|true|1 (only currently active promos) | any (has promo data)
 *  - page, limit
 */
router.get('/', async (req, res) => {
  try {
    const {
      q, city, category, preview, active,
      minPrice, maxPrice, maxDur, sort, promo,
    } = req.query;

    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20);
    const skip = (page - 1) * limit;

    const filter = {};

    // active handling
    if (preview) {
      if (typeof active === 'string') {
        if (active === 'true') filter.active = true;
        else if (active === 'false') filter.active = false;
      }
    } else {
      filter.active = true;
    }

    // promo prefilter
    if (typeof promo === 'string') {
      const val = String(promo).toLowerCase();
      if (val === 'any') {
        filter.isPromo = true;
      } else if (val === 'active' || val === 'true' || val === '1') {
        filter.isPromo = true; // date window checked after serialization
      }
    }

    // basic filters
    if (city) filter.city = city;
    if (category) filter.category = category;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
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
    if (Number.isFinite(mDur)) {
      filter.durationHours = { $lte: mDur };
    }

    // sort
    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc')  sortObj = { price: 1, createdAt: -1 };
    if (sort === 'price_desc') sortObj = { price: -1, createdAt: -1 };
    if (sort === 'recent')     sortObj = { createdAt: -1 };

    const projection = [
      'title', 'slug',
      'price', 'currency',
      'city', 'country', 'category',
      'durationHours', 'languages',
      'highlights', 'includes', 'excludes',
      'media',
      'active',
      'location',
      'isPromo', 'promoPercent', 'promoPrice', 'promoStartAt', 'promoEndAt',
      'createdAt',
    ].join(' ');

    const [items, total] = await Promise.all([
      Package.find(filter).select(projection).sort(sortObj).skip(skip).limit(limit).lean(),
      Package.countDocuments(filter),
    ]);

    const base = getBaseUrl(req);
    let data = items.map((doc) => serializePackage(doc, base));

    // finalize promo=active at runtime (date window)
    if (typeof promo === 'string') {
      const val = String(promo).toLowerCase();
      if (val === 'active' || val === 'true' || val === '1') {
        data = data.filter((d) => d.isPromoActive === true);
      }
    }

    res.json({ page, limit, total, pages: Math.ceil(total / limit), items: data });
  } catch (err) {
    console.error('GET /api/packages error:', err);
    res.status(500).json({ message: 'Error al listar paquetes' });
  }
});

/* ===================== Get by id (admin/general) ===================== */
router.get('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    const doc = await Package.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'Paquete no encontrado' });

    const base = getBaseUrl(req);
    res.json(serializePackage(doc, base));
  } catch (err) {
    console.error('GET /api/packages/id/:id error:', err);
    res.status(500).json({ message: 'Error al obtener paquete' });
  }
});

/* ===================== Detail by slug (public; preview optional) ===================== */
router.get('/:slug', async (req, res) => {
  try {
    const { preview } = req.query;
    const slug = String(req.params.slug || '').trim();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(404).json({ message: 'Paquete no encontrado' });
    }

    const filter = { slug };
    if (!preview) filter.active = true;

    const doc = await Package.findOne(filter).lean();
    if (!doc) return res.status(404).json({ message: 'Paquete no encontrado' });

    const base = getBaseUrl(req);
    res.json(serializePackage(doc, base));
  } catch (err) {
    console.error('GET /api/packages/:slug error:', err);
    res.status(500).json({ message: 'Error al obtener paquete' });
  }
});

/* ===================== Create (admin) ===================== */
router.post(
  '/',
  auth('admin'),
  [
    body('title').isString().trim().notEmpty(),
    body('description').isString().trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('currency').optional({ checkFalsy: true }).isString().isLength({ min: 1, max: 5 }),
    body('durationHours').optional({ checkFalsy: true }).isInt({ min: 1, max: 240 }),
    body('city').optional({ checkFalsy: true }).isString().trim(),
    body('country').optional({ checkFalsy: true }).isString().trim(),
    body('category').optional({ checkFalsy: true }).isString().trim(),
    body('languages').optional({ checkFalsy: true }),
    body('highlights').optional({ checkFalsy: true }),
    body('includes').optional({ checkFalsy: true }),
    body('excludes').optional({ checkFalsy: true }),
    body('media').optional({ checkFalsy: true }),
    body('active').optional({ checkFalsy: true }).isBoolean(),
    // location
    body('location.lat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body('location.lng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
    // promotions
    body('isPromo').optional({ checkFalsy: true }).isBoolean(),
    body('promoPercent').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
    body('promoPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('promoStartAt').optional({ checkFalsy: true }).isISO8601(),
    body('promoEndAt').optional({ checkFalsy: true }).isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const payload = pickAllowed(req.body);

      // normalize fields
      if (payload.city && !VALID_CITIES.has(payload.city)) payload.city = 'Puno';
      if (payload.currency && !VALID_CURRENCIES.has(payload.currency)) payload.currency = 'PEN';
      if (payload.currency) payload.currency = payload.currency.toUpperCase();

      if (payload.languages)  payload.languages  = normLanguages(payload.languages);
      if (payload.highlights) payload.highlights = normStringArray(payload.highlights);
      if (payload.includes)   payload.includes   = normStringArray(payload.includes);
      if (payload.excludes)   payload.excludes   = normStringArray(payload.excludes);
      if (payload.location)   payload.location   = normLocation(payload.location);
      if (payload.media)      payload.media      = normalizeMediaInPayload(payload.media);

      // promo dates
      if (payload.promoStartAt) payload.promoStartAt = new Date(payload.promoStartAt);
      if (payload.promoEndAt)   payload.promoEndAt   = new Date(payload.promoEndAt);
      if (payload.promoStartAt && payload.promoEndAt && payload.promoStartAt > payload.promoEndAt) {
        const tmp = payload.promoStartAt; payload.promoStartAt = payload.promoEndAt; payload.promoEndAt = tmp;
      }

      const slug = await uniqueSlug(payload.title);
      const pkg = await Package.create({ ...payload, slug });

      const base = getBaseUrl(req);
      res.status(201).json(serializePackage(pkg.toObject(), base));
    } catch (err) {
      console.error('POST /api/packages error:', err);
      res.status(500).json({ message: 'No se pudo crear el paquete' });
    }
  }
);

/* ===================== Update (admin) ===================== */
router.put(
  '/:id',
  auth('admin'),
  [
    body('title').optional({ checkFalsy: true }).isString().trim().notEmpty(),
    body('description').optional({ checkFalsy: true }).isString().trim().notEmpty(),
    body('price').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('currency').optional({ checkFalsy: true }).isString().isLength({ min: 1, max: 5 }),
    body('durationHours').optional({ checkFalsy: true }).isInt({ min: 1, max: 240 }),
    body('city').optional({ checkFalsy: true }).isString().trim(),
    body('country').optional({ checkFalsy: true }).isString().trim(),
    body('category').optional({ checkFalsy: true }).isString().trim(),
    body('languages').optional({ checkFalsy: true }),
    body('highlights').optional({ checkFalsy: true }),
    body('includes').optional({ checkFalsy: true }),
    body('excludes').optional({ checkFalsy: true }),
    body('media').optional({ checkFalsy: true }),
    body('active').optional({ checkFalsy: true }).isBoolean(),
    body('location.lat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body('location.lng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
    body('isPromo').optional({ checkFalsy: true }).isBoolean(),
    body('promoPercent').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
    body('promoPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('promoStartAt').optional({ checkFalsy: true }).isISO8601(),
    body('promoEndAt').optional({ checkFalsy: true }).isISO8601(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const body = pickAllowed(req.body);

      if (typeof body.title === 'string' && body.title.trim()) {
        body.slug = await uniqueSlug(body.title, id);
      }
      if (body.city && !VALID_CITIES.has(body.city)) body.city = 'Puno';
      if (body.currency && !VALID_CURRENCIES.has(body.currency)) body.currency = 'PEN';
      if (body.currency) body.currency = body.currency.toUpperCase();

      if (body.languages)  body.languages  = normLanguages(body.languages);
      if (body.highlights) body.highlights = normStringArray(body.highlights);
      if (body.includes)   body.includes   = normStringArray(body.includes);
      if (body.excludes)   body.excludes   = normStringArray(body.excludes);
      if (body.location)   body.location   = normLocation(body.location);
      if (body.media)      body.media      = normalizeMediaInPayload(body.media);

      if (body.promoStartAt) body.promoStartAt = new Date(body.promoStartAt);
      if (body.promoEndAt)   body.promoEndAt   = new Date(body.promoEndAt);
      if (body.promoStartAt && body.promoEndAt && body.promoStartAt > body.promoEndAt) {
        const tmp = body.promoStartAt; body.promoStartAt = body.promoEndAt; body.promoEndAt = tmp;
      }

      const updated = await Package.findByIdAndUpdate(
        id,
        { $set: body },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) return res.status(404).json({ message: 'No encontrado' });

      const base = getBaseUrl(req);
      res.json(serializePackage(updated, base));
    } catch (err) {
      console.error('PUT /api/packages/:id error:', err);
      res.status(500).json({ message: 'No se pudo actualizar el paquete' });
    }
  }
);

/* ===================== Delete (admin) ===================== */
router.delete('/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    const deleted = await Package.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'No encontrado' });
    res.json({ ok: true, id });
  } catch (err) {
    console.error('DELETE /api/packages/:id error:', err);
    res.status(500).json({ message: 'Error al eliminar el paquete' });
  }
});

/* ===================== Slug generator ===================== */
async function uniqueSlug(baseTitle, existingId = null) {
  const base = slugify(baseTitle || '', { lower: true, strict: true }) || 'paquete';
  let candidate = base;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await Package.findOne({ slug: candidate, _id: { $ne: existingId } })
      .select('_id')
      .lean();
    if (!clash) return candidate;
    candidate = `${base}-${i++}`;
  }
}

module.exports = router;
