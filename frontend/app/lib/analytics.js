// frontend/app/lib/analytics.js
import { API_BASE, withBase } from "@/app/lib/config";

const EVENTS_URL = withBase(API_BASE, "/api/events");

export function trackEvent(type, meta = {}, message = "") {
  if (typeof window === "undefined") return;
  const safeType = String(type || "").trim();
  if (!safeType) return;

  const payload = {
    type: safeType,
    message: message ? String(message).slice(0, 500) : undefined,
    meta: meta && typeof meta === "object" ? meta : undefined,
    path: window.location?.pathname || "",
    url: window.location?.href || "",
    referrer: document?.referrer || "",
  };

  const body = JSON.stringify(payload);

  try {
    if (navigator?.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(EVENTS_URL, blob);
      return;
    }
  } catch {
    // fallback to fetch
  }

  fetch(EVENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
