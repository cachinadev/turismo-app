//backend/src/routes/complaints.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { Complaint } = require("../models/Complaint");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  BRAND_NAME = "Vicuña Adventures"
} = process.env;

/* ------------------------------------------------------
 * ✉️ Configuración de transporte SMTP
 * ------------------------------------------------------ */
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: String(SMTP_SECURE || "false") === "true", // false = STARTTLS
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: {
    rejectUnauthorized: false, // evita errores de certificado en VPS
  },
});

/* ------------------------------------------------------
 * 📨 POST /api/complaints
 * ------------------------------------------------------ */
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const record = await Complaint.create(data);

    // 🧾 Correo para el administrador
    const adminMail = {
      from: `"Libro de Reclamaciones" <${SMTP_USER}>`,
      to: process.env.CONTACT_TO || "contact@vicuadvent.com",
      bcc: process.env.CONTACT_BCC || "vicuadventures@gmail.com",
      subject: `📕 Nuevo ${data.type} de ${data.name}`,
      html: `
        <h2>Nuevo ${data.type}</h2>
        <p><b>Nombre:</b> ${data.name}</p>
        <p><b>Email:</b> ${data.email}</p>
        <p><b>Teléfono:</b> ${data.phone || "—"}</p>
        <p><b>Documento:</b> ${data.documentType} ${data.documentNumber}</p>
        <p><b>Servicio:</b> ${data.service}</p>
        <p><b>Tipo:</b> ${data.type}</p>
        <p><b>Descripción:</b></p>
        <blockquote style="border-left:3px solid #ccc;padding-left:10px;">
          ${data.description}
        </blockquote>
        <p><small>Fecha: ${new Date().toLocaleString("es-PE")}</small></p>
      `,
    };

    // 🧾 Correo de confirmación para el denunciante
    const userMail = {
      from: `"${BRAND_NAME}" <${SMTP_USER}>`,
      to: data.email,
      subject: `Confirmación de recepción - Libro de Reclamaciones`,
      html: `
        <p>Estimado/a <b>${data.name}</b>,</p>
        <p>Hemos recibido su ${data.type.toLowerCase()} correctamente en nuestro
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

    res.status(200).json({ success: true, message: "Complaint saved & emails sent" });
  } catch (err) {
    console.error("❌ Error al procesar el reclamo:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
