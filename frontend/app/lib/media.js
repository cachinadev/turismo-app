<<<<<<< HEAD
// frontend/app/lib/media.js

// Normalize base URL (strip trailing slashes)
function normalizeBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

export const API_BASE = normalizeBase(
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000" // dev fallback
);

// In production force uploads to api.vicuadvent.com
const UPLOADS_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.vicuadvent.com"
    : API_BASE;

/**
 * Resolve media URLs consistently across environments
 * - Keeps absolute external URLs untouched
 * - Rewrites localhost/127.* to API_BASE
 * - Forces /uploads/* to UPLOADS_BASE
 */
export function mediaUrl(u = "") {
  if (!u) return "";

  // Absolute data/blob URLs
  if (/^(data:|blob:)/i.test(u)) return u;

  // Absolute http(s) URLs
  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);

      // Rewrite localhost → API_BASE
      if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
        return `${API_BASE}${parsed.pathname}`;
      }

      // If it's already on api.vicuadvent.com or another host → leave as-is
      return u;
    } catch {
      return u;
    }
  }

  // Relative uploads path
  if (u.startsWith("/uploads")) {
    return `${UPLOADS_BASE}${u}`;
  }

  // Generic relative fallback
  return `${API_BASE}/${u.replace(/^\/+/, "")}`;
}
=======
// frontend/app/lib/media.js

// Normalize base URL (strip trailing slashes)
function normalizeBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

export const API_BASE = normalizeBase(
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000" // dev fallback
);

// In production force uploads to api.vicuadvent.com
const UPLOADS_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.vicuadvent.com"
    : API_BASE;

/**
 * Resolve media URLs consistently across environments
 * - Keeps absolute external URLs untouched
 * - Rewrites localhost/127.* to API_BASE
 * - Forces /uploads/* to UPLOADS_BASE
 */
export function mediaUrl(u = "") {
  if (!u) return "";

  // Absolute data/blob URLs
  if (/^(data:|blob:)/i.test(u)) return u;

  // Absolute http(s) URLs
  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);

      // Rewrite localhost → API_BASE
      if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
        return `${API_BASE}${parsed.pathname}`;
      }

      // If it's already on api.vicuadvent.com or another host → leave as-is
      return u;
    } catch {
      return u;
    }
  }

  // Relative uploads path
  if (u.startsWith("/uploads")) {
    return `${UPLOADS_BASE}${u}`;
  }

  // Generic relative fallback
  return `${API_BASE}/${u.replace(/^\/+/, "")}`;
}
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
