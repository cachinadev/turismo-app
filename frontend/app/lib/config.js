// frontend/app/lib/config.js
// Centralized, SSR-safe config for the frontend.
// Always export absolute, slash-trimmed bases (unless intentionally empty for same-origin proxying).

/** Utils **/
const stripSlash = (s) => String(s || "").replace(/\/+$/, "");
const ensureProtocol = (u) => {
  if (!u) return "";
  // If it's already absolute (http/https), keep it
  if (/^https?:\/\//i.test(u)) return u;
  // If looks like host:port or bare host, default to http
  if (/^[\w.-]+(?::\d+)?(\/.*)?$/.test(u)) return `http://${u}`;
  return u; // allow "/" or other custom values (handled by consumer)
};
const dropApiSuffix = (u) => String(u || "").replace(/\/api\/?$/i, "");

/** Environment (public) **/
const RAW_SITE = process.env.NEXT_PUBLIC_SITE_URL || "";
const RAW_API = process.env.NEXT_PUBLIC_API_URL || "";
const ENV_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
  process.env.NEXT_PUBLIC_WHATSAPP_OFFICIAL ||
  "+51953858267";

/** Derived bases **/
const ENV_SITE = stripSlash(ensureProtocol(RAW_SITE));

const apiRawLower = String(RAW_API || "").trim().toLowerCase();
const FORCE_SELF = apiRawLower === "self";

/**
 * ENV_API:
 * - '' when FORCE_SELF (same-origin proxy mode)
 * - otherwise an absolute URL (without trailing slash and without /api suffix)
 */
const ENV_API = FORCE_SELF
  ? ""
  : dropApiSuffix(stripSlash(ensureProtocol(RAW_API)));

/** SITE_URL: canonical site base (absolute) **/
export const SITE_URL =
  ENV_SITE ||
  (typeof window === "undefined"
    ? "http://localhost:3000"
    : stripSlash(window.location.origin));

/**
 * API_BASE:
 * - '' when using proxy mode (NEXT_PUBLIC_API_URL=self)
 * - otherwise uses NEXT_PUBLIC_API_URL
 * - fallback dev default: http://localhost:4000
 */
export const API_BASE = FORCE_SELF ? "" : (ENV_API || "http://localhost:4000");

/** Join a base + path safely */
export const withBase = (base, path = "") => {
  const p = String(path || "");
  if (!base) return p.startsWith("/") ? p : `/${p}`;
  const b = stripSlash(base);
  return `${b}${p.startsWith("/") ? "" : "/"}${p}`;
};

/** --- WhatsApp / Contact config --- **/
export const CONTACT_PHONE =
  process.env.NEXT_PUBLIC_CONTACT_PHONE_OFFICIAL ||
  process.env.NEXT_PUBLIC_CONTACT_PHONE ||
  ENV_WHATSAPP_NUMBER;

export const WHATSAPP_NUMBER = ENV_WHATSAPP_NUMBER || CONTACT_PHONE;

export const WHATSAPP_DEFAULT_MESSAGE =
  process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_MESSAGE ||
  "Hi! I would like more information.";

/** Helper: build a wa.me link */
export const buildWhatsAppLink = (
  phone = WHATSAPP_NUMBER,
  text = WHATSAPP_DEFAULT_MESSAGE
) => {
  const num = String(phone || "").replace(/[^\d]/g, ""); // digits only
  if (!num) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${num}${q}`;
};

/** Brand/company (optional convenience exports) **/
export const BRAND_NAME =
  process.env.NEXT_PUBLIC_BRAND_NAME || "Vicuña Adventures";
export const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME || "Vicuña Adventures";
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_EMAIL_SALES || "contact@vicuadvent.com";

/** Optional default export for legacy imports */
export default {
  SITE_URL,
  API_BASE,
  withBase,
  CONTACT_PHONE,
  WHATSAPP_DEFAULT_MESSAGE,
  buildWhatsAppLink,
  BRAND_NAME,
  COMPANY_NAME,
  CONTACT_EMAIL,
};
