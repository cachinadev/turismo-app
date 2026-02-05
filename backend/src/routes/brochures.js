// backend/src/routes/brochures.js
const express = require("express");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { v4: uuid } = require("uuid");
const Package = require("../models/Package");
const auth = require("../middleware/auth");
const { logAdminAction } = require("../utils/adminLog");

const router = express.Router();

// ---------- PDF upload (admin) ----------
const brochuresDir = path.join(__dirname, "../../public/uploads/brochures");
if (!fs.existsSync(brochuresDir)) fs.mkdirSync(brochuresDir, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, brochuresDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".pdf").toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

function pdfFileFilter(_req, file, cb) {
  const ext = (path.extname(file.originalname) || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  if (ext !== ".pdf" || mime !== "application/pdf") {
    const err = new Error("Formato no permitido (solo PDF).");
    err.status = 400;
    return cb(err);
  }
  return cb(null, true);
}

const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  message: { error: "Demasiadas cargas, intente más tarde." },
});

router.post(
  "/upload",
  auth("admin"),
  uploadLimiter,
  uploadPdf.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "PDF requerido" });

      const base = getBaseUrl(req);
      const relativePath = `/uploads/brochures/${file.filename}`;
      const url = `${base}${relativePath}`;

      await logAdminAction(req, {
        action: "upload_brochure_pdf",
        entity: "brochure",
        meta: { filename: file.originalname, size: file.size },
      });

      return res.status(201).json({
        file: {
          url,
          relativePath,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
        },
      });
    } catch (err) {
      return res.status(500).json({ message: "No se pudo subir el brochure" });
    }
  }
);

