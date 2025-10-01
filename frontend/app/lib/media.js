// frontend/app/lib/media.js

// Normalize base URL (strip trailing slashes)
function normalizeBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

export const API_BASE = normalizeBase(
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000" // sensible dev fallback
);

export function mediaUrl(u = "") {
  if (!u) return "";

  // Absolute external URL (data/blob/http/https)
  if (/^(data:|blob:)/i.test(u)) return u;

  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);
      // If it's pointing to localhost or 127.*, rewrite to API_BASE
      if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
        return `${API_BASE}${parsed.pathname}`;
      }
      return u; // leave as-is for valid remote URLs
    } catch {
      return u;
    }
  }

  // If it's a relative /uploads/... path → prepend API_BASE
  if (u.startsWith("/uploads")) {
    return `${API_BASE}${u}`;
  }

  // Generic relative fallback
  return `${API_BASE}/${u.replace(/^\/+/, "")}`;
}
