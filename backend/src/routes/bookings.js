// backend/src/routes/bookings.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const auth = require('../middleware/auth');
const { sendBookingEmails } = require('../utils/mailer');

const router = express.Router();

// Helpers
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

// Normalize date: accept ISO string or YYYY-MM-DD; reject past dates
function normalizeDateOrThrow(d) {
  const raw = String(d || '').trim();
  if (!raw) throw Object.assign(new Error('Fecha requerida'), { status: 400 });

  // If only date provided, interpret as local date (America/Lima) at 00:00
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let date;
  if (m) {
    // Local midnight for Lima (UTC-5) -> store as UTC date at 05:00
    const [_, Y, M, D] = m;
    const dt = new Date(`${Y}-${M}-${D}T05:00:00.000Z`); // crude but consistent
    date = dt;
  } else {
    const parsed = new Date(raw);
    if (Number.isNaN(+parsed)) throw Object.assign(new Error('Fecha inválida'), { status: 400 });
    date = parsed;
  }

  const today = new Date();
  // Zero out smaller units for comparison
  if (date < today) throw Object.assign(new Error('La fecha no puede ser pasada'), { status: 400 });
  return date;
}

// Compute total price (basic rule: per-person * price)
function computeTotalPrice(pkg, people = { adults: 1, children: 0 }) {
  const adults = Math.max(1, parseInt(people.adults || 1, 10));
  const children = Math.max(0, parseInt(people.children || 0, 10));
  const price = Number(pkg.price || 0);
  // If you later support child discounts, adjust here
  return price * (adults + children);
}

// --- Crear reserva (público)
router.post(
  '/',
  [
    body('packageId').isString().custom(isObjectId).withMessage('packageId inválido'),
    body('date').isString().notEmpty().withMessage('Fecha requerida'),
    body('customer.name').isString().trim().isLength({ min: 2, max: 100 }),
    body('customer.email').isEmail().normalizeEmail(),
    body('customer.phone').optional().isString().trim().isLength({ max: 40 }),
    body('people.adults').optional().isInt({ min: 1, max: 99 }),
    body('people.children').optional().isInt({ min: 0, max: 99 }),
    body('notes').optional().isString().trim().isLength({ max: 1000 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const pkg = await Package.findOne({ _id: req.body.packageId, active: true })
        .select('title price currency city slug active')
        .lean();
      if (!pkg) return res.status(404).json({ message: 'Paquete no encontrado o inactivo' });

      const when = normalizeDateOrThrow(req.body.date);

      const people = {
        adults: Math.max(1, parseInt(req.body?.people?.adults || 1, 10)),
        children: Math.max(0, parseInt(req.body?.people?.children || 0, 10)),
      };

      const customer = {
        name: String(req.body.customer.name).trim(),
        email: String(req.body.customer.email).trim(),
        phone: req.body.customer.phone ? String(req.body.customer.phone).trim() : undefined,
      };

      const notes = req.body.notes ? String(req.body.notes).trim() : undefined;

      const totalPrice = computeTotalPrice(pkg, people); // 🔒 ignore client totalPrice

      const booking = await Booking.create({
        package: pkg._id,
        date: when,
        people,
        customer,
        notes,
        totalPrice,
        status: 'Pendiente', // ensure default
      });

      // Fire & log email sending without blocking success response
      // If you prefer to ensure delivery, keep await but wrap try/catch.
      (async () => {
        try {
          await sendBookingEmails({ booking, pkg });
        } catch (e) {
          console.error('sendBookingEmails failed:', e?.message || e);
        }
      })();

      return res.status(201).json(booking);
    } catch (err) {
      return next(err);
    }
  }
);

// --- Listar reservas (admin) con paginación
router.get('/', auth('admin'), async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const projection =
    'package date people customer.name customer.email customer.phone notes totalPrice status createdAt';

  const [items, total] = await Promise.all([
    Booking.find({})
      .populate({ path: 'package', select: 'title slug city price currency' })
      .select(projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments({}),
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

// --- Cambiar estado (admin)
const VALID_STATUS = new Set(['Pendiente', 'En proceso', 'Finalizado', 'Cancelado']);
router.patch('/:id/status', auth('admin'), async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

  const { status } = req.body || {};
  if (!VALID_STATUS.has(status)) {
    return res.status(400).json({ message: 'Estado inválido' });
  }

  const updated = await Booking.findByIdAndUpdate(id, { status }, { new: true });
  if (!updated) return res.status(404).json({ message: 'No encontrado' });
  res.json(updated);
});

module.exports = router;
