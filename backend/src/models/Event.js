// backend/src/models/Event.js
const { Schema, model } = require("mongoose");

const EVENT_TTL_DAYS = Number(process.env.EVENT_TTL_DAYS || 90);

const EventSchema = new Schema(
  {
    type: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, trim: true, maxlength: 500 },
    meta: { type: Schema.Types.Mixed },
    path: { type: String, trim: true, maxlength: 300 },
    url: { type: String, trim: true, maxlength: 1000 },
    referrer: { type: String, trim: true, maxlength: 1000 },
    userAgent: { type: String, trim: true, maxlength: 300 },
    ip: { type: String, trim: true, maxlength: 64 },
  },
  { timestamps: true }
);

if (Number.isFinite(EVENT_TTL_DAYS) && EVENT_TTL_DAYS > 0) {
  EventSchema.index({ createdAt: 1 }, { expireAfterSeconds: Math.round(EVENT_TTL_DAYS * 86400) });
}

module.exports = model("Event", EventSchema);
