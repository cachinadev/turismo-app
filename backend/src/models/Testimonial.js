// backend/src/models/Testimonial.js
const { Schema, model } = require("mongoose");

const TestimonialSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 120, default: "Traveler" },
    country: { type: String, trim: true, maxlength: 80 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 1200 },
    date: { type: Date },
    avatar: { type: String, trim: true, maxlength: 1000 },
    media: [
      {
        url: { type: String, trim: true, maxlength: 1000 },
        type: { type: String, enum: ["image", "video"], default: "image" },
      },
    ],
    source: { type: String, trim: true, maxlength: 40 }, // e.g. Facebook, TripAdvisor
    sourceUrl: { type: String, trim: true, maxlength: 1000 },
    packageSlug: { type: String, trim: true, maxlength: 200 },
    reservationId: { type: String, trim: true, maxlength: 40 },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ["approved", "pending", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = model("Testimonial", TestimonialSchema);
