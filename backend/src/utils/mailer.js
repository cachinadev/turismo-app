// backend/src/utils/mailer.js
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');

let _transporter = null;

/* ---------- Helpers ---------- */
function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    (process.env.SMTP_USER || '').length &&
    (process.env.SMTP_PASS || '').length
  );
}

function getFromAddress() {
  return process.env.SMTP_FROM || `${process.env.BRAND_NAME || 'Turismo Perú'} <no-reply@turismo.pe>`;
}

function ensureTransporter() {
  if (_transporter) return _transporter;

  if (!isSmtpConfigured()) {
    _transporter = {
      async sendMail(opts) {
        console.log('[mailer] SMTP not configured; skipping sendMail.', {
          to: opts?.to,
          subject: opts?.subject,
        });
        return { messageId: 'stub-no-smtp' };
      },
      async verify() { return true; },
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
    () => console.log('[mailer] SMTP connection verified'),
    (err) => console.warn('[mailer] SMTP verify failed:', err?.message || err)
  );

  return _transporter;
}

function fmtPEN(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '-';
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtWhenISO(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleString('es-PE', { timeZone: 'America/Lima' });
  } catch {
    return '-';
  }
}

function esc(s) {
  return String(s || '');
}

/* ---------- PDF Generator ---------- */
function generateBookingPDF({ booking, pkg }) {
  const brand = process.env.BRAND_NAME || 'Turismo Perú';
  const company = process.env.COMPANY_NAME || brand;

  const doc = new PDFDocument({ margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  doc.fontSize(18).text(`${brand} – Confirmación de Reserva`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(14).text(`Paquete: ${pkg?.title || 'N/A'}`);
  doc.text(`Fecha del tour: ${fmtWhenISO(booking?.date)}`);
  doc.text(`Pasajeros: Adultos ${booking?.people?.adults || 0} / Niños ${booking?.people?.children || 0}`);
  doc.text(`Total estimado: ${fmtPEN(booking?.totalPrice)} ${pkg?.currency || 'PEN'}`);
  doc.moveDown();

  doc.fontSize(14).text('Datos del cliente:', { underline: true });
  doc.fontSize(12).text(`Nombre: ${booking?.customer?.name || ''}`);
  doc.text(`Email: ${booking?.customer?.email || ''}`);
  doc.text(`Teléfono: ${booking?.customer?.phone || ''}`);
  doc.text(`País: ${booking?.customer?.country || ''}`);
  doc.moveDown();

  if (booking?.notes) {
    doc.fontSize(14).text('Notas:');
    doc.fontSize(12).text(booking.notes);
    doc.moveDown();
  }

  doc.fontSize(10).fillColor('gray')
    .text(`Generado automáticamente por ${company}`, { align: 'center' });

  doc.end();
  return stream;
}

/* ---------- Public API ---------- */
async function sendBookingEmails({ booking, pkg }) {
  const transporter = ensureTransporter();

  const from = getFromAddress();
  const replyTo = process.env.SMTP_REPLY_TO || process.env.CONTACT_TO || process.env.ADMIN_EMAIL;

  const toAdmin = process.env.CONTACT_TO || process.env.ADMIN_EMAIL || 'admin@turismo.pe';
  const bcc = process.env.CONTACT_BCC
    ? String(process.env.CONTACT_BCC).split(',').map(s => s.trim())
    : [];

  const brand = process.env.BRAND_NAME || 'Turismo Perú';
  const company = process.env.COMPANY_NAME || brand;

  const status = booking?.status || 'recibida';
  const pkgTitle = pkg?.title || 'Paquete';
  const currency = pkg?.currency || 'PEN';
  const when = fmtWhenISO(booking?.date);
  const adults = booking?.people?.adults || 0;
  const children = booking?.people?.children || 0;
  const custName = booking?.customer?.name || '';
  const custEmail = booking?.customer?.email || '';
  const notes = booking?.notes || '';

  const totalStr = fmtPEN(booking?.totalPrice);

  const subjectUser  = `Reserva recibida: ${pkgTitle}`;
  const subjectAdmin = `Nueva reserva – ${pkgTitle} (${custName || 'Cliente'})`;

  const html = `
    <h2>Reserva ${esc(status)}</h2>
    <p><b>Paquete:</b> ${esc(pkgTitle)}</p>
    <p><b>Fecha del tour:</b> ${esc(when)}</p>
    <p><b>Pasajeros:</b> Adultos ${esc(adults)} / Niños ${esc(children)}</p>
    <p><b>Total estimado:</b> ${totalStr} ${esc(currency)}</p>
    <p><b>Cliente:</b> ${esc(custName)} (${esc(custEmail)})</p>
    <p><b>Notas:</b> ${esc(notes)}</p>
    <hr/>
    <p>Adjunto encontrarás tu confirmación en PDF.</p>
  `;

  const text =
`Reserva ${status}
Paquete: ${pkgTitle}
Fecha del tour: ${when}
Pasajeros: Adultos ${adults} / Niños ${children}
Total estimado: ${totalStr} ${currency}
Cliente: ${custName} (${custEmail})
Notas: ${notes}

Se adjunta confirmación en PDF.`;

  // Generate PDF once
  const pdfStream = generateBookingPDF({ booking, pkg });
  const pdfAttachment = {
    filename: `reserva-${pkg?.slug || 'paquete'}.pdf`,
    content: pdfStream,
    contentType: 'application/pdf',
  };

  const userMsg = {
    from,
    to: custEmail,
    subject: subjectUser,
    html,
    text,
    attachments: [pdfAttachment],
    replyTo,
  };

  const adminMsg = {
    from,
    to: toAdmin,
    bcc: bcc.length ? bcc : undefined,
    subject: subjectAdmin,
    html,
    text,
    attachments: [pdfAttachment],
    ...(custEmail ? { replyTo: `${custName} <${custEmail}>` } : {}),
  };

  const results = await Promise.allSettled([
    custEmail ? transporter.sendMail(userMsg) : Promise.resolve(),
    transporter.sendMail(adminMsg),
  ]);

  results.forEach((r, i) => {
    const tag = i === 0 ? 'user' : 'admin';
    if (r.status === 'fulfilled') {
      console.log(`[mailer] ${tag} email sent`, r.value?.messageId || '');
    } else {
      console.warn(`[mailer] ${tag} email failed:`, r.reason?.message || r.reason);
    }
  });

  return results;
}

module.exports = { sendBookingEmails };
 