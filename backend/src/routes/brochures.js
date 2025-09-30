// backend/src/routes/brochures.js
const express = require('express');
const puppeteer = require('puppeteer');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * GET /api/brochures/:id.pdf
 * Renders the Next.js brochure page and returns a PDF with branding
 */
router.get('/:id.pdf', auth('admin'), async (req, res) => {
  const { id } = req.params;

  const origin =
    process.env.PUBLIC_BASE_URL ||
    `${req.protocol}://${req.get('host')}`;
  const url = `${origin}/admin/packages/${encodeURIComponent(id)}/brochure`;

  const brandName = process.env.BRAND_NAME || 'Vicuña Adventures';
  const companyName =
    process.env.COMPANY_NAME || 'Vicuña Adventures S.A.C.';
  const companySite =
    process.env.COMPANY_WEBSITE || 'https://www.vicuadvent.com';
  const logoUrl = `${origin}/public/logo.png`; // <- ensure logo.png exists in frontend/public/

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new',
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <style>
          .brochure-header {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            color: #1d4ed8;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 6px 0;
          }
          .brochure-header img {
            height: 24px;
          }
          .brochure-header span {
            font-weight: bold;
            font-size: 14px;
          }
        </style>
        <div class="brochure-header">
          <img src="${logoUrl}" alt="logo" />
          <span>${brandName}</span>
        </div>
      `,
      footerTemplate: `
        <style>
          .brochure-footer {
            font-family: Arial, sans-serif;
            font-size: 10px;
            color: #444;
            width: 100%;
            padding: 4px 0;
            text-align: center;
          }
          .brochure-footer a {
            color: #1d4ed8;
            text-decoration: none;
          }
        </style>
        <div class="brochure-footer">
          © ${new Date().getFullYear()} ${companyName} • 
          <a href="${companySite}">${companySite.replace(/^https?:\/\//, '')}</a>
        </div>
      `,
      margin: { top: '40mm', right: '16mm', bottom: '20mm', left: '16mm' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="brochure-${id}.pdf"`
    );
    res.send(pdf);
  } catch (err) {
    console.error('PDF export error', err);
    res
      .status(500)
      .json({ message: 'Failed to generate brochure PDF', error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

module.exports = router;
