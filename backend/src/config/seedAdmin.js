// backend/src/config/seedAdmin.js
const bcrypt = require('bcryptjs'); // <- use bcryptjs (no native build)
const User = require('../models/User');

module.exports = async function seedAdmin() {
  try {
    // --- 1) Read env & normalize
    const emailRaw = process.env.ADMIN_EMAIL || 'admin@vicuadvent.com';
    const email = String(emailRaw).trim().toLowerCase();
    const name = process.env.ADMIN_NAME || 'Admin';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const forcePromote = String(process.env.ADMIN_FORCE_PROMOTE || '').trim() === '1';
    const resetPassword = String(process.env.ADMIN_RESET_PASSWORD || '').trim() === '1';
    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);

    if (!email) {
      console.warn('⚠️  ADMIN_EMAIL is empty; skipping admin seed.');
      return;
    }

    // --- 2) Find existing by email (only)
    const existing = await User.findOne({ email }).lean();

    // --- 3) If user exists: optionally promote and/or reset password
    if (existing) {
      let changed = false;

      if (existing.role !== 'admin' && forcePromote) {
        await User.updateOne({ _id: existing._id }, { $set: { role: 'admin' } });
        console.log(`🔼 Promoted existing user to admin → ${email}`);
        changed = true;
      } else if (existing.role !== 'admin') {
        console.log(
          `ℹ️  User exists (${email}) but role is "${existing.role}". ` +
          `Set ADMIN_FORCE_PROMOTE=1 to promote to admin.`
        );
      }

      if (resetPassword) {
        const passwordHash = await bcrypt.hash(password, rounds);
        await User.updateOne({ _id: existing._id }, { $set: { passwordHash } });
        console.log(`✅ Password reset for ${email}`);
        changed = true;
      } else {
        console.log('ℹ️  Password not changed. Set ADMIN_RESET_PASSWORD=1 to force reset.');
      }

      if (!changed) {
        console.log(`👑 Admin seed check done for ${email} (no changes).`);
      }
      return;
    }

    // --- 4) Create fresh admin (idempotent upsert-by-email)
    const passwordHash = await bcrypt.hash(password, rounds);
    await User.findOneAndUpdate(
      { email },
      { $setOnInsert: { name, email, passwordHash, role: 'admin', active: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`👑 Admin created → ${email}`);

    // --- 5) Friendly warnings
    const weak =
      password.length < 10 ||
      /^(ChangeMe123!|password|123456|admin)$/i.test(password);
    if (weak) {
      console.warn(
        '⚠️  The seeded admin password looks weak/default. ' +
        'Change ADMIN_PASSWORD in your environment ASAP.'
      );
    }
  } catch (err) {
    console.error('❌ Failed to seed admin:', err?.message || err);
  }
};
