// backend/src/routes/brochures.js
const express = require("express");
const puppeteer = require("puppeteer");
const router = express.Router();

/**
 * GET /api/brochures/:id.pdf
 * Public brochure PDF generator (NO auth) so it can be attached to booking emails.
 *
 * Renders a Next.js page and returns PDF.
 * - In dev: FRONTEND_BASE_URL=http://localhost:3000
 * - In prod: FRONTEND_BASE_URL=https://www.vicuadvent.com
 *
 * IMPORTANT:
 * 1) Your Next.js route MUST exist and be public:
 *    /[locale]/admin/packages/:id/brochure  (if it is behind admin guard, PDF will be "not found")
 *    OR create a public route like: /[locale]/brochure/:id
 * 2) Logo URL must point to a real public asset in frontend/public (e.g. /icon.png)
 */

function normalizeOrigin(o = "") {
  return String(o || "").replace(/\/+$/, "");
}

function getFrontendBase(req) {
  // FRONTEND_BASE_URL should be your Next.js site (not the API)
  // Example: http://localhost:3000  /  https://www.vicuadvent.com
  const env = normalizeOrigin(process.env.FRONTEND_BASE_URL);
  if (env) return env;

  // fallback: try REFERER origin if present, else same host
  const ref = String(req.get("referer") || "");
  if (ref) {
    try {
      const u = new URL(ref);
      return normalizeOrigin(`${u.protocol}//${u.host}`);
    } catch {
      // ignore
    }
  }

  return normalizeOrigin(`${req.protocol}://${req.get("host")}`);
}

function getPublicLogoUrl(frontendBase) {
  // Put your real logo in frontend/public/icon.png
  // Next serves it as: https://site.com/icon.png
  const p = String(process.env.BROCHURE_LOGO_PATH || "/icon.png").trim();
  return `${normalizeOrigin(frontendBase)}${p.startsWith("/") ? p : `/${p}`}`;
}

function safeFilename(s) {
  return String(s || "brochure")
    .replace(/[^\w\-]+/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "")
    .slice(0, 80);
}

/**
 * Choose which page to render.
 * Prefer a PUBLIC brochure page, not admin-guarded.
 *
 * You can set BROCHURE_PATH_TEMPLATE in env:
 *  - "/en/brochure/:id"
 *  - "/en/admin/packages/:id/brochure" (ONLY if it is public / not guarded)
 */
function buildBrochureUrl(frontendBase, id) {
  const tpl = String(process.env.BROCHURE_PATH_TEMPLATE || "/en/admin/packages/:id/brochure");
  const path = tpl.replace(":id", encodeURIComponent(id));
  return `${normalizeOrigin(frontendBase)}${path.startsWith("/") ? path : `/${path}`}`;
}

/* -------------------------------------------------------
 * GET /api/brochures/:id.pdf
 * ----------------------------------------------------- */
router.get("/:id.pdf", async (req, res) => {
  const { id } = req.params;

  const frontendBase = getFrontendBase(req);
  const url = buildBrochureUrl(frontendBase, id);

  const brandName = process.env.BRAND_NAME || "Vicuña Adventures";
  const companyName = process.env.COMPANY_NAME || "Vicuña Adventures S.A.C.";
  const companySite = process.env.COMPANY_WEBSITE || "https://www.vicuadvent.com";
  const logoUrl = getPublicLogoUrl(frontendBase);

  const timeoutMs = Number(process.env.BROCHURE_TIMEOUT_MS || 70000);

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      headless: "new",
    });

    const page = await browser.newPage();

    // Good default UA
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Avoid infinite hangs
    page.setDefaultNavigationTimeout(timeoutMs);
    page.setDefaultTimeout(timeoutMs);

    // Helpful for debugging (uncomment if needed)
    // page.on("console", (msg) => console.log("[brochure page console]", msg.text()));

    // Go to the brochure page
    const resp = await page.goto(url, { waitUntil: "networkidle2" });

    // If Next page returns 404/500, fail clearly
    const status = resp?.status?.() ?? 0;
    if (status >= 400) {
      const html = await page.content().catch(() => "");
      console.warn("[brochures] render error status:", status, "url:", url);
      return res.status(502).json({
        message: "Failed to render brochure page",
        status,
        url,
        hint:
          "If your brochure page is admin-guarded, make a public brochure route (recommended) " +
          "and set BROCHURE_PATH_TEMPLATE=/en/brochure/:id",
        htmlPreview: html ? html.slice(0, 500) : "",
      });
    }

    // Wait for a marker that your page is ready (recommended)
    // In your Next brochure page, add: <div id="brochure-ready" />
    // If you don't have it, we just continue.
    await page.waitForSelector("#brochure-ready", { timeout: 8000 }).catch(() => {});

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <style>
          .brochure-header {
            width: 100%;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #0b1220;
            padding: 8px 0 0 0;
          }
          .row {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }
          .logo {
            height: 22px;
            width: 22px;
            border-radius: 6px;
            object-fit: contain;
          }
          .brand {
            font-weight: 700;
            letter-spacing: .2px;
          }
          .line {
            margin-top: 6px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
        <div class="brochure-header">
          <div class="row">
            <img class="logo" src="${logoUrl}" />
            <div class="brand">${brandName}</div>
          </div>
          <div class="line"></div>
        </div>
      `,
      footerTemplate: `
        <style>
          .brochure-footer {
            width: 100%;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9px;
            color: #475569;
            padding: 0 0 10px 0;
          }
          .row {
            width: 100%;
            display:flex;
            justify-content: space-between;
            align-items:center;
            padding: 0 18px;
          }
          a { color: #2563eb; text-decoration: none; }
          .muted { color: #94a3b8; }
        </style>
        <div class="brochure-footer">
          <div class="row">
            <div>© ${new Date().getFullYear()} ${companyName}</div>
            <div class="muted">
              <a href="${companySite}">${String(companySite).replace(/^https?:\/\//, "")}</a>
              &nbsp;•&nbsp; Página <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>
          </div>
        </div>
      `,
      margin: { top: "28mm", right: "14mm", bottom: "18mm", left: "14mm" },
    });

    const filename = `brochure-${safeFilename(id)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    console.error("[brochures] PDF export error:", err);
    res.status(500).json({
      message: "Failed to generate brochure PDF",
      error: err?.message || String(err),
      url,
      frontendBase,
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

module.exports = router;