function getBaseUrl(req) {
  const envBase = String(process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (envBase) return envBase;
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http")
    .toString()
    .split(",")[0]
    .trim();
  return `${proto}://${req.get("host")}`;
}

function getFrontendBase(req) {
  const env = String(process.env.FRONTEND_BASE_URL || "").replace(/\/+$/, "");
  if (env) return env;
  const site = String(process.env.COMPANY_WEBSITE || "").replace(/\/+$/, "");
  if (site) return site;
  const host = String(req.get("host") || "");
  if (host.includes(":4000")) return `http://${host.replace(":4000", ":3000")}`;
  return `http://${host}`;
}

function buildPackageUrl(frontendBase, pkg) {
  const tpl = String(process.env.BROCHURE_PACKAGE_PATH_TEMPLATE || "/es/packages/:slug");
  const slug = pkg?.slug || pkg?._id?.toString() || "";
  const id = pkg?._id?.toString() || "";
  const path = tpl
    .replace(":slug", encodeURIComponent(slug))
    .replace(":id", encodeURIComponent(id));
  return `${frontendBase}${path.startsWith("/") ? path : `/${path}`}`;
}

function toAbsolute(base, u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${base}${p}`;
}

function resolveBrochurePath(relPath) {
  if (!relPath || typeof relPath !== "string") return null;
  if (!relPath.startsWith("/uploads/")) return null;
  const publicDir = path.join(__dirname, "../../public");
  const abs = path.join(publicDir, relPath);
  if (!abs.startsWith(publicDir)) return null;
  return fs.existsSync(abs) ? abs : null;
}

function esc(s) {
  return String(s || "").trim();
}

function listOrDash(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return ["-"];
  return arr.map((x) => esc(x));
}

function fmtWhenISO(dateStr, locale = "es-PE") {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString(locale, { timeZone: "America/Lima" });
  } catch {
    return "-";
  }
}

async function fetchImageBuffer(url) {
  const f = global.fetch;
  if (!f || !url) return null;
  try {
    const res = await f(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function getLogoPath() {
  const p = String(process.env.LOGO_PATH || "").trim();
  const guess = path.resolve(__dirname, "../../../frontend/public/icon.png");
  const candidate = p || guess;
  try {
    if (candidate && fs.existsSync(candidate)) return candidate;
  } catch {}
  return null;
}

async function renderBrochurePDF({ pkg, baseUrl, frontendBase }) {
  const brand = process.env.BRAND_NAME || "Vicuña Adventures";
  const company = process.env.COMPANY_NAME || brand;
  const brandColor = "#0086C0";
  const dark = "#0b1220";
  const muted = "#64748b";

  const doc = new PDFDocument({ margin: 40 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

  const base = baseUrl;
  const logoPath = getLogoPath();
  const imgUrl =
    (Array.isArray(pkg.media) ? pkg.media.find((m) => m?.type === "image")?.url : "") ||
    (Array.isArray(pkg.media) ? pkg.media[0]?.url : "");
  const absImg = toAbsolute(base, imgUrl);
  const imgBuffer = await fetchImageBuffer(absImg);

  const sectionTitle = (label) => {
    doc.moveDown(0.6);
    doc.fontSize(13).fillColor(dark).text(label, { underline: true });
    doc.moveDown(0.3);
  };

  const keyValueRow = (label, value, x, y, w) => {
    doc.fontSize(9).fillColor(muted).text(label, x, y, { width: w });
    doc.fontSize(11).fillColor(dark).text(value || "-", x, y + 12, { width: w });
  };

  const addList = (arr) => {
    listOrDash(arr).forEach((x) => doc.text(`• ${x}`));
  };

  // ================== SINGLE-PAGE LAYOUT (A4) ==================
  doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
  const heroH = 190;

  if (imgBuffer) {
    try {
      doc.image(imgBuffer, 0, 0, { width: pageWidth, height: heroH });
    } catch {}
  }
  doc.rect(0, 0, pageWidth, heroH).fillOpacity(0.25).fill("#000").fillOpacity(1);

  if (logoPath) {
    try {
      doc.image(logoPath, 40, 24, { width: 34, height: 34 });
    } catch {}
  }
  doc.fontSize(16).fillColor("#fff").text(brand, 80, 30, { align: "left" });
  doc.fontSize(24).fillColor("#fff").text(esc(pkg.title || "Paquete"), 40, 110, { width: contentWidth });
  doc.fontSize(11).fillColor("#e2e8f0").text(`${esc(pkg.city || "")}${pkg.country ? `, ${esc(pkg.country)}` : ""}`, 40, 145);

  const badgeY = heroH - 28;
  doc.roundedRect(40, badgeY, 130, 22, 11).fill(brandColor);
  doc.fillColor("#fff").fontSize(9).text("Tour Oficial", 40, badgeY + 6, { width: 130, align: "center" });
  doc.roundedRect(180, badgeY, 150, 22, 11).fill("#0e374a");
  doc.fillColor("#fff").fontSize(9).text("Reserva Segura", 180, badgeY + 6, { width: 150, align: "center" });

  const bodyTop = heroH + 18;
  let y = bodyTop;

  // Summary
  doc.fontSize(12).fillColor(dark).text("Resumen", 40, y);
  y += 16;
  doc.fontSize(9).fillColor(dark).text(esc(pkg.description || "-").slice(0, 600), 40, y, {
    width: contentWidth,
    height: 70,
    ellipsis: true,
  });
  y += 70;

  // 3-column content block
  doc.fontSize(12).fillColor(dark).text("Detalles clave", 40, y);
  y += 14;

  const leftX = 40;
  const colGap = 16;
  const colW = (contentWidth - colGap * 2) / 3;
  const col1 = leftX;
  const col2 = leftX + colW + colGap;
  const col3 = leftX + (colW + colGap) * 2;
  const rowY = y;

  // Column 1: Key details
  keyValueRow("Duracion", `${esc(pkg.durationHours || "-")}h`, col1, rowY, colW);
  keyValueRow("Idiomas", Array.isArray(pkg.languages) ? pkg.languages.join(", ") : "-", col1, rowY + 34, colW);
  keyValueRow("Edad minima", esc(pkg.ageMin || "-"), col1, rowY + 68, colW);
  keyValueRow("Horarios", Array.isArray(pkg.startTimes) ? pkg.startTimes.join(", ") : "-", col1, rowY + 102, colW);

  // Column 2: Key details
  keyValueRow("Tamano del grupo", `${esc(pkg.minPeople || "-")}–${esc(pkg.maxPeople || "-")}`, col2, rowY, colW);
  keyValueRow("Disponibilidad", Array.isArray(pkg.availableDays) ? pkg.availableDays.join(", ") : "-", col2, rowY + 34, colW);
  keyValueRow("Dificultad", esc(pkg.difficulty || "-"), col2, rowY + 68, colW);
  keyValueRow("Maps", pkg.mapsUrl ? "Ver en Maps" : "-", col2, rowY + 102, colW);

  // Maps button (visual)
  if (pkg.mapsUrl) {
    const btnY = rowY + 124;
    const btnW = colW;
    const btnH = 16;
    doc.roundedRect(col2, btnY, btnW, btnH, 8).fill(brandColor);
    // simple pin icon
    doc
      .fillColor("#fff")
      .fontSize(9)
      .text("📍", col2 + 6, btnY + 4);
    doc
      .fillColor("#fff")
      .fontSize(9)
      .text("Ver en Maps", col2 + 18, btnY + 4, { width: btnW - 22 });
  }

  // Column 3: Itinerary (compact)
  doc.fontSize(11).fillColor(dark).text("Itinerario", col3, rowY);
  doc.fontSize(9).fillColor(dark);
  const itinerary = Array.isArray(pkg.itinerary) ? pkg.itinerary.slice(0, 5) : [];
  let iy = rowY + 14;
  if (itinerary.length === 0) {
    doc.text("-", col3, iy, { width: colW });
  } else {
    itinerary.forEach((step, idx) => {
      const dayLabel = step.dayLabel || (step.dayNumber ? `Dia ${step.dayNumber}` : `Paso ${idx + 1}`);
      const time = step.time || step.startTime || "-";
      const title = step.title || step.name || "-";
      doc.fillColor(brandColor).text(`${dayLabel} · ${time}`, col3, iy, { width: colW });
      iy += 9;
      doc.fillColor(dark).text(`${title}`, col3, iy, { width: colW });
      iy += 11;
      if (iy > rowY + 115) return;
    });
  }

  y = rowY + 140;

  // Row: Includes / Excludes / Recommendations (3 columns)
  doc.fontSize(12).fillColor(dark).text("Incluye", col1, y);
  doc.fontSize(12).fillColor(dark).text("No incluye", col2, y);
  doc.fontSize(12).fillColor(dark).text("Recomendaciones", col3, y);
  y += 14;

  doc.fontSize(9).fillColor(dark);
  const inc = listOrDash(pkg.includes).slice(0, 6);
  const exc = listOrDash(pkg.excludes).slice(0, 6);
  const rec = listOrDash(pkg.recommendations).slice(0, 6);
  inc.forEach((x, i) => doc.text(`• ${x}`, col1, y + i * 10, { width: colW }));
  exc.forEach((x, i) => doc.text(`• ${x}`, col2, y + i * 10, { width: colW }));
  rec.forEach((x, i) => doc.text(`• ${x}`, col3, y + i * 10, { width: colW }));

  y += 80;

  // QR + Contact row
  const pkgUrl = buildPackageUrl(frontendBase, pkg);
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(pkgUrl, { width: 120, margin: 1 });
  } catch {
    qrBuffer = null;
  }
  const qrX = 40;
  const qrY = pageHeight - 170;
  if (qrBuffer) {
    doc.image(qrBuffer, qrX, qrY, { width: 100 });
    const shortUrl = pkgUrl.replace(/^https?:\/\//, "");
    doc.fontSize(8).fillColor("#2563eb").text(shortUrl, qrX, qrY + 105, { width: 140 });
  }

  const contactX = 200;
  const contactY = pageHeight - 165;
  doc.fontSize(10).fillColor(dark).text("Contacto", contactX, contactY);
  doc.fontSize(9).fillColor(dark).text(`Empresa: ${company}`, contactX, contactY + 14);
  if (process.env.COMPANY_WEBSITE) doc.text(`Web: ${process.env.COMPANY_WEBSITE}`, contactX, contactY + 26);
  if (process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL) {
    doc.text(`Email: ${process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL}`, contactX, contactY + 38);
  }
  if (process.env.CONTACT_PHONE || process.env.WHATSAPP_NUMBER) {
    doc.text(`Telefono: ${process.env.CONTACT_PHONE || process.env.WHATSAPP_NUMBER}`, contactX, contactY + 50);
  }

  // Footer line at the very bottom
  const footerText = `Generado automáticamente por ${company} · ${process.env.COMPANY_WEBSITE || ""}`;
  doc.fontSize(9).fillColor("gray").text(footerText, 40, pageHeight - 28, { width: contentWidth, align: "center" });

  doc.end();

  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

router.get("/:id.pdf", async (req, res) => {
  const { id } = req.params;
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const pkg = isObjectId
      ? await Package.findById(id).lean()
      : await Package.findOne({ slug: id }).lean();

    if (!pkg) return res.status(404).json({ message: "Paquete no encontrado" });

    const storedPath = resolveBrochurePath(pkg?.brochurePdf?.relativePath || "");
    if (storedPath) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="brochure-${esc(pkg.slug || id)}.pdf"`);
      return res.sendFile(storedPath);
    }

    const baseUrl = getBaseUrl(req);
    const frontendBase = getFrontendBase(req);
    const pdf = await renderBrochurePDF({ pkg, baseUrl, frontendBase });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="brochure-${esc(pkg.slug || id)}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error("[brochures] error:", err);
    res.status(500).json({ message: "No se pudo generar el brochure" });
  }
});

module.exports = router;
