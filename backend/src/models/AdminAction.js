// backend/src/models/AdminAction.js
const { Schema, model } = require("mongoose");

const TTL_DAYS = Number(process.env.ADMIN_ACTION_TTL_DAYS || 180);

const AdminActionSchema = new Schema(
  {
    action: { type: String, required: true, trim: true, maxlength: 80 },
    entity: { type: String, trim: true, maxlength: 80 },
    entityId: { type: String, trim: true, maxlength: 120 },
    meta: { type: Schema.Types.Mixed },
    actor: {
      id: { type: String, trim: true, maxlength: 120 },
      email: { type: String, trim: true, maxlength: 200 },
      name: { type: String, trim: true, maxlength: 200 },
      role: { type: String, trim: true, maxlength: 40 },
    },
    path: { type: String, trim: true, maxlength: 300 },
    method: { type: String, trim: true, maxlength: 10 },
    userAgent: { type: String, trim: true, maxlength: 300 },
    ip: { type: String, trim: true, maxlength: 64 },
  },
  { timestamps: true }
);

AdminActionSchema.index({ createdAt: -1 });
AdminActionSchema.index({ action: 1, entity: 1 });

if (Number.isFinite(TTL_DAYS) && TTL_DAYS > 0) {
  AdminActionSchema.index({ createdAt: 1 }, { expireAfterSeconds: Math.round(TTL_DAYS * 86400) });
}

module.exports = model("AdminAction", AdminActionSchema);
