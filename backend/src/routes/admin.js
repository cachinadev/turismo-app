// backend/src/routes/admin.js
const express = require("express");
const Booking = require("../models/Booking");
const Package = require("../models/Package");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/admin/stats
 * Query: from, to (optional)
 */
router.get("/stats", auth("admin"), async (req, res) => {
  const fromRaw = String(req.query.from || "").trim();
  const toRaw = String(req.query.to || "").trim();

  const dateFilter = {};
  if (fromRaw) {
    const f = new Date(fromRaw);
    if (!Number.isNaN(+f)) dateFilter.$gte = f;
  }
  if (toRaw) {
    let t = new Date(toRaw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) t = new Date(`${toRaw}T23:59:59.999Z`);
    if (!Number.isNaN(+t)) dateFilter.$lte = t;
  }

  const match = {};
  if (Object.keys(dateFilter).length) match.date = dateFilter;

  const [pkgTotal, pkgActive, promoActive, bookingsAgg] = await Promise.all([
    Package.countDocuments({}),
    Package.countDocuments({ active: true }),
    // promoActive exact (window) -> better to compute via aggregation
    Package.countDocuments({ isPromo: true }),
    Booking.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          revenue: [
            { $match: { status: "Finalizado" } },
            {
              $group: {
                _id: "$currency",
                amount: { $sum: "$totalPrice" },
              },
            },
          ],
          byCity: [
            {
              $group: {
                _id: { $ifNull: ["$packageMeta.city", "—"] },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
  ]);

  const totals = bookingsAgg?.[0]?.totals || [];
  const revenue = bookingsAgg?.[0]?.revenue || [];
  const byCity = bookingsAgg?.[0]?.byCity || [];

  const byStatus = {};
  let cancelled = 0;
  let activeBookings = 0;

  for (const t of totals) {
    byStatus[t._id] = t.count;
    if (t._id === "Cancelado") cancelled = t.count;
    else activeBookings += t.count;
  }

  const revenueByCurrency = {};
  for (const r of revenue) revenueByCurrency[r._id || "PEN"] = Number(r.amount || 0);

  const cityMap = {};
  for (const c of byCity) cityMap[c._id || "—"] = c.count;

  res.json({
    packages: { total: pkgTotal, active: pkgActive, promoAny: promoActive },
    bookings: { active: activeBookings, cancelled, byStatus },
    revenueByCurrency,
    byCity: cityMap,
  });
});

module.exports = router;
