// backend/src/routes/contact.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const router = express.Router();

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true', // true if port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * POST /api/contact
 * Body: { name, email, phone?, message, pageUrl? }
 */
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('message').isString().trim().isLength({ min: 5 }),
    body('phone').optional().isString().trim(),
    body('pageUrl').optional().isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, message, pageUrl } = req.body;

    const from = process.env.SMTP_FROM || 'no-reply@example.com';
    const to = process.env.CONTACT_TO || process.env.ADMIN_EMAIL || 'admin@example.com';
    const bcc = process.env.CONTACT_BCC ? String(process.env.CONTACT_BCC).split(',').map(s => s.trim()) : [];
    const replyTo = process.env.SMTP_REPLY_TO || email;

    const subject = `Nuevo contacto web – ${name}`;
    const html = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><b>Nombre:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Teléfono:</b> ${phone || '-'}</p>
      ${pageUrl ? `<p><b>Origen:</b> <a href="${pageUrl}">${pageUrl}</a></p>` : ''}
      <hr/>
      <p>${(message || '').replace(/\n/g, '<br/>')}</p>
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
