// backend/src/utils/adminLog.js
const AdminAction = require("../models/AdminAction");

async function logAdminAction(req, { action, entity, entityId, meta } = {}) {
  try {
    if (!action) return;
    const actor = req.user || {};
    const safeMeta = meta && typeof meta === "object" ? meta : undefined;

    await AdminAction.create({
      action: String(action).slice(0, 80),
      entity: entity ? String(entity).slice(0, 80) : undefined,
      entityId: entityId ? String(entityId).slice(0, 120) : undefined,
      meta: safeMeta,
      actor: {
        id: actor.id ? String(actor.id) : undefined,
        email: actor.email ? String(actor.email) : undefined,
        name: actor.name ? String(actor.name) : undefined,
        role: actor.role ? String(actor.role) : undefined,
      },
      path: String(req.originalUrl || req.path || "").slice(0, 300) || undefined,
      method: String(req.method || "").slice(0, 10) || undefined,
      userAgent: String(req.get("user-agent") || "").slice(0, 300) || undefined,
      ip: String(req.ip || "").slice(0, 64) || undefined,
    });
  } catch (err) {
    // non-blocking
    console.warn("[adminLog] failed:", err?.message || err);
  }
}

module.exports = { logAdminAction };
