// backend/src/config/db.js
const mongoose = require('mongoose');

const {
  NODE_ENV = 'development',
  MONGO_URI,
  MONGO_MAX_POOL_SIZE = '10',
  MONGO_MIN_POOL_SIZE = '0',
  MONGO_SERVER_SELECTION_TIMEOUT_MS = '10000',
  MONGO_AUTO_INDEX, // optional override
} = process.env;

const IS_PROD = NODE_ENV === 'production';

// Stricter query casting (recommended)
mongoose.set('strictQuery', true);

/** Pretty-print safe URI (hide creds for logs) */
function safeUri(uri = '') {
  try {
    const u = new URL(uri);
    if (u.username || u.password) {
      u.username = '***';
      u.password = '***';
    }
    return u.toString();
  } catch {
    return '[invalid mongodb uri]';
  }
}

let isConnected = false;

async function connectOnce() {
  if (!MONGO_URI) throw new Error('MONGO_URI no definido');

  await mongoose.connect(MONGO_URI, {
    maxPoolSize: Number(MONGO_MAX_POOL_SIZE) || 10,
    minPoolSize: Number(MONGO_MIN_POOL_SIZE) || 0,
    serverSelectionTimeoutMS: Number(MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,

    // In dev: auto-create indexes. In prod: disable unless explicitly enabled
    autoIndex: MONGO_AUTO_INDEX
      ? MONGO_AUTO_INDEX === 'true'
      : !IS_PROD,

    // Node socket timeouts
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  isConnected = true;
}

/**
 * Connect to MongoDB with retries
 * @param {number} retries - number of retry attempts
 */
async function connectDB(retries = 5) {
  if (isConnected) return mongoose.connection;

  const uriForLog = safeUri(MONGO_URI);
  let attempt = 0;

  // Attach listeners once
  const conn = mongoose.connection;
  if (!conn._listenersAttached) {
    conn._listenersAttached = true;

    conn.on('connected', () => {
      console.log(`✅ MongoDB conectado: ${uriForLog}`);
    });

    conn.on('error', (err) => {
      console.error('🛑 MongoDB error:', err?.message || err);
    });

    conn.on('disconnected', () => {
      console.warn('⚠️  MongoDB desconectado');
      isConnected = false;
    });
  }

  while (attempt < retries) {
    try {
      await connectOnce();
      return mongoose.connection;
    } catch (err) {
      attempt++;
      const left = retries - attempt;
      const msg = err?.message || String(err);

      if (left <= 0) {
        console.error('❌ No se pudo conectar a MongoDB:', msg);
        throw err;
      }

      const delay = Math.min(5000, 500 * attempt); // backoff up to 5s
      console.warn(
        `MongoDB intento ${attempt} fallido (${msg}). Reintentando en ${delay}ms… (${left} intentos restantes)`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/** Graceful close (useful for tests or shutdown hooks) */
async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('🛑 MongoDB desconectado manualmente');
}

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
