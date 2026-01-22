// backend/src/models/User.js
const { Schema, model } = require("mongoose");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    // store lowercased, unique (index created below for better control)
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      validate: {
        validator: (v) => EMAIL_RE.test(String(v || "").trim()),
        message: "Email inválido",
      },
    },

    // NEVER expose this in JSON
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: ["admin", "agent"], default: "agent", index: true },

    // account state
    active: { type: Boolean, default: true, index: true },

    // optional metadata
    phone: { type: String, trim: true, maxlength: 40, default: "" },

    // security / auditing (useful for auth flows)
    lastLoginAt: { type: Date, default: null },
    lastPasswordChangeAt: { type: Date, default: null },

    // basic brute-force protection
    loginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date, default: null, index: true },

    // token invalidation (bump to revoke refresh tokens)
    tokenVersion: { type: Number, default: 0 },

    // optional password reset (hash+expiry stored, never exposed)
    resetTokenHash: { type: String, select: false, default: null },
    resetTokenExpiresAt: { type: Date, select: false, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;

        // extra safety: in case select:false is bypassed somewhere
        delete ret.passwordHash;
        delete ret.resetTokenHash;
        delete ret.resetTokenExpiresAt;

        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ===================== Virtuals ===================== */
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

/* ===================== Hooks ===================== */
// normalize email + phone
userSchema.pre("validate", function (next) {
  if (typeof this.email === "string") this.email = this.email.trim().toLowerCase();
  if (typeof this.phone === "string") this.phone = this.phone.trim();
  next();
});

/* ===================== Methods ===================== */
userSchema.methods.markLoginSuccess = function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.lastLoginAt = new Date();
  return this.save();
};

userSchema.methods.incLoginAttempts = function (maxAttempts = 10, lockMinutes = 15) {
  const now = new Date();

  // lock expired -> reset counter
  if (this.lockUntil && this.lockUntil < now) {
    this.loginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.loginAttempts = (this.loginAttempts || 0) + 1;

    if (this.loginAttempts >= maxAttempts && !this.isLocked) {
      this.lockUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
    }
  }

  return this.save();
};

// convenience: revoke refresh tokens (optional)
userSchema.methods.bumpTokenVersion = function () {
  this.tokenVersion = (this.tokenVersion || 0) + 1;
  return this.save();
};

/* ===================== Indexes ===================== */
// Unique email index (case-insensitive via normalization hook)
// NOTE: run a one-time cleanup if you already have duplicate emails.
userSchema.index({ email: 1 }, { unique: true });

// Useful queries
userSchema.index({ role: 1, active: 1 });

module.exports = model("User", userSchema);
