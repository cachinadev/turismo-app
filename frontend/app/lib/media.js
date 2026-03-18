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

function stripApiSuffix(base) {
  return String(base || "").replace(/\/api\/?$/i, "");
}

// Uploads can live on the main domain (e.g. https://vicuadvent.com/uploads)
// Allow explicit override via NEXT_PUBLIC_UPLOADS_BASE.
const UPLOADS_BASE = normalizeBase(
  process.env.NEXT_PUBLIC_UPLOADS_BASE ||
  stripApiSuffix(API_BASE)
);

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
