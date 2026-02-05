// backend/src/routes/events.js
const express = require("express");
const Event = require("../models/Event");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/events
 * Public tracking endpoint.
 * Body: { type, message?, meta?, path?, url?, referrer? }
 */
router.post("/", async (req, res) => {
  try {
    const { type, message, meta, path, url, referrer } = req.body || {};
    const safeType = String(type || "").trim();
    if (!safeType) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "Missing event type" });
    }
    if (!/^[a-z0-9:_-]+$/i.test(safeType)) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid event type" });
    }

    let safeMeta = meta && typeof meta === "object" ? meta : undefined;
    if (safeMeta) {
      try {
        const metaStr = JSON.stringify(safeMeta);
        if (metaStr.length > 4000) safeMeta = undefined;
      } catch {
        safeMeta = undefined;
      }
    }

    const doc = await Event.create({
      type: safeType.slice(0, 80),
      message: String(message || "").trim().slice(0, 500) || undefined,
      meta: safeMeta,
      path: String(path || "").trim().slice(0, 300) || undefined,
      url: String(url || "").trim().slice(0, 1000) || undefined,
      referrer: String(referrer || "").trim().slice(0, 1000) || undefined,
      userAgent: String(req.get("user-agent") || "").slice(0, 300) || undefined,
      ip: String(req.ip || "").slice(0, 64) || undefined,
    });

    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    return res.status(500).json({ code: "EVENT_ERROR", message: "Could not log event" });
  }
});

/**
 * GET /api/events?limit=50
 * Admin-only list of recent events
 */
router.get("/", auth("admin"), async (req, res) => {
  const limitRaw = Number(req.query.limit || 50);
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));

  const q = {};
  const type = String(req.query.type || "").trim();
  if (type) q.type = type.slice(0, 80);

  const source = String(req.query.source || "").trim();
  if (source) q["meta.source"] = source.slice(0, 120);

  const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null;
  const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null;
  if (!isNaN(dateFrom) || !isNaN(dateTo)) {
    q.createdAt = {};
    if (!isNaN(dateFrom)) q.createdAt.$gte = dateFrom;
    if (!isNaN(dateTo)) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      q.createdAt.$lte = end;
    }
  }

  const items = await Event.find(q)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return res.json({ items });
});

module.exports = router;
