// backend/src/routes/contact.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Intenta más tarde.' },
});

function escHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true', // true if port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls:
      String(process.env.SMTP_ALLOW_INVALID_CERTS || '0') === '1'
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

/**
 * POST /api/contact
 * Body: { name, email, phone?, message, pageUrl? }
 */
router.post(
  '/',
  contactLimiter,
  [
    body('name').isString().trim().isLength({ min: 2, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('message').isString().trim().isLength({ min: 5, max: 4000 }),
    body('phone').optional().isString().trim().isLength({ max: 40 }),
    body('pageUrl').optional().isURL({ require_protocol: true }).isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const name = safeText(req.body.name, 120);
    const email = safeText(req.body.email, 180).toLowerCase();
    const phone = safeText(req.body.phone, 40);
    const message = safeText(req.body.message, 4000);
    const pageUrl = safeText(req.body.pageUrl, 500);

    const from = process.env.SMTP_FROM || 'no-reply@example.com';
    const to = process.env.CONTACT_TO || process.env.ADMIN_EMAIL || 'admin@example.com';
    const bcc = process.env.CONTACT_BCC ? String(process.env.CONTACT_BCC).split(',').map(s => s.trim()) : [];
    const replyTo = process.env.SMTP_REPLY_TO || email;

    const subject = `Nuevo contacto web – ${name}`;
    const html = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><b>Nombre:</b> ${escHtml(name)}</p>
      <p><b>Email:</b> ${escHtml(email)}</p>
      <p><b>Teléfono:</b> ${escHtml(phone || '-')}</p>
      ${pageUrl ? `<p><b>Origen:</b> <a href="${escHtml(pageUrl)}">${escHtml(pageUrl)}</a></p>` : ''}
      <hr/>
      <p>${escHtml(message).replace(/\n/g, '<br/>')}</p>
    `;

    try {
      const transporter = buildTransporter();
      await transporter.sendMail({
        from,
        to,
        bcc: bcc.length ? bcc : undefined,
        replyTo,
        subject,
        html,
      });

      return res.json({ ok: true, message: 'Mensaje enviado correctamente' });
    } catch (err) {
      console.error('❌ Contact email error:', err?.message || err);
      return res.status(500).json({ message: 'No se pudo enviar el mensaje' });
    }
  }
);

module.exports = router;
