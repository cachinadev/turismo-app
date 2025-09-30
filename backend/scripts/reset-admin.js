// backend/scripts/reset-admin.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const newPwd = process.env.ADMIN_PASSWORD;

  if (!email || !newPwd) {
    console.error('ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {});
  const u = await User.findOne({ email: String(email).trim().toLowerCase() });

  if (!u) {
    console.error(`Admin user not found: ${email}`);
    process.exit(1);
  }

  u.passwordHash = await bcrypt.hash(newPwd, 10);
  await u.save();

  console.log(`✅ Password reset for ${email}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
