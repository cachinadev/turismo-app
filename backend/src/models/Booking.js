// backend/src/models/Booking.js
const { Schema, model } = require("mongoose");

function genReservationId() {
  // Example: VA-20260120-3R42VL
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VA-${y}${m}${day}-${rand}`;
}

const bookingSchema = new Schema(
  {
    package: { type: Schema.Types.ObjectId, ref: "Package", required: true },

    packageMeta: {
      slug: { type: String, default: "" },
      title: { type: String, default: "" },
      city: { type: String, default: "" },
    },

    reservationId: { type: String, unique: true, index: true },

    status: {
      type: String,
      enum: ["Pendiente", "En proceso", "Finalizado", "Cancelado"],
      default: "Pendiente",
      index: true,
    },

    date: { type: Date, required: true, index: true },

    people: {
      adults: { type: Number, default: 1, min: 1 },
      children: { type: Number, default: 0, min: 0 },
    },

    tourType: {
      type: String,
      enum: ["collective", "exclusive"],
      default: "collective",
      index: true,
    },
    isExclusive: { type: Boolean, default: false },

    customer: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
      phone: { type: String, default: "", trim: true, maxlength: 40 },
      country: { type: String, default: "", trim: true, maxlength: 80 },
      language: { type: String, default: "es", trim: true, maxlength: 10 },
    },

    notes: { type: String, default: "", trim: true, maxlength: 4000 },

    // ✅ IMPORTANT
    unitPrice: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "PEN", uppercase: true, trim: true, maxlength: 5 },

    totalPrice: { type: Number, default: 0, min: 0 },

    sourceUrl: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ "customer.email": 1, createdAt: -1 });

bookingSchema.pre("validate", function (next) {
  // reservationId
  if (!this.reservationId) this.reservationId = genReservationId();

  // sync tourType <-> isExclusive
  if (typeof this.isExclusive === "boolean") {
    this.tourType = this.isExclusive ? "exclusive" : "collective";
  } else if (this.tourType) {
    this.isExclusive = this.tourType === "exclusive";
  }

  // normalize people
  if (!this.people) this.people = { adults: 1, children: 0 };
  this.people.adults = Math.max(1, Number(this.people.adults || 1));
  this.people.children = Math.max(0, Number(this.people.children || 0));

  // compute total
  const adults = Number(this.people.adults || 0);
  const children = Number(this.people.children || 0);
  const people = Math.max(1, adults + children);

  const unit = Math.max(0, Number(this.unitPrice || 0));
  this.totalPrice = +(unit * people).toFixed(2);

  next();
});

module.exports = model("Booking", bookingSchema);
