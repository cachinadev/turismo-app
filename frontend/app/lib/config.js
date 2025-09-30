// frontend/app/lib/config.js
// Centralized, SSR-safe config for the frontend.
// Always export absolute, slash-trimmed bases (unless intentionally empty for same-origin proxying).

/** Utils **/
const stripSlash = (s) => String(s || '').replace(/\/+$/, '');
const ensureProtocol = (u) => {
  if (!u) return '';
  // If it's already absolute (http/https), keep it
  if (/^https?:\/\//i.test(u)) return u;
  // If looks like host:port or bare host, default to http
  if (/^[\w.-]+(?::\d+)?(\/.*)?$/.test(u)) return `http://${u}`;
  return u; // allow "/" or other custom values (handled by consumer)
};
const dropApiSuffix = (u) => String(u || '').replace(/\/api\/?$/i, '');

/** Environment (public) **/
const RAW_SITE = process.env.NEXT_PUBLIC_SITE_URL || '';
const RAW_API  = process.env.NEXT_PUBLIC_API_URL || '';

/** Derived bases (can be empty if you explicitly want same-origin proxying) **/
const ENV_SITE = stripSlash(ensureProtocol(RAW_SITE));
let ENV_API    = dropApiSuffix(stripSlash(ensureProtocol(RAW_API)));

// Special value to force same-origin proxy mode: NEXT_PUBLIC_API_URL=self
if ((process.env.NEXT_PUBLIC_API_URL || '').toLowerCase() === 'self') {
  ENV_API = ''; // so fetches like `${API_BASE}/api/...` become `/api/...`
}

/** SITE_URL: canonical site base (absolute) **/
export const SITE_URL =
  ENV_SITE ||
  (typeof window === 'undefined'
    ? 'http://localhost:3000'
    : stripSlash(window.location.origin));

/**
 * API_BASE: backend base (absolute or empty when using proxy).
 * Your code expects to call `${API_BASE}/api/...`.
 * - If you proxy API under the same origin: set `NEXT_PUBLIC_API_URL=self` and this becomes ''.
 * - Otherwise it defaults to http://localhost:4000 for dev.
 */
export const API_BASE =
  (ENV_API !== '' ? ENV_API : '') ||
  (typeof window === 'undefined' ? 'http://localhost:4000' : 'http://localhost:4000');

/** Join a base + path safely */
export const withBase = (base, path = '') =>
  `${stripSlash(base)}${String(path).startsWith('/') ? '' : '/'}${path}`;

/** --- WhatsApp / Contact config --- **/
export const CONTACT_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
  process.env.NEXT_PUBLIC_PHONE ||
  '+51 982397386';

export const WHATSAPP_DEFAULT_MESSAGE =
  process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_MESSAGE ||
  'Hi! I would like more information.';

/** Helper: build a wa.me link */
export const buildWhatsAppLink = (phone = CONTACT_PHONE, text = WHATSAPP_DEFAULT_MESSAGE) => {
  const num = String(phone || '').replace(/[^\d]/g, ''); // digits only
  if (!num) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${num}${q}`;
};

/** Brand/company (optional convenience exports) **/
export const BRAND_NAME    = process.env.NEXT_PUBLIC_BRAND_NAME    || 'Vicuña Adventures';
export const COMPANY_NAME  = process.env.NEXT_PUBLIC_COMPANY_NAME  || 'Vicuña Adventures';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_EMAIL_SALES   || 'contact@vicuadvent.com';

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
