// backend/src/models/Booking.js
const { Schema, model } = require('mongoose');


const bookingSchema = new Schema(
{
package: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
status: { type: String, enum: ['Pendiente', 'En proceso', 'Finalizado'], default: 'Pendiente' },
date: { type: Date, required: true },
people: { adults: { type: Number, default: 1 }, children: { type: Number, default: 0 } },


customer: {
name: { type: String, required: true },
email: { type: String, required: true },
phone: String,
country: String,
language: { type: String, default: 'es' }
},


notes: String,
totalPrice: Number
},
{ timestamps: true }
);


module.exports = model('Booking', bookingSchema);