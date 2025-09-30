// backend/src/routes/auth.js
const express = require('express');
// Prefer bcryptjs to avoid native build issues; install: npm i bcryptjs
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/* ------------------------ Config ------------------------ */
const {
  JWT_SECRET   = 'change_me',
  JWT_ISSUER   = 'turismo-api',
  JWT_AUDIENCE = 'turismo-frontend',
  ACCESS_TTL   = '8h',
  REFRESH_TTL  = '7d',
  NODE_ENV     = 'development',
  COOKIE_DOMAIN = '', // e.g., ".vicuadvent.com" in prod if you want
} = process.env;

const IS_PROD = NODE_ENV === 'production';

/* ------------------------ JWT helpers ------------------------ */
function signAccess(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TTL,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function signRefresh(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TTL,
    issuer: JWT_ISSUER,
    audience: `${JWT_AUDIENCE}:refresh`,
  });
}

function setRefreshCookie(res, token) {
  const opts = {
    httpOnly: true,
    secure: IS_PROD,        // HTTPS in prod
    sameSite: IS_PROD ? 'lax' : 'lax',
    path: '/api/auth',      // limit cookie scope
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  };
  if (COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN; // optional
  res.cookie('refresh_token', token, opts);
}

/* ------------------------ Cookie helpers ------------------------ */
// Works with or without cookie-parser
function parseCookies(req) {
  if (req.cookies) return req.cookies;
  const str = req.headers.cookie || '';
  return str.split(';').reduce((acc, p) => {
    const i = p.indexOf('=');
    if (i > -1) {
      const k = p.slice(0, i).trim();
      let v = p.slice(i + 1).trim();
      try { v = decodeURIComponent(v); } catch { /* noop */ }
      acc[k] = v;
    }
    return acc;
  }, {});
}

function getRefreshTokenFromReq(req) {
  const cookies = parseCookies(req);
  // Priority: cookie -> body.refreshToken -> Authorization: Bearer <token>
  return (
    cookies.refresh_token ||
    req.body?.refreshToken ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice('Bearer '.length)
      : '')
  );
}

/* ------------------------ Rate limits ------------------------ */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 attempts/min/IP
  standardHeaders: true,
  legacyHeaders: false,
});

/* ------------------------ Routes ------------------------ */

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  loginLimiter,
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .trim()
      .normalizeEmail(),
    body('password')
      .isString()
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');

      // Always store emails in lowercase
      // Select only the fields we actually need
      const user = await User.findOne({ email })
        .select('_id name email role active passwordHash')
        .lean();

      // Compare password (avoid throwing on malformed dummy hash)
      let passwordOk = false;
      if (user?.passwordHash) {
        try {
          passwordOk = await bcrypt.compare(password, user.passwordHash);
        } catch {
          passwordOk = false;
        }
      } else {
        // Do a fake compare to reduce timing differences (safe no-op)
        try { await bcrypt.compare(password, '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEuvh9CqNq9mqs'); } catch {}
        passwordOk = false;
      }

      if (!user || !passwordOk) {
        // Generic message to avoid user enumeration
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (user.active === false) {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      const payload = { id: user._id, role: user.role, name: user.name, email: user.email };
      const accessToken = signAccess(payload);
      const refreshToken = signRefresh({ id: user._id, tokenType: 'refresh' });

      setRefreshCookie(res, refreshToken);

      return res.json({
        token: accessToken,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/auth/me (protected)
 */
router.get('/me', auth(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('name email role')
      .lean();

    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  const token = getRefreshTokenFromReq(req);
  if (!token) return res.status(401).json({ message: 'Missing refresh token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: `${JWT_AUDIENCE}:refresh`,
    });

    if (decoded.tokenType !== 'refresh' || !decoded.id) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id)
      .select('_id name email role active')
      .lean();

    if (!user) return res.status(401).json({ message: 'Invalid user' });
    if (user.active === false) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const accessToken = signAccess({
      id: user._id, role: user.role, name: user.name, email: user.email,
    });

    // (Optional) rotate refresh token here if you like:
    // const newRefresh = signRefresh({ id: user._id, tokenType: 'refresh' });
    // setRefreshCookie(res, newRefresh);

    return res.json({ token: accessToken });
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (_req, res) => {
  res.clearCookie('refresh_token', { path: '/api/auth', domain: COOKIE_DOMAIN || undefined });
  res.json({ ok: true });
});

module.exports = router;
