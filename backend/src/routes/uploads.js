// backend/src/routes/uploads.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ---- Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

// ---- Validation
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.avi']);
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
]);

function fileFilter(_req, file, cb) {
  const ext = (path.extname(file.originalname) || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
    const err = new Error('Formato no permitido');
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ---- Base URL helper
function getBaseUrl(req) {
  const envBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (envBase) return envBase;
  return `${req.protocol}://${req.get('host')}`;
}

// ---- Rate limit (admins only, but extra layer)
const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 50, // max 50 uploads per 5 min
  message: { error: 'Demasiadas cargas, intente más tarde.' },
});

// ---- Health
router.head('/', (_req, res) => res.sendStatus(200));

// ---- Upload endpoint (admin only)
router.post('/', auth('admin'), uploadLimiter, upload.array('files', 10), async (req, res, next) => {
  try {
    const base = getBaseUrl(req);

    // Import file-type dynamically (ESM module in CommonJS)
    const { fileTypeFromFile } = await import('file-type');

    // Stronger validation with magic bytes
    for (const f of req.files || []) {
      const info = await fileTypeFromFile(f.path).catch(() => null);
      const valid = info && ALLOWED_MIME.has(info.mime);
      if (!valid) {
        fs.unlinkSync(f.path);
        const err = new Error(`Archivo con firma inválida: ${f.originalname}`);
        err.status = 400;
        throw err;
      }
    }

    const files = (req.files || []).map((f) => {
      const ext = (path.extname(f.originalname) || '').toLowerCase();
      const isVideo = ['.mp4', '.mov', '.avi'].includes(ext);
      const filename = path.basename(f.path);
      const relativePath = `/uploads/${filename}`;
      return {
        id: uuid(), // optional: unique ID for DB reference
        url: `${base}${relativePath}`,
        relativePath,
        filename,
        originalName: path.basename(f.originalname),
        fieldname: f.fieldname,
        type: isVideo ? 'video' : 'image',
        size: f.size,
        mimetype: f.mimetype,
      };
    });

    return res.status(201).json({ files });
  } catch (err) {
    return next(err);
  }
});

// ---- Multer / validation error handler
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Archivo demasiado grande (máx. 20MB).'
        : 'Error de carga: ' + (err.message || err.code);
    return res.status(400).json({ error: message, code: err.code });
  }
  const status = err.status || 500;
  const message =
    status === 400
      ? (err.message || 'Solicitud inválida')
      : 'Error interno en la carga de archivos.';
  return res.status(status).json({ error: message });
});

module.exports = router;
