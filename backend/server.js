// backend/server.js
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const onHeaders = require("on-headers");

const connectDB = require("./src/config/db");
const seedAdmin = require("./src/config/seedAdmin");
const errorHandler = require("./src/middleware/errorHandler");

const authRoutes = require("./src/routes/auth");
const packageRoutes = require("./src/routes/packages");
const bookingRoutes = require("./src/routes/bookings");
const uploadRoutes = require("./src/routes/uploads");
const contactRoutes = require("./src/routes/contact");
const complaintsRoutes = require("./src/routes/complaints");
const eventsRoutes = require("./src/routes/events");
const testimonialRoutes = require("./src/routes/testimonials");
const adminRoutes = require("./src/routes/admin");
const brochuresRoutes = require("./src/routes/brochures");

const app = express();

/* ------------------------------------------------------
 * ✅ Validación de variables críticas
 * ------------------------------------------------------ */
["MONGO_URI", "JWT_SECRET"].forEach((key) => {
  if (!process.env[key]) throw new Error(`❌ Missing required env var: ${key}`);
});

/* ------------------------------------------------------
 * 🧩 Utilidades
 * ------------------------------------------------------ */
function parseCsv(v = "") {
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeOrigin(o = "") {
  return String(o).replace(/\/+$/, "");
}

/**
 * Construye whitelist:
 * - Si ALLOWED_ORIGINS existe => se usa
 * - Si no => fallback dev (localhost)
 *
 * Recomendado:
 * ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://vicuadvent.com,https://www.vicuadvent.com
 */
function getCorsWhitelist() {
  const allowed = parseCsv(process.env.ALLOWED_ORIGINS).map(normalizeOrigin);
  const devFallback = ["http://localhost:3000", "http://127.0.0.1:3000"].map(normalizeOrigin);
  return (allowed.length ? allowed : devFallback).map(normalizeOrigin);
}

/**
 * CORS options: permite credenciales y Authorization.
 */
function buildCorsOptions() {
  const whitelist = getCorsWhitelist();

  return {
    origin(origin, cb) {
      // Permite requests sin Origin (curl/postman/SSR/server-to-server)
      if (!origin) return cb(null, true);

      const norm = normalizeOrigin(origin);
      if (whitelist.includes(norm)) return cb(null, true);

      console.warn(`🚫 CORS blocked: ${norm}`);
      return cb(new Error(`Not allowed by CORS: ${norm}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Server-Timing"],
    maxAge: 86400,
  };
}

/* ------------------------------------------------------
 * 🧱 Config base / seguridad
 * ------------------------------------------------------ */
app.disable("x-powered-by");

// This app normally runs behind nginx. Default to one trusted proxy hop
// unless explicitly disabled with TRUST_PROXY=0.
function resolveTrustProxy() {
  const raw = process.env.TRUST_PROXY;
  if (raw === undefined) return 1;
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return 1;

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 1;
}

const trustProxy = resolveTrustProxy();
app.set("trust proxy", trustProxy);

app.use(cookieParser());

/* ------------------------------------------------------
 * 🚀 Start
 * ------------------------------------------------------ */
async function start() {
  await connectDB();
  await seedAdmin();

  /* 🕒 Server-Timing */
  app.use((req, res, next) => {
    const t0 = process.hrtime.bigint();
    onHeaders(res, () => {
      try {
        const t1 = process.hrtime.bigint();
        const ms = Number(t1 - t0) / 1e6;
        res.setHeader("Server-Timing", `app;dur=${ms.toFixed(1)}`);
      } catch {
        // ignore
      }
    });
    next();
  });

  /* 🌍 CORS (una sola vez, bien aplicado) */
  const corsOptions = buildCorsOptions();
  app.use(cors(corsOptions));
  // Preflight
  app.options("*", cors(corsOptions));

  /* 🛡 Helmet */
  app.use(
    helmet({
      // Permite servir imágenes desde /uploads a otros orígenes (Next Image / navegador)
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: false,
      // CSP suele romper dev (Next, ws, etc.). En prod puedes activarla si defines bien directivas.
      contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    })
  );

  /* 🗜 Compression */
  app.use(compression());

  /* 🪵 Logging */
  const skipLog = (req) =>
    req.path === "/healthz" ||
    req.path === "/favicon.ico" ||
    req.path.startsWith("/uploads/");
  app.use(
    morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
      skip: skipLog,
    })
  );

  /* 📦 Parsers */
  app.use(
    express.json({
      limit: process.env.JSON_LIMIT || "10mb",
      strict: true,
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // JSON malformado
  app.use((err, _req, res, next) => {
    if (err?.type === "entity.parse.failed") {
      return res.status(400).json({ code: "BAD_JSON", message: "JSON inválido" });
    }
    return next(err);
  });

  app.use(express.urlencoded({ extended: true }));

  /* 📁 Static uploads */
  // Nota: "immutable" sólo si el nombre de archivo cambia siempre (hash).
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "public/uploads"), {
      setHeaders: (res) => {
        // Cache razonable (1 día). Si usas nombres hash, puedes subir a 7 días + immutable.
        res.setHeader("Cache-Control", "public, max-age=86400");
        // Si quieres permitir hotlinking de imágenes:
        res.setHeader("Access-Control-Allow-Origin", "*");
      },
    })
  );

  /* ❤️ Healthcheck */
  app.get("/healthz", (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.get("/", (_req, res) => res.json({ ok: true, msg: "API Turismo OK" }));

  /* ------------------------------------------------------
   * 🧩 API Routes
   * ------------------------------------------------------ */
  app.use("/api/auth", authRoutes);
  app.use("/api/packages", packageRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/complaints", complaintsRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/testimonials", testimonialRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/brochures", brochuresRoutes);

  /* 404 para API */
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ code: "NOT_FOUND", message: "Recurso no encontrado" });
    }
    return next();
  });

  /* ⚠️ Error handler (final) */
  app.use(errorHandler);

  /* ------------------------------------------------------
   * 🚦 Start server
   * ------------------------------------------------------ */
  const port = Number(process.env.PORT || 4000);
  const host = process.env.HOST || "0.0.0.0";

  const server = app.listen(port, host, () => {
    console.log(`🚀 Backend running at http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
    console.log(`✅ CORS whitelist: ${getCorsWhitelist().join(", ")}`);
    console.log(`ℹ️  trust proxy: ${trustProxy}`);
  });

  /* 🧹 Graceful shutdown */
  const shutdown = (sig) => () => {
    console.log(`\n${sig} recibido. Cerrando servidor…`);
    server.close(() => {
      console.log("HTTP cerrado.");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };

  process.on("SIGINT", shutdown("SIGINT"));
  process.on("SIGTERM", shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => console.error("Unhandled Rejection:", reason));
  process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err));
}

/* ------------------------------------------------------
 * 🚀 Ejecutar servidor
 * ------------------------------------------------------ */
start().catch((err) => {
  console.error("❌ Error inicializando el servidor:", err);
  process.exit(1);
});
