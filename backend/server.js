// backend/server.js
require('dotenv').config();

const express       = require('express');
const cookieParser  = require('cookie-parser'); // needed for /auth/refresh
const cors          = require('cors');
const morgan        = require('morgan');
const helmet        = require('helmet');
const compression   = require('compression');
const path          = require('path');
const onHeaders     = require('on-headers');

const connectDB     = require('./src/config/db');
const seedAdmin     = require('./src/config/seedAdmin');
const errorHandler  = require('./src/middleware/errorHandler');

const authRoutes    = require('./src/routes/auth');
const packageRoutes = require('./src/routes/packages');
const bookingRoutes = require('./src/routes/bookings');
const uploadRoutes  = require('./src/routes/uploads');
const contactRoutes = require('./src/routes/contact'); // ✅

const app = express();

/* ---------- App hardening / infra ---------- */
app.disable('x-powered-by');

/* ---------- Trust proxy ---------- */
// prod: trust 1 (edge/load balancer); dev: none
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Parse cookies early (for refresh tokens, etc.)
app.use(cookieParser());

/* ---------- Helpers ---------- */
function parseCsv(v = '') {
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}
function normalizeOrigin(o = '') {
  return String(o).replace(/\/+$/, '');
}
function buildCorsOptions() {
  const allowed = parseCsv(process.env.ALLOWED_ORIGINS).map(normalizeOrigin);
  const devFallback = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const whitelist = (allowed.length ? allowed : devFallback).map(normalizeOrigin);

  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true); // SSR, curl, same-origin
      const norm = normalizeOrigin(origin);
      if (whitelist.includes(norm)) return cb(null, true);
      const err = new Error(`Not allowed by CORS: ${norm}`);
      err.statusCode = 403;
      return cb(err);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 1 day
  };
}

async function start() {
  await connectDB();
  await seedAdmin();

  // Server-Timing (safe header injection)
  app.use((req, res, next) => {
    const t0 = process.hrtime.bigint();
    onHeaders(res, () => {
      try {
        const t1 = process.hrtime.bigint();
        const ms = Number(t1 - t0) / 1e6;
        res.setHeader('Server-Timing', `app;dur=${ms.toFixed(1)}`);
      } catch {}
    });
    next();
  });

  // CORS (with graceful JSON on rejection)
  const corsOptions = buildCorsOptions();
  app.use((req, res, next) => {
    cors(corsOptions)(req, res, (err) => {
      if (err) {
        return res
          .status(err.statusCode || 403)
          .json({ message: 'CORS rechazado', origin: req.headers.origin || null });
      }
      next();
    });
  });
  // Explicit preflight
  app.options('*', cors(corsOptions), (_req, res) => res.sendStatus(204));

  // Helmet (allow cross-origin usage of /uploads)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(compression());

  // Logging
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev', {
      skip: (req) =>
        req.path === '/healthz' ||
        req.path.startsWith('/uploads/') ||
        req.path === '/favicon.ico',
    }));
  }

  // Body parsers + early JSON error catcher
  app.use(express.json({
    limit: process.env.JSON_LIMIT || '10mb',
    strict: true,
    verify: (req, _res, buf) => { req.rawBody = buf; },
  }));
  app.use((err, _req, res, next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'JSON inválido' });
    }
    return next(err);
  });
  app.use(express.urlencoded({ extended: true }));

  // Static files (uploads)
  app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'), {
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7d
      },
    }),
  );

  // Health + root
  app.get('/healthz', (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.get('/', (_req, res) => res.json({ ok: true }));

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/packages', packageRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/contact', contactRoutes); // ✅

  // 404 for unknown API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }
    return next();
  });

  // Central error handler
  app.use(errorHandler);

  const port = Number(process.env.PORT || 4000);
  const server = app.listen(port, () => {
    console.log(`🚀 Backend en http://localhost:${port}`);
  });

  // Graceful shutdown
  const shutdown = (sig) => () => {
    console.log(`\n${sig} recibido. Cerrando servidor…`);
    server.close(() => {
      console.log('HTTP cerrado.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));

  // Crash guards
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
}

start();
