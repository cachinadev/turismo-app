// backend/src/models/Complaint.js
const { Schema, model } = require("mongoose");

const complaintSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    documentType: { type: String, default: "DNI" },
    documentNumber: { type: String, required: true },
    service: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["Reclamo", "Queja"], default: "Reclamo" },
  },
  { timestamps: true }
);

const Complaint = model("Complaint", complaintSchema);
module.exports = { Complaint };
