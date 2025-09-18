// backend/middleware/authenticate.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Extract a JWT from common places:
 * - Authorization: Bearer <token>
 * - x-access-token: <token>
 * - cookie: token=<token>   (requires cookie-parser if you want this)
 */
function getTokenFromRequest(req) {
  // Header: Authorization: Bearer <token>
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1].trim();
    }
  }

  // Fallback: x-access-token
  if (req.headers?.["x-access-token"]) {
    return String(req.headers["x-access-token"]).trim();
  }

  // Optional: cookie named "token" (only if cookie-parser is used in server)
  if (req.cookies?.token) {
    return String(req.cookies.token).trim();
  }

  return null;
}

/**
 * Express middleware to authenticate requests with a JWT.
 * On success sets req.user and res.locals.user
 */
function authenticate(req, res, next) {
  try {
    const secret = process.env.MY_SECRET_KEY;
    if (!secret) {
      // Misconfiguration – fail fast with 500
      console.error("❌ MY_SECRET_KEY not set in environment.");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const token = getTokenFromRequest(req);
    if (!token) {
      return res
        .status(401)
        .json({ error: "No token, authorization denied", code: "NO_TOKEN" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, secret, {
        algorithms: ["HS256"], // match what you sign with
        clockTolerance: 5,     // seconds of leeway for small clock skew
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ error: "Token expired", code: "TOKEN_EXPIRED" });
      }
      if (err.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ error: "Token is not valid", code: "TOKEN_INVALID" });
      }
      console.error("Token verification failed:", err);
      return res
        .status(401)
        .json({ error: "Token verification failed", code: "TOKEN_ERROR" });
    }

    // Optional: ensure minimal claims exist
    const user = {
      id: decoded.id,
      email: decoded.email,
      fullName: decoded.fullName,
      // you can keep iat/exp if you need them:
      iat: decoded.iat,
      exp: decoded.exp,
    };

    if (!user.id) {
      return res
        .status(401)
        .json({ error: "Token payload missing user id", code: "TOKEN_PAYLOAD_MISSING_ID" });
    }

    req.user = user;
    res.locals.user = user;
    return next();
  } catch (err) {
    console.error("authenticate middleware error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = authenticate;