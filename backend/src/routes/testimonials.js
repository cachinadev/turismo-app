// backend/src/routes/testimonials.js
const express = require("express");
const Testimonial = require("../models/Testimonial");
const Booking = require("../models/Booking");
const auth = require("../middleware/auth");
const { logAdminAction } = require("../utils/adminLog");

const router = express.Router();

function pickString(v, max) {
  return String(v || "").trim().slice(0, max) || undefined;
}

function normalizeSource(v) {
  const s = String(v || "").trim();
  if (!s) return undefined;
  return s.slice(0, 40);
}

/**
 * GET /api/testimonials
 * Public list: approved only
 */
router.get("/", async (req, res) => {
  const limitRaw = Number(req.query.limit || 60);
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 60));

  const items = await Testimonial.find({ status: "approved" })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return res.json({ items });
});

/**
 * POST /api/testimonials
 * Public submission (pending approval)
 */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const rating = Math.max(1, Math.min(5, Number(body.rating || 5)));
    const reservationId = pickString(body.reservationId, 40);

    let status = "pending";
    let verified = Boolean(body.verified);
    if (reservationId) {
      const booking = await Booking.findOne({ reservationId }).select("status").lean();
      if (booking?.status === "Finalizado") {
        status = "approved";
        verified = true;
      }
    }

    const doc = await Testimonial.create({
      name: pickString(body.name, 120) || "Traveler",
      country: pickString(body.country, 80),
      rating,
      title: pickString(body.title, 120),
      message: pickString(body.message, 1200),
      date: body.date ? new Date(body.date) : undefined,
      avatar: pickString(body.avatar, 1000),
      media: Array.isArray(body.media)
        ? body.media.slice(0, 6).map((m) => ({
            url: pickString(m?.url, 1000),
            type: m?.type === "video" ? "video" : "image",
          }))
        : undefined,
      source: normalizeSource(body.source),
      sourceUrl: pickString(body.sourceUrl, 1000),
      packageSlug: pickString(body.packageSlug, 200),
      reservationId,
      verified,
      status,
    });

    return res.json({ ok: true, id: doc._id, approved: status === "approved" });
  } catch (err) {
    return res.status(500).json({ code: "TESTIMONIAL_ERROR", message: "Could not submit testimonial" });
  }
});

/**
 * GET /api/testimonials/admin?status=approved|pending|rejected
 * Admin list
 */
router.get("/admin", auth("admin"), async (req, res) => {
  const status = String(req.query.status || "").trim();
  const q = status ? { status } : {};
  const search = String(req.query.q || "").trim();
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [
      { name: rx },
      { title: rx },
      { message: rx },
      { country: rx },
      { source: rx },
      { packageSlug: rx },
    ];
  }

  const limitRaw = Number(req.query.limit || 50);
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));
  const pageRaw = Number(req.query.page || 1);
  const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Testimonial.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Testimonial.countDocuments(q),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));
  return res.json({ items, page, pages, total, limit });
});

/**
 * PATCH /api/testimonials/:id/status
 * Admin approve/reject
 */
router.patch("/:id/status", auth("admin"), async (req, res) => {
  const status = String(req.body?.status || "").trim();
  if (!["approved", "pending", "rejected"].includes(status)) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid status" });
  }

  const doc = await Testimonial.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!doc) return res.status(404).json({ code: "NOT_FOUND", message: "Testimonial not found" });
  await logAdminAction(req, {
    action: "testimonial_status_update",
    entity: "testimonial",
    entityId: doc._id?.toString(),
    meta: { status, name: doc.name, source: doc.source },
  });
  return res.json({ ok: true, item: doc });
});

/**
 * PATCH /api/testimonials/bulk/status
 * Admin bulk approve/reject/pending
 */
router.patch("/bulk/status", auth("admin"), async (req, res) => {
  const status = String(req.body?.status || "").trim();
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!["approved", "pending", "rejected"].includes(status)) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid status" });
  }
  if (!ids.length) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Missing ids" });
  }

  const result = await Testimonial.updateMany(
    { _id: { $in: ids } },
    { $set: { status } }
  );

  await logAdminAction(req, {
    action: "testimonial_status_bulk",
    entity: "testimonial",
    meta: { status, count: ids.length },
  });
  return res.json({ ok: true, modified: result.modifiedCount || 0 });
});

module.exports = router;
