// backend/src/middleware/auth.js
const jwt = require("jsonwebtoken");

const {
  JWT_SECRET,
  JWT_ISSUER = "turismo-api",
  JWT_AUDIENCE = "turismo-frontend",
  NODE_ENV = "development",
} = process.env;

const IS_PROD = NODE_ENV === "production";

// Role precedence (higher index = higher privilege)
const ROLE_ORDER = ["agent", "admin"];

function roleSatisfies(userRole, required) {
  if (!required) return true;

  const reqList = Array.isArray(required) ? required : [required];

  const userIdx = ROLE_ORDER.indexOf(String(userRole || "").toLowerCase());
  if (userIdx < 0) return false;

  return reqList.some((r) => {
    const reqIdx = ROLE_ORDER.indexOf(String(r || "").toLowerCase());
    if (reqIdx < 0) return false;
    return userIdx >= reqIdx;
  });
}

// Extract bearer token (primary), with fallbacks.
function getAccessTokenFromReq(req) {
  // Authorization: Bearer <token>
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  // Cookie fallback (if you later decide to use it)
  if (req.cookies?.access_token) return String(req.cookies.access_token);

  // Custom header (useful for Postman/curl)
  if (req.headers["x-access-token"]) return String(req.headers["x-access-token"]);

  return null;
}

/**
 * Usage:
 *   router.get('/private', auth(), (req,res)=>{...})
 *   router.get('/admin',   auth('admin'), (req,res)=>{...})
 *   router.get('/either',  auth(['agent','admin']), (req,res)=>{...})
 */
function auth(requiredRole = null) {
  return (req, res, next) => {
    // Let CORS preflights pass quickly
    if (req.method === "OPTIONS") return next();

    // Fail-fast: secret must exist (especially in production)
    if (!JWT_SECRET) {
      const msg = "JWT_SECRET no configurado";
      if (IS_PROD) return res.status(500).json({ message: msg });
      // in dev, still allow explicit debugging message
      console.warn("⚠️", msg);
      return res.status(500).json({ message: msg });
    }

    const token = getAccessTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ message: "Token requerido" });
    }

    try {
      // Audience can be string or array in jsonwebtoken.
      const aud = String(JWT_AUDIENCE || "").trim();
      const audience = aud.includes(",")
        ? aud.split(",").map((s) => s.trim()).filter(Boolean)
        : aud;

      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: audience || undefined,
        clockTolerance: 5, // seconds
      });

      if (!roleSatisfies(decoded.role, requiredRole)) {
        return res.status(403).json({ message: "No autorizado (rol insuficiente)" });
      }

      // Attach minimal identity
      req.user = {
        id: decoded.id || decoded.sub, // allow either "id" or JWT "sub"
        role: decoded.role,
        email: decoded.email,
        name: decoded.name,
        iat: decoded.iat,
        exp: decoded.exp,
      };

      return next();
    } catch (err) {
      // Optional: help clients distinguish expiry vs invalid
      if (err?.name === "TokenExpiredError" || err?.code === "ERR_JWT_EXPIRED") {
        res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token", error_description="token_expired"');
        return res.status(401).json({ message: "Token expirado" });
      }

      res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"');
      return res.status(401).json({ message: "Token inválido" });
    }
  };
}

module.exports = auth;
