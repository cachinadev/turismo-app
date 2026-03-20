// backend/src/models/Package.js
const { Schema, model } = require("mongoose");

/* ===================== Helpers ===================== */
const str = (min = 0, max = 2000) => ({
  type: String,
  trim: true,
  minlength: min,
  maxlength: max,
});

const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

function normalizeText(v, { max = 8000 } = {}) {
  if (v === null || v === undefined) return v;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) : s;
}

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

const isValidHttpUrl = (v) => {
  if (!nonEmpty(v)) return true; // allow empty
  try {
    const u = new URL(String(v));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const parseMaybeStringList = (v) =>
  Array.isArray(v)
    ? v
    : typeof v === "string"
    ? v
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/* ---- media normalizer + de-dupe (order-preserving) ---- */
const MAX_MEDIA = 60;
function normalizeMediaVariant(v) {
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

function normalizeMediaArray(input) {
  const arr = Array.isArray(input) ? input : input ? [input] : [];
  const out = [];
  const seen = new Set();

  for (const m of arr) {
    if (!m || typeof m !== "object") continue;
    const type = m.type === "video" ? "video" : "image";
    const url = String(m.url || "").trim();
    if (!url) continue;

    // Allow absolute http(s) OR relative starting with "/"
    if (!(/^https?:\/\//i.test(url) || url.startsWith("/"))) continue;

    const key = `${type}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const relativePath = String(m.relativePath || '').trim();
    const width = Number.isFinite(Number(m.width)) ? Number(m.width) : undefined;
    const height = Number.isFinite(Number(m.height)) ? Number(m.height) : undefined;
    const variants = type === 'image' && m.variants && typeof m.variants === 'object'
      ? Object.fromEntries(
          Object.entries(m.variants)
            .map(([name, value]) => [name, normalizeMediaVariant(value)])
            .filter(([, value]) => value)
        )
      : undefined;

    out.push({
      type,
      url,
      ...(relativePath ? { relativePath } : {}),
      ...(Number.isFinite(width) ? { width } : {}),
      ...(Number.isFinite(height) ? { height } : {}),
      ...(variants && Object.keys(variants).length ? { variants } : {}),
      ...(m.caption ? { caption: String(m.caption).slice(0, 500) } : {}),
    });

    if (out.length >= MAX_MEDIA) break;
  }
  return out;
}

/* ---- itinerary normalizer ---- */
const MAX_ITINERARY_STEPS = 80;
function normalizeItinerary(input) {
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
    const guideLanguages = cleanStringArray(parseMaybeStringList(s.guideLanguages));

    // drop empty steps
    if (!time && !title && !details && !location && !mapsUrl && !transport && !guideNotes && !guideLanguages.length && !day && durationHours == null && durationMinutes == null) continue;
    // keep only valid http(s) if provided
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

function normalizeLocation(loc) {
  if (!loc || typeof loc !== "object") return undefined;
  const lat = toNum(loc.lat);
  const lng = toNum(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat: clamp(lat, -90, 90), lng: clamp(lng, -180, 180) };
}

function normalizeCsvList(v) {
  return cleanStringArray(Array.isArray(v) ? v : String(v || "").split(","));
}

/* ===================== Subschemas ===================== */
const mediaVariantSchema = new Schema(
  {
    url: { type: String, trim: true, maxlength: 2000 },
    relativePath: { type: String, trim: true, maxlength: 2000 },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    format: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false }
);

const mediaSchema = new Schema(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\//i.test(v) || String(v).startsWith("/"),
        message: 'media.url must be absolute (http/https) or relative starting with "/".',
      },
    },
    relativePath: { type: String, trim: true, maxlength: 2000 },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    variants: {
      thumb: mediaVariantSchema,
      medium: mediaVariantSchema,
      large: mediaVariantSchema,
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

const itineraryStepSchema = new Schema(
  {
    time: str(0, 20), // "08:00"
    title: str(0, 140), // "Recojo"
    details: str(0, 1200), // "Recojo en hotel..."
    location: str(0, 180), // "Puerto de Puno"
    durationMin: { type: Number, min: 0, max: 2000 },
    day: { type: Number, min: 1, max: 365 },
    durationHours: { type: Number, min: 0, max: 48 },
    durationMinutes: { type: Number, min: 0, max: 59 },
    transport: { ...str(0, 180) },
    guideLanguages: {
      type: [String],
      default: [],
      set: (v) => cleanStringArray(parseMaybeStringList(v)),
    },
    guideNotes: str(0, 800),
    mapsUrl: {
      ...str(0, 2000),
      validate: {
        validator: (v) => isValidHttpUrl(v),
        message: "itinerary.mapsUrl must be a valid http/https URL.",
      },
    },
  },
  { _id: false }
);

const brochurePdfSchema = new Schema(
  {
    url: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    relativePath: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    filename: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    size: { type: Number, min: 0 },
    uploadedAt: { type: Date },
  },
  { _id: false }
);

/* ===================== Main schema ===================== */
const packageSchema = new Schema(
  {
    title: {
      ...str(3, 140),
      required: true,
      set: (v) => normalizeText(v, { max: 140 }),
    },

    // ✅ IMPORTANT: avoid duplicate index warning:
    // Do NOT set `unique: true` here if you also create schema.index({slug:1},{unique:true})
    slug: {
      ...str(2, 220),
      required: true,
      lowercase: true,
      set: (v) => normalizeText(v, { max: 220 })?.toLowerCase(),
    },

    description: {
      ...str(10, 4000),
      required: true,
      set: (v) => normalizeText(v, { max: 4000 }),
    },

    city: {
      ...str(0, 80),
      enum: ["Puno", "Cusco", "Lima", "Arequipa", "Otros"],
      default: "Puno",
      set: (v) => (nonEmpty(v) ? normalizeText(v, { max: 80 }) : v),
    },

    country: {
      ...str(0, 80),
      default: "Perú",
      set: (v) => (nonEmpty(v) ? normalizeText(v, { max: 80 }) : v),
    },

    category: {
      ...str(0, 80),
      default: "Tour",
      set: (v) => (nonEmpty(v) ? normalizeText(v, { max: 80 }) : v),
    },

    price: { type: Number, required: true, min: 0 },
    exclusivePrice: { type: Number, min: 0 },

    currency: {
      type: String,
      default: "PEN",
      uppercase: true,
      enum: ["PEN", "USD", "EUR"],
      set: (v) => (nonEmpty(v) ? String(v).toUpperCase().trim() : v),
    },

    durationHours: { type: Number, default: 8, min: 1, max: 240 },
    dailyCapacity: { type: Number, default: 0, min: 0, max: 2000 },

    languages: {
      type: [String],
      default: ["es", "en"],
      set: (v) => normalizeCsvList(v).map((x) => x.toLowerCase()),
    },

    transport: {
      ...str(0, 120),
      set: (v) => (nonEmpty(v) ? normalizeText(v, { max: 120 }) : v),
    },

    guideLanguages: {
      type: [String],
      default: ["es", "en"],
      set: (v) => cleanStringArray(parseMaybeStringList(v)),
    },

    guideNotes: { ...str(0, 800) },

    highlights: { type: [String], default: [], set: (v) => cleanStringArray(parseMaybeStringList(v)) },
    includes: { type: [String], default: [], set: (v) => cleanStringArray(parseMaybeStringList(v)) },
    excludes: { type: [String], default: [], set: (v) => cleanStringArray(parseMaybeStringList(v)) },

    whatToBring: { type: [String], default: [], set: (v) => cleanStringArray(parseMaybeStringList(v)) },
    recommendations: { type: [String], default: [], set: (v) => cleanStringArray(parseMaybeStringList(v)) },

    media: { type: [mediaSchema], default: [], set: normalizeMediaArray },
    brochurePdf: { type: brochurePdfSchema },

    location: {
      type: locationSchema,
      set: normalizeLocation,
    },

    mapsUrl: {
      ...str(0, 2000),
      set: (v) => (nonEmpty(v) ? normalizeText(v, { max: 2000 }) : v),
      validate: {
        validator: (v) => isValidHttpUrl(v),
        message: "mapsUrl must be a valid http/https URL.",
      },
    },
    meetingPoint: { ...str(0, 220), set: (v) => (nonEmpty(v) ? normalizeText(v, { max: 220 }) : v) },
    dropoffPoint: { ...str(0, 220), set: (v) => (nonEmpty(v) ? normalizeText(v, { max: 220 }) : v) },

    startTimes: {
      type: [String],
      default: [],
      set: (v) =>
        normalizeCsvList(v).map((x) => x.replace(/\s+/g, "")), // "08:00"
    },
    availableDays: {
      type: [String],
      default: [],
      set: (v) =>
        normalizeCsvList(v).map((x) => normalizeText(x, { max: 30 })), // "Lunes"
    },

    difficulty: {
      type: String,
      enum: ["Fácil", "Moderado", "Difícil"],
      default: "Fácil",
    },

    ageMin: { type: Number, min: 0, max: 120 },
    minPeople: { type: Number, min: 1, max: 500 },
    maxPeople: { type: Number, min: 1, max: 500 },

    itinerary: {
      type: [itineraryStepSchema],
      default: [],
      set: normalizeItinerary,
    },

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
    collation: { locale: "es", strength: 1 },
  }
);

/* ===================== Virtuals ===================== */
packageSchema.virtual("mainImage").get(function () {
  const m = Array.isArray(this.media) ? this.media.find((x) => x?.type === "image" && nonEmpty(x.url)) : null;
  return m?.url || null;
});

packageSchema.virtual("mainVideo").get(function () {
  const m = Array.isArray(this.media) ? this.media.find((x) => x?.type === "video" && nonEmpty(x.url)) : null;
  return m?.url || null;
});

packageSchema.virtual("hasLocation").get(function () {
  return !!(this.location && Number.isFinite(this.location.lat) && Number.isFinite(this.location.lng));
});

packageSchema.virtual("shortDescription").get(function () {
  const text = String(this.description || "").replace(/\s+/g, " ").trim();
  return text.length <= 200 ? text : `${text.slice(0, 197)}…`;
});

packageSchema.virtual("isPromoActive").get(function () {
  if (!this.isPromo) return false;
  const now = new Date();
  const s = this.promoStartAt ? new Date(this.promoStartAt) : null;
  const e = this.promoEndAt ? new Date(this.promoEndAt) : null;
  if (s && now < s) return false;
  if (e && now > e) return false;
  return true;
});

packageSchema.virtual("effectivePrice").get(function () {
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

packageSchema.virtual("discountPercent").get(function () {
  if (!this.isPromoActive) return 0;
  const eff = this.effectivePrice;
  const base = Number(this.price || 0);
  if (!(Number.isFinite(base) && base > 0 && eff != null)) return 0;
  return clamp(Math.round((1 - eff / base) * 100), 0, 100);
});

// Friendly aliases
packageSchema.virtual("promoStart").get(function () {
  return this.promoStartAt || null;
});
packageSchema.virtual("promoEnd").get(function () {
  return this.promoEndAt || null;
});

/* ===================== Indexes ===================== */
/* ✅ keep ONE unique definition for slug (avoids duplicate schema index warning) */
packageSchema.index({ slug: 1 }, { unique: true });

packageSchema.index({ active: 1, createdAt: -1 });
packageSchema.index({ city: 1, category: 1, createdAt: -1 });
packageSchema.index({ "location.lat": 1, "location.lng": 1 });

// Text search
packageSchema.index({ title: "text", description: "text" }, { weights: { title: 3, description: 1 } });

// Promo helper
packageSchema.index({ isPromo: 1, promoStartAt: 1, promoEndAt: 1 });

// Optional filters
packageSchema.index({ difficulty: 1, createdAt: -1 });
packageSchema.index({ minPeople: 1, maxPeople: 1 });
packageSchema.index({ "itinerary.location": 1 });

/* ===================== Guards / Normalization ===================== */
packageSchema.pre("validate", function (next) {
  // Ensure normalized text
  if (typeof this.title === "string") this.title = normalizeText(this.title, { max: 140 });
  if (typeof this.description === "string") this.description = normalizeText(this.description, { max: 4000 });
  if (typeof this.slug === "string") this.slug = normalizeText(this.slug, { max: 220 }).toLowerCase().trim();

  // Lists: support textarea strings too (again, even if setter bypassed)
  this.highlights = cleanStringArray(parseMaybeStringList(this.highlights));
  this.includes = cleanStringArray(parseMaybeStringList(this.includes));
  this.excludes = cleanStringArray(parseMaybeStringList(this.excludes));

  this.whatToBring = cleanStringArray(parseMaybeStringList(this.whatToBring));
  this.recommendations = cleanStringArray(parseMaybeStringList(this.recommendations));

  // Currency to uppercase
  if (typeof this.currency === "string") this.currency = this.currency.toUpperCase().trim();

  // People: keep coherent
  if (Number.isFinite(this.minPeople) && Number.isFinite(this.maxPeople) && this.minPeople > this.maxPeople) {
    const a = this.minPeople;
    this.minPeople = this.maxPeople;
    this.maxPeople = a;
  }

  // Promo: clamp & sanitize
  if (Number.isFinite(this.promoPercent)) this.promoPercent = clamp(Number(this.promoPercent), 0, 100);
  if (Number.isFinite(this.promoPrice)) this.promoPrice = Math.max(0, Number(this.promoPrice));

  // Date coherence
  if (this.promoStartAt && this.promoEndAt && this.promoStartAt > this.promoEndAt) {
    const a = this.promoStartAt;
    this.promoStartAt = this.promoEndAt;
    this.promoEndAt = a;
  }

  // Normalize media / itinerary even if setters are bypassed
  if (this.isModified("media")) this.media = normalizeMediaArray(this.media);
  if (this.isModified("itinerary")) this.itinerary = normalizeItinerary(this.itinerary);

  // Normalize location even if direct assignment
  if (this.isModified("location")) this.location = normalizeLocation(this.location);

  next();
});

module.exports = model("Package", packageSchema);
