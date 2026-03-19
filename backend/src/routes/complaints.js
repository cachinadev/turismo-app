// backend/src/routes/complaints.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const { Complaint } = require("../models/Complaint");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  BRAND_NAME = "Vicuña Adventures",
} = process.env;

/* ------------------------------------------------------
 * ✉️ Configuración de transporte SMTP
 * ------------------------------------------------------ */
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: String(SMTP_SECURE || "false") === "true", // false = STARTTLS
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls:
    String(process.env.SMTP_ALLOW_INVALID_CERTS || "0") === "1"
      ? { rejectUnauthorized: false }
      : undefined,
});

const complaintsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta más tarde." },
});

function escHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

/* ------------------------------------------------------
 * 📨 POST /api/complaints
 * ------------------------------------------------------ */
router.post(
  "/",
  complaintsLimiter,
  [
    body("name").isString().trim().isLength({ min: 2, max: 120 }),
    body("email").isEmail().normalizeEmail(),
    body("phone").optional().isString().trim().isLength({ max: 40 }),
    body("documentType").isString().trim().isLength({ min: 2, max: 20 }),
    body("documentNumber").isString().trim().isLength({ min: 4, max: 40 }),
    body("service").isString().trim().isLength({ min: 2, max: 160 }),
    body("description").isString().trim().isLength({ min: 10, max: 4000 }),
    body("type").optional().isIn(["Reclamo", "Queja"]),
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const data = {
      name: safeText(req.body.name, 120),
      email: safeText(req.body.email, 180).toLowerCase(),
      phone: safeText(req.body.phone, 40),
      documentType: safeText(req.body.documentType, 20),
      documentNumber: safeText(req.body.documentNumber, 40),
      service: safeText(req.body.service, 160),
      description: safeText(req.body.description, 4000),
      type: req.body.type === "Queja" ? "Queja" : "Reclamo",
    };

    // Guarda en BD
    await Complaint.create(data);

    // 🧾 Correo para el administrador
    const adminMail = {
      from: `"Libro de Reclamaciones" <${SMTP_USER}>`,
      to: process.env.CONTACT_TO || "contact@vicuadvent.com",
      bcc: process.env.CONTACT_BCC || "vicuadventures@gmail.com",
      subject: `Nuevo ${data.type} de ${data.name}`,
      html: `
        <h2>Nuevo ${escHtml(data.type)}</h2>
        <p><b>Nombre:</b> ${escHtml(data.name)}</p>
        <p><b>Email:</b> ${escHtml(data.email)}</p>
        <p><b>Teléfono:</b> ${escHtml(data.phone || "—")}</p>
        <p><b>Documento:</b> ${escHtml(data.documentType)} ${escHtml(data.documentNumber)}</p>
        <p><b>Servicio:</b> ${escHtml(data.service)}</p>
        <p><b>Tipo:</b> ${escHtml(data.type)}</p>
        <p><b>Descripción:</b></p>
        <blockquote style="border-left:3px solid #ccc;padding-left:10px;">
          ${escHtml(data.description).replace(/\n/g, "<br/>")}
        </blockquote>
        <p><small>Fecha: ${new Date().toLocaleString("es-PE")}</small></p>
      `,
    };

    // 🧾 Correo de confirmación para el usuario
    const userMail = {
      from: `"${BRAND_NAME}" <${SMTP_USER}>`,
      to: data.email,
      subject: `Confirmación de recepción - Libro de Reclamaciones`,
      html: `
        <p>Estimado/a <b>${escHtml(data.name)}</b>,</p>
        <p>Hemos recibido su ${String(data.type || "").toLowerCase()} correctamente en nuestro
        <b>Libro de Reclamaciones Virtual</b>.</p>
        <p>En breve, nuestro equipo de atención se comunicará con usted
        para brindarle una respuesta.</p>
        <br/>
        <p>Atentamente,</p>
        <p><b>${BRAND_NAME}</b></p>
        <hr/>
        <p style="font-size:12px;color:#777;">
          Este correo es una confirmación automática. No responda a este mensaje.
        </p>
      `,
    };

    // Envíos
    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);

    console.log("📬 Reclamo registrado y correos enviados:", data.email);

    return res.status(200).json({ success: true, message: "Complaint saved & emails sent" });
  } catch (err) {
    console.error("❌ Error al procesar el reclamo:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
);

module.exports = router;
