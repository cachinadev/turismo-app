// backend/src/models/Package.js

const { Schema, model } = require('mongoose');

/* ===================== Helpers ===================== */
const str = (min = 0, max = 2000) => ({ type: String, trim: true, minlength: min, maxlength: max });
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

function cleanStringArray(v) {
  if (!Array.isArray(v)) return [];
  const set = new Set();
  for (const x of v) {
    if (!nonEmpty(x)) continue;
    set.add(String(x).trim());
  }
  return Array.from(set);
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined);

/* ---- media normalizer + de-dupe (order-preserving) ---- */
const MAX_MEDIA = 60;
function normalizeMediaArray(input) {
  const arr = Array.isArray(input) ? input : (input ? [input] : []);
  const out = [];
  const seen = new Set();

  for (const m of arr) {
    if (!m || typeof m !== 'object') continue;
    const type = m.type === 'video' ? 'video' : 'image';
    const url = String(m.url || '').trim();
    if (!url) continue;
    const key = `${type}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type,
      url,
      ...(m.caption ? { caption: String(m.caption).slice(0, 500) } : {}),
    });
    if (out.length >= MAX_MEDIA) break;
  }
  return out;
}

/* ===================== Subschemas ===================== */
const mediaSchema = new Schema(
  {
    type: { type: String, enum: ['image', 'video'], required: true },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\//i.test(v) || v.startsWith('/'),
        message: 'media.url must be absolute (http/https) or relative starting with "/".',
      },
    },
    caption: str(0, 500),
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
  },
  { _id: false }
);

/* ===================== Main schema ===================== */
const packageSchema = new Schema(
  {
    title: { ...str(2, 200), required: true },
    slug: { ...str(2, 220), required: true, unique: true, lowercase: true },

    description: { ...str(10, 8000), required: true },

    city: {
      ...str(0, 80),
      enum: ['Puno', 'Cusco', 'Lima', 'Arequipa', 'Otros'],
      default: 'Puno',
    },
    country: { ...str(0, 80), default: 'Perú' },

    category: { ...str(0, 80), default: 'Tour' },

    price: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      default: 'PEN',
      uppercase: true,
      enum: ['PEN', 'USD', 'EUR'],
    },

    durationHours: { type: Number, default: 8, min: 1, max: 240 },

    languages: {
      type: [String],
      default: ['es', 'en'],
      set: (v) =>
        cleanStringArray(Array.isArray(v) ? v : String(v || '').split(',')).map((x) =>
          x.toLowerCase()
        ),
    },

    highlights: { type: [String], default: [], set: cleanStringArray },
    includes:   { type: [String], default: [], set: cleanStringArray },
    excludes:   { type: [String], default: [], set: cleanStringArray },

    media: { type: [mediaSchema], default: [], set: normalizeMediaArray },

    // Location (optional)
    location: {
      type: locationSchema,
      set: (loc) => {
        if (!loc || typeof loc !== 'object') return undefined;
        const lat = toNum(loc.lat);
        const lng = toNum(loc.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
        return { lat: clamp(lat, -90, 90), lng: clamp(lng, -180, 180) };
      },
    },

    // Promotions / discounts
    isPromo: { type: Boolean, default: false },
    promoPercent: { type: Number, min: 0, max: 100 },
    promoPrice: { type: Number, min: 0 },
    promoStartAt: { type: Date },
    promoEndAt: { type: Date },

    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: { virtuals: true },
    collation: { locale: 'es', strength: 1 },
  }
);

/* ===================== Virtuals ===================== */
packageSchema.virtual('mainImage').get(function () {
  const m = Array.isArray(this.media)
    ? this.media.find((x) => x?.type === 'image' && nonEmpty(x.url))
    : null;
  return m?.url || null;
});

packageSchema.virtual('mainVideo').get(function () {
  const m = Array.isArray(this.media)
    ? this.media.find((x) => x?.type === 'video' && nonEmpty(x.url))
    : null;
  return m?.url || null;
});

packageSchema.virtual('hasLocation').get(function () {
  return !!(
    this.location &&
    Number.isFinite(this.location.lat) &&
    Number.isFinite(this.location.lng)
  );
});

packageSchema.virtual('shortDescription').get(function () {
  const text = String(this.description || '').replace(/\s+/g, ' ').trim();
  return text.length <= 200 ? text : `${text.slice(0, 197)}…`;
});

packageSchema.virtual('isPromoActive').get(function () {
  if (!this.isPromo) return false;
  const now = new Date();
  const s = this.promoStartAt ? new Date(this.promoStartAt) : null;
  const e = this.promoEndAt ? new Date(this.promoEndAt) : null;
  if (s && now < s) return false;
  if (e && now > e) return false;
  return true;
});

packageSchema.virtual('effectivePrice').get(function () {
  if (!this.isPromoActive) return null;
  const base = Number(this.price || 0);
  const fixed = Number(this.promoPrice || 0);
  const pct = Number(this.promoPercent || 0);
  if (fixed > 0) return Math.max(0, Number(fixed.toFixed(2)));
  if (pct > 0 && pct <= 100) {
    const v = base * (1 - pct / 100);
    return Math.max(0, Number(v.toFixed(2)));
  }
  return null;
});

packageSchema.virtual('discountPercent').get(function () {
  if (!this.isPromoActive) return 0;
  const eff = this.effectivePrice;
  const base = Number(this.price || 0);
  if (!(Number.isFinite(base) && base > 0 && eff != null)) return 0;
  return clamp(Math.round((1 - eff / base) * 100), 0, 100);
});

// Friendly aliases (useful in some UIs)
packageSchema.virtual('promoStart').get(function () {
  return this.promoStartAt || null;
});
packageSchema.virtual('promoEnd').get(function () {
  return this.promoEndAt || null;
});

/* ===================== Indexes ===================== */
packageSchema.index({ slug: 1 }, { unique: true });
packageSchema.index({ active: 1, createdAt: -1 });
packageSchema.index({ city: 1, category: 1, createdAt: -1 });
packageSchema.index({ 'location.lat': 1, 'location.lng': 1 });
// Text search
packageSchema.index({ title: 'text', description: 'text' }, { weights: { title: 3, description: 1 } });
// Promo query helper
packageSchema.index({ isPromo: 1, promoStartAt: 1, promoEndAt: 1 });

/* ===================== Guards / Normalization ===================== */
packageSchema.pre('validate', function (next) {
  const fixMaybeStringList = (v) =>
    Array.isArray(v)
      ? v
      : typeof v === 'string'
      ? v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [];

  this.highlights = cleanStringArray(fixMaybeStringList(this.highlights));
  this.includes   = cleanStringArray(fixMaybeStringList(this.includes));
  this.excludes   = cleanStringArray(fixMaybeStringList(this.excludes));

  if (typeof this.slug === 'string') this.slug = this.slug.toLowerCase().trim();

  // Currency to uppercase (align with enum)
  if (typeof this.currency === 'string') this.currency = this.currency.toUpperCase().trim();

  // Promo: clamp & sanitize
  if (Number.isFinite(this.promoPercent)) {
    this.promoPercent = clamp(Number(this.promoPercent), 0, 100);
  }
  if (Number.isFinite(this.promoPrice)) {
    this.promoPrice = Math.max(0, Number(this.promoPrice));
  }

  // Date coherence
  if (this.promoStartAt && this.promoEndAt && this.promoStartAt > this.promoEndAt) {
    const a = this.promoStartAt;
    this.promoStartAt = this.promoEndAt;
    this.promoEndAt = a;
  }

  // Media: ensure normalized & de-duped even if set bypassed setter
  if (this.isModified('media')) {
    this.media = normalizeMediaArray(this.media);
  }

  next();
});

module.exports = model('Package', packageSchema);
