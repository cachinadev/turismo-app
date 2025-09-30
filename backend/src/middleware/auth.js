// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');

const {
  JWT_SECRET   = 'Coco@2025',
  JWT_ISSUER   = 'turismo-api',
  JWT_AUDIENCE = 'turismo-frontend',
  NODE_ENV     = 'development',
} = process.env;

const IS_PROD = NODE_ENV === 'production';

// Role precedence (higher index = higher privilege)
const ROLE_ORDER = ['agent', 'admin'];

function roleSatisfies(userRole, required) {
  if (!required) return true; // no role requirement
  const reqList = Array.isArray(required) ? required : [required];

  // If any required role is satisfied by precedence, allow.
  const userIdx = ROLE_ORDER.indexOf(String(userRole || '').toLowerCase());
  if (userIdx < 0) return false;

  return reqList.some((r) => {
    const reqIdx = ROLE_ORDER.indexOf(String(r || '').toLowerCase());
    if (reqIdx < 0) return false;
    return userIdx >= reqIdx;
  });
}

// Extract bearer token (primary), with fallbacks if needed.
function getAccessTokenFromReq(req) {
  // Authorization: Bearer <token>
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }

  // Optional fallbacks if you ever decide to store it differently:
  // Cookie (not used by default in this project — refresh is cookie, access is body/localStorage)
  if (req.cookies?.access_token) return req.cookies.access_token;

  // Custom header (handy in tooling)
  if (req.headers['x-access-token']) return String(req.headers['x-access-token']);

  return null;
}

/***
 * Usage:
 *   router.get('/private', auth(), (req,res)=>{...})
 *   router.get('/admin',   auth('admin'), (req,res)=>{...})
 *   router.get('/either',  auth(['agent','admin']), (req,res)=>{...})
 */
function auth(requiredRole = null) {
  return (req, res, next) => {
    // Let CORS preflights pass quickly
    if (req.method === 'OPTIONS') return next();

    const token = getAccessTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ message: 'Token requerido' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        clockTolerance: 5, // seconds of skew tolerance
      });

      if (!roleSatisfies(decoded.role, requiredRole)) {
        return res.status(403).json({ message: 'No autorizado (rol insuficiente)' });
      }

      // Attach minimal identity; keep full payload if you prefer
      req.user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        name: decoded.name,
        iat: decoded.iat,
        exp: decoded.exp,
      };

      return next();
    } catch (err) {
      // Distinguish expiry for better client UX (optional)
      if (err && (err.name === 'TokenExpiredError' || err.code === 'ERR_JWT_EXPIRED')) {
        return res.status(401).json({ message: 'Token expirado' });
      }
      return res.status(401).json({ message: 'Token inválido' });
    }
  };
}

module.exports = auth;
