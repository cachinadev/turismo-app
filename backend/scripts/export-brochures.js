// scripts/export-brochures.js
/**
 * Export all package brochures as PDF into ./brochures
 *
 * ✅ Supports:
 * - Node 18+ (global fetch) OR node-fetch fallback
 * - pagination (fetches ALL packages, not only 100)
 * - preview=1 (includes inactive) + optional active filter
 * - retries + timeouts
 * - safe filenames
 * - optional auth token for protected brochure endpoints
 *
 * ENV:
 *  API_BASE=http://localhost:4000            (backend base)
 *  ADMIN_TOKEN=...                           (optional, if brochure route is protected)
 *  OUT_DIR=./brochures                       (optional)
 *  LIMIT=100                                 (optional page size)
 *  PREVIEW=1                                 (default 1)
 *  ACTIVE=true|false                         (optional, only if PREVIEW=1)
 *  ONLY_SLUG=ejemplo-de-paquete              (optional: export only one)
 */

const fs = require("fs");
const path = require("path");

// Node 18+ has fetch; otherwise fallback to node-fetch
let _fetch = global.fetch;
if (!_fetch) {
  // eslint-disable-next-line import/no-extraneous-dependencies
  _fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
}

const API_BASE = (process.env.API_BASE || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const TOKEN = String(process.env.ADMIN_TOKEN || "").trim();

const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.cwd(), process.env.OUT_DIR)
  : path.resolve(__dirname, "../brochures");

const LIMIT = Math.min(200, Math.max(1, parseInt(process.env.LIMIT || "100", 10) || 100));
const PREVIEW = String(process.env.PREVIEW || "1").toLowerCase() !== "0"; // default true
const ACTIVE = process.env.ACTIVE !== undefined ? String(process.env.ACTIVE).toLowerCase() : null;
const ONLY_SLUG = String(process.env.ONLY_SLUG || "").trim();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeFilename(name) {
  const s = String(name || "").trim();
  if (!s) return "file";
  // keep letters, numbers, dash, underscore, dot
  return s
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120) || "file";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await _fetch(url, { ...options, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url, options = {}, timeoutMs = 20000) {
  const res = await fetchWithTimeout(url, options, timeoutMs);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = json?.message || json?.error || text || res.statusText;
    const err = new Error(`HTTP ${res.status} ${res.statusText} - ${msg}`);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

async function fetchBuffer(url, options = {}, timeoutMs = 30000) {
  const res = await fetchWithTimeout(url, options, timeoutMs);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${res.statusText} - ${text || "failed"}`);
    err.status = res.status;
    throw err;
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function withRetries(fn, { retries = 2, baseDelayMs = 700 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      const wait = baseDelayMs * Math.pow(2, attempt);
      if (attempt < retries) await sleep(wait);
    }
  }
  throw lastErr;
}

async function listAllPackages() {
  // supports API response: { page, limit, total, pages, items }
  const all = [];
  let page = 1;

  while (true) {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(LIMIT));
    if (PREVIEW) qs.set("preview", "1");
    if (PREVIEW && (ACTIVE === "true" || ACTIVE === "false")) qs.set("active", ACTIVE);

    const url = `${API_BASE}/api/packages?${qs.toString()}`;
    const data = await fetchJson(url);

    const items = Array.isArray(data?.items) ? data.items : [];
    all.push(...items);

    const pages = Number(data?.pages || 0);
    if (pages && page >= pages) break;

    // if API doesn't provide pages reliably, stop when less than limit
    if (!pages && items.length < LIMIT) break;

    page += 1;
    if (page > 5000) break; // safety
  }

  if (ONLY_SLUG) {
    return all.filter((p) => String(p.slug || "").trim() === ONLY_SLUG);
  }
  return all;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const items = await listAllPackages();
  console.log(`Exporting ${items.length} brochures from ${API_BASE} → ${OUT_DIR}`);

  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
  let okCount = 0;
  let failCount = 0;

  for (const p of items) {
    const id = p._id || p.id;
    const slug = p.slug || id;
    if (!id) continue;

    // brochure endpoint (your backend should implement it)
    const url = `${API_BASE}/api/brochures/${id}.pdf`;

    const file = path.join(OUT_DIR, `${safeFilename(slug)}.pdf`);

    try {
      const buf = await withRetries(() => fetchBuffer(url, { headers }, 45000), { retries: 2 });
      fs.writeFileSync(file, buf);
      okCount++;
      console.log("✓", file);
    } catch (e) {
      failCount++;
      console.warn("✗ Failed:", { id, slug, title: p.title, err: e.message });
      continue;
    }
  }

  console.log(`Done. OK=${okCount} Failed=${failCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
