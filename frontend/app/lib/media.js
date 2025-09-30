// app/lib/media.js

// Normalize base URL (strip trailing slashes)
function normalizeBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

export const API_BASE = normalizeBase(
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000" // sensible dev default
);

export function mediaUrl(u) {
  if (!u) return "";

  // Already absolute? (http/https/data/blob)
  if (/^(https?:|data:|blob:)/i.test(u)) return u;

  // Fall back to relative path under API_BASE
  return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}
