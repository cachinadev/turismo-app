// backend/src/models/User.js
const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },

    // store lowercased, unique
    email: {
      type: String,
      required: true,
      unique: true,          // <-- this creates the unique index
      lowercase: true,
      trim: true,
      maxlength: 254,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Email inválido',
      },
    },

    // NEVER expose this in JSON
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ['admin', 'agent'], default: 'agent' },

    // account state
    active: { type: Boolean, default: true },

    // optional metadata
    phone: { type: String, trim: true, maxlength: 40 },

    // security / auditing (useful for auth flows)
    lastLoginAt: { type: Date },
    lastPasswordChangeAt: { type: Date },

    // basic brute-force protection
    loginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date, default: null },

    // token invalidation (bump to revoke refresh tokens)
    tokenVersion: { type: Number, default: 0 },

    // optional password reset (hash+expiry stored, never exposed)
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.passwordHash;
        delete ret.resetTokenHash;
        delete ret.resetTokenExpiresAt;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// convenience virtual
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// normalize email just in case
userSchema.pre('save', function (next) {
  if (typeof this.email === 'string') this.email = this.email.trim().toLowerCase();
  next();
});

// simple helpers you can call from auth route (optional)
userSchema.methods.markLoginSuccess = function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.lastLoginAt = new Date();
  return this.save();
};

userSchema.methods.incLoginAttempts = function (maxAttempts = 10, lockMinutes = 15) {
  const now = new Date();
  if (this.lockUntil && this.lockUntil < now) {
    // lock expired: reset counter
    this.loginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= maxAttempts && !this.isLocked) {
      this.lockUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
    }
  }
  return this.save();
};

// Indexes (keep only non-duplicate ones)
userSchema.index({ role: 1, active: 1 });
userSchema.index({ lockUntil: 1 });

module.exports = model('User', userSchema);
