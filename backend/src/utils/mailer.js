// backend/src/utils/mailer.js
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const fs = require("fs");
const path = require("path");

let _transporter = null;

/* ---------- Helpers ---------- */
function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      (process.env.SMTP_USER || "").length &&
      (process.env.SMTP_PASS || "").length
  );
}

function getFromAddress() {
  return (
    process.env.SMTP_FROM ||
    `${process.env.BRAND_NAME || "Turismo Perú"} <no-reply@turismo.pe>`
  );
}

function ensureTransporter() {
  if (_transporter) return _transporter;

  if (!isSmtpConfigured()) {
    _transporter = {
      async sendMail(opts) {
        console.log("[mailer] SMTP not configured; skipping sendMail.", {
          to: opts?.to,
          subject: opts?.subject,
        });
        return { messageId: "stub-no-smtp" };
      },
      async verify() {
        return true;
      },
    };
    return _transporter;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });

  _transporter.verify().then(
    () => console.log("[mailer] SMTP connection verified"),
    (err) => console.warn("[mailer] SMTP verify failed:", err?.message || err)
  );

  return _transporter;
}

function fmtMoney(n, locale = "es-PE") {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtWhenISO(dateStr, locale = "es-PE") {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleString(locale, { timeZone: "America/Lima" });
  } catch {
    return "-";
  }
}

function esc(s) {
  return String(s || "");
}

function getPublicApiBase() {
  return (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "") || "http://localhost:4000";
}

function getWebsiteBase() {
  return (process.env.COMPANY_WEBSITE || "https://www.vicuadvent.com").replace(/\/+$/, "");
}

/* ---------- Stream -> Buffer ---------- */
function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

/* ---------- PDF Generator (Booking Summary) -> Buffer ---------- */
// NOTE: kept for future use, but we DO NOT attach it anymore.
async function generateBookingPDFBuffer({ booking, pkg, payment }) {
  const brand = process.env.BRAND_NAME || "Turismo Perú";
  const company = process.env.COMPANY_NAME || brand;

  const doc = new PDFDocument({ margin: 48 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const reservationId = booking?.reservationId || booking?._id?.toString() || "N/A";
  const currency = booking?.currency || pkg?.currency || "PEN";

  doc.fontSize(18).text(`${brand} – Confirmación de Reserva`, { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(12).fillColor("#111").text(`ID de Reserva: ${reservationId}`, { align: "center" });
  doc.moveDown();

  doc.fontSize(13).fillColor("#111").text("Detalle de la reserva", { underline: true });
  doc.moveDown(0.3);

  doc.fontSize(11).fillColor("#111");
  doc.text(`Paquete: ${pkg?.title || booking?.packageMeta?.title || "N/A"}`);
  doc.text(`Ciudad: ${pkg?.city || booking?.packageMeta?.city || "N/A"}`);
  doc.text(`Fecha del tour: ${fmtWhenISO(booking?.date)}`);
  doc.text(`Tipo: ${booking?.tourType === "exclusive" ? "Exclusivo (privado)" : "Colectivo"}`);
  doc.text(`Pasajeros: Adultos ${booking?.people?.adults ?? 0} / Niños ${booking?.people?.children ?? 0}`);
  doc.text(`Precio unitario: ${fmtMoney(booking?.unitPrice)} ${currency}`);
  doc.text(`Total estimado: ${fmtMoney(booking?.totalPrice)} ${currency}`);
  doc.moveDown();

  doc.fontSize(13).text("Datos del cliente", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11);
  doc.text(`Nombre: ${booking?.customer?.name || ""}`);
  doc.text(`Email: ${booking?.customer?.email || ""}`);
  doc.text(`Teléfono: ${booking?.customer?.phone || ""}`);
  doc.text(`País: ${booking?.customer?.country || ""}`);
  doc.moveDown();

  if (booking?.notes) {
    doc.fontSize(13).text("Notas", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).text(String(booking.notes));
    doc.moveDown();
  }

  doc.fontSize(13).text("Datos de pago (Perú)", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11);
  doc.text(`(Ver correo)`);
  doc.moveDown();

  doc.fontSize(9).fillColor("gray").text(
    `Generado automáticamente por ${company} · ${getWebsiteBase()}`,
    { align: "center" }
  );

  doc.end();
  return streamToBuffer(stream);
}

/* ---------- Brochure fetch -> Buffer ---------- */
async function fetchBrochurePDFBuffer(pkgId) {
  if (!pkgId) return null;

  const base = getPublicApiBase();
  const url = `${base}/api/brochures/${pkgId}.pdf`;

  const f = global.fetch;
  if (!f) {
    console.warn("[mailer] fetch not available in this Node version; skipping brochure attachment.");
    return null;
  }

  try {
    const res = await f(url);
    if (!res.ok) {
      console.warn("[mailer] brochure fetch failed:", res.status, res.statusText);
      return null;
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (e) {
    console.warn("[mailer] brochure fetch error:", e?.message || e);
    return null;
  }
}

/* ---------- Logo attachment (CID) ---------- */
function getLogoAttachment() {
  const p = String(process.env.LOGO_PATH || "").trim();
  const guess = path.resolve(__dirname, "../../../frontend/public/icon.png");
  const candidate = p || guess;

  try {
    if (candidate && fs.existsSync(candidate)) {
      return {
        filename: "logo.png",
        path: candidate,
        cid: "brandlogo@vicuadvent",
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/* ---------- Payment data (UPDATED) ---------- */
function getPaymentInfo() {
  return {
    recipients: [
      {
        name: "Jacqueline M.",
        bank: "BCP",
        accounts: [
          { label: "Cuenta BCP Soles", number: "49513938255022", currency: "PEN" },
          { label: "CCI (Soles)", number: "00249511393825502201", currency: "PEN" },
          { label: "Cuenta BCP Dólares", number: "49513938446115", currency: "USD" },
          { label: "CCI (Dólares)", number: "00249511393844611503", currency: "USD" },
        ],
        yape: "999069352",
        plin: null,
      },
    ],
    // WhatsApp: por defecto usa el primer número (Jorge C.). Puedes cambiarlo con PAYMENT_WA_DEFAULT
    waDefault: process.env.PAYMENT_WA_DEFAULT || "982397386",
  };
}

function paymentWA(number) {
  const num = String(number || "").replace(/[^\d]/g, "");
  return num ? `https://wa.me/${num}` : null;
}

function renderPaymentHTML(payment) {
  const recs = payment?.recipients || [];
  const blocks = recs
    .map((r) => {
      const accHtml = (r.accounts || [])
        .map(
          (a) =>
            `<div style="margin:2px 0;">
              <span style="color:#111;"><b>${esc(a.label)}:</b></span>
              <span style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${esc(a.number)}</span>
              <span style="color:#6b7280;font-size:12px;"> (${esc((a.currency || "").toUpperCase())})</span>
            </div>`
        )
        .join("");

      const yape = r.yape ? `<div style="margin-top:8px;"><b>Yape:</b> ${esc(r.yape)} <span style="color:#6b7280;">(${esc(r.name)})</span></div>` : "";
      const plin = r.plin ? `<div><b>Plin:</b> ${esc(r.plin)} <span style="color:#6b7280;">(${esc(r.name)})</span></div>` : "";

      return `
        <div style="border:1px solid #eee;border-radius:12px;padding:12px;margin-bottom:10px;">
          <div style="font-weight:800;margin-bottom:6px;">${esc(r.name)} · ${esc(r.bank)}</div>
          ${accHtml}
          ${yape}
          ${plin}
        </div>
      `;
    })
    .join("");

  return `
    <div style="font-size:13px;color:#111;">
      ${blocks || "<div>-</div>"}
      <div style="margin-top:10px;color:#333;">
        Para confirmar tu reserva, realiza el pago y envíanos el comprobante por WhatsApp o por este mismo correo.
      </div>
    </div>
  `;
}

function renderPaymentText(payment) {
  const recs = payment?.recipients || [];
  const lines = [];
  for (const r of recs) {
    lines.push(`${r.name} · ${r.bank}`);
    for (const a of r.accounts || []) {
      lines.push(`- ${a.label}: ${a.number} (${String(a.currency || "").toUpperCase()})`);
    }
    if (r.yape) lines.push(`- Yape: ${r.yape} (${r.name})`);
    if (r.plin) lines.push(`- Plin: ${r.plin} (${r.name})`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

/* ---------- Public API ---------- */
async function sendBookingEmails({ booking, pkg }) {
  const transporter = ensureTransporter();

  const from = getFromAddress();
  const replyTo = process.env.SMTP_REPLY_TO || process.env.CONTACT_TO || process.env.ADMIN_EMAIL;

  const toAdmin = process.env.CONTACT_TO || process.env.ADMIN_EMAIL || "admin@turismo.pe";
  const bcc = process.env.CONTACT_BCC
    ? String(process.env.CONTACT_BCC)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const brand = process.env.BRAND_NAME || "Turismo Perú";
  const company = process.env.COMPANY_NAME || brand;
  const site = getWebsiteBase();

  const status = booking?.status || "recibida";
  const reservationId = booking?.reservationId || booking?._id?.toString() || "N/A";
  const pkgTitle = pkg?.title || booking?.packageMeta?.title || "Paquete";
  const currency = booking?.currency || pkg?.currency || "PEN";
  const when = fmtWhenISO(booking?.date, "es-PE");

  const adults = booking?.people?.adults || 0;
  const children = booking?.people?.children || 0;

  const custName = booking?.customer?.name || "";
  const custEmail = booking?.customer?.email || "";
  const custPhone = booking?.customer?.phone || "";
  const custCountry = booking?.customer?.country || "";
  const notes = booking?.notes || "";

  const unitStr = fmtMoney(booking?.unitPrice);
  const totalStr = fmtMoney(booking?.totalPrice);

  const subjectUser = `Reserva recibida – ${pkgTitle} | ${brand} (${reservationId})`;
  const subjectAdmin = `Nueva reserva – ${pkgTitle} (${custName || "Cliente"}) (${reservationId})`;

  const payment = getPaymentInfo();
  const waNum = payment.waDefault;
  const waUrl = paymentWA(waNum);

  const logoAtt = getLogoAttachment();

  const paymentHtml = renderPaymentHTML(payment);
  const paymentTxt = renderPaymentText(payment);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif; line-height:1.35; color:#111;">
    <div style="max-width:700px;margin:0 auto;border:1px solid #eee;border-radius:14px;overflow:hidden;">
      <div style="padding:18px 20px;background:#0b1220;color:#fff;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${
            logoAtt
              ? `<img src="cid:brandlogo@vicuadvent" alt="${esc(brand)}" style="width:44px;height:44px;border-radius:10px;background:#fff;padding:6px;object-fit:contain;">`
              : ""
          }
          <div>
            <div style="font-size:16px;font-weight:700;margin:0;">${esc(brand)}</div>
            <div style="opacity:.9;font-size:12px;margin-top:2px;">Confirmación automática de reserva</div>
          </div>
        </div>
      </div>

      <div style="padding:18px 20px;">
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:14px;margin:0;"><b>Estado:</b> ${esc(status)}</div>
            <div style="font-size:14px;margin:0;"><b>ID:</b> ${esc(reservationId)}</div>
          </div>
          ${
            waUrl
              ? `<a href="${waUrl}" style="text-decoration:none;background:#25D366;color:#fff;padding:10px 12px;border-radius:10px;font-weight:700;font-size:13px;">Escribir por WhatsApp</a>`
              : ""
          }
        </div>

        <h2 style="margin:16px 0 6px 0;font-size:18px;">¡Reserva recibida!</h2>
        <p style="margin:0 0 14px 0;color:#333;">
          En breve te contactaremos para confirmar disponibilidad. Para acelerar la confirmación, puedes realizar el pago y enviar el comprobante.
        </p>

        <h3 style="margin:16px 0 8px 0;font-size:15px;">🧭 Detalle de la reserva</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Paquete</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${esc(pkgTitle)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Fecha del tour</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${esc(when)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Tipo</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${booking?.tourType === "exclusive" ? "Exclusivo" : "Colectivo"}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Pasajeros</b></td><td style="padding:8px;border-bottom:1px solid #eee;">Adultos ${esc(adults)} / Niños ${esc(children)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Precio unitario</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${unitStr} ${esc(currency)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Total estimado</b></td><td style="padding:8px;border-bottom:1px solid #eee;"><b>${totalStr} ${esc(currency)}</b></td></tr>
        </table>

        <h3 style="margin:16px 0 8px 0;font-size:15px;">👤 Datos del cliente</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Nombre</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${esc(custName)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Email</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${esc(custEmail)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Teléfono</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${esc(custPhone)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>País</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${esc(custCountry)}</td></tr>
        </table>

        ${
          notes
            ? `<div style="margin-top:12px;font-size:13px;"><b>Notas:</b><div style="margin-top:4px;color:#333;">${esc(notes)}</div></div>`
            : ""
        }

        <h3 style="margin:16px 0 8px 0;font-size:15px;">💳 Datos de pago (Perú)</h3>
        ${paymentHtml}
      </div>

      <div style="padding:14px 20px;background:#f7f7f7;color:#555;font-size:12px;">
        <div><b>${esc(company)}</b></div>
        <div>Web: <a href="${site}" style="color:#0b4bff;text-decoration:none;">${site}</a></div>
        <div style="margin-top:6px;">Si no solicitaste esta reserva, ignora este mensaje.</div>
        <div style="margin-top:10px;">© 2026 ${esc(company)}</div>
      </div>
    </div>
  </div>
  `;

  const text =
`Reserva ${status}
ID: ${reservationId}
Paquete: ${pkgTitle}
Fecha del tour: ${when}
Tipo: ${booking?.tourType === "exclusive" ? "Exclusivo" : "Colectivo"}
Pasajeros: Adultos ${adults} / Niños ${children}
Precio unitario: ${unitStr} ${currency}
Total estimado: ${totalStr} ${currency}

Cliente: ${custName} (${custEmail})
Tel: ${custPhone}
País: ${custCountry}
Notas: ${notes || "-"}

Pago (Perú)
${paymentTxt}

Adjuntamos el brochure del paquete.
${waUrl ? `WhatsApp: ${waUrl}` : ""}`.trim();

  // Attachments: brochure + logo (CID)
  const brochureBuffer = await fetchBrochurePDFBuffer(pkg?._id || booking?.package);

  const attachments = [];
  if (logoAtt) attachments.push(logoAtt);

  if (brochureBuffer) {
    attachments.push({
      filename: `brochure-${pkg?.slug || booking?.packageMeta?.slug || "paquete"}.pdf`,
      content: brochureBuffer,
      contentType: "application/pdf",
    });
  }

  const userMsg = {
    from,
    to: custEmail,
    subject: subjectUser,
    html,
    text,
    attachments,
    replyTo,
  };

  const adminMsg = {
    from,
    to: toAdmin,
    bcc: bcc.length ? bcc : undefined,
    subject: subjectAdmin,
    html,
    text,
    attachments,
    ...(custEmail ? { replyTo: `${custName} <${custEmail}>` } : {}),
  };

  const results = await Promise.allSettled([
    custEmail ? transporter.sendMail(userMsg) : Promise.resolve(),
    transporter.sendMail(adminMsg),
  ]);

  results.forEach((r, i) => {
    const tag = i === 0 ? "user" : "admin";
    if (r.status === "fulfilled") {
      console.log(`[mailer] ${tag} email sent`, r.value?.messageId || "");
    } else {
      console.warn(`[mailer] ${tag} email failed:`, r.reason?.message || r.reason);
    }
  });

  return results;
}

module.exports = { sendBookingEmails };
