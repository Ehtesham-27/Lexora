import { env } from "../config/env.js";

/**
 * Normalizes an origin or referer URL string to protocol://host
 * e.g., "http://localhost:5173/" -> "http://localhost:5173"
 * @param {string} urlStr
 * @returns {string}
 */
export const normalizeOrigin = (urlStr) => {
  if (!urlStr || typeof urlStr !== "string") return "";
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return urlStr.trim().replace(/\/+$/, "").toLowerCase();
  }
};

/**
 * Returns list of allowed client origins normalized to protocol://host
 * @returns {string[]}
 */
export const getAllowedOrigins = () => {
  const raw = env.FRONTEND_URL || "http://localhost:5173";
  return raw
    .split(",")
    .map((s) => normalizeOrigin(s.trim()))
    .filter(Boolean);
};

/**
 * CSRF Protection Middleware
 *
 * Enforces strict Origin and Referer validation on state-changing mutation
 * requests (POST, PUT, DELETE, PATCH).
 *
 * Safe methods (GET, HEAD, OPTIONS) do not alter server state and are exempt.
 * In automated test suites (env.IS_TEST), calls without Origin/Referer headers
 * are permitted, but any explicit Origin/Referer is strictly checked.
 */
export const csrfProtection = (req, res, next) => {
  const method = req.method ? req.method.toUpperCase() : "GET";

  // Safe HTTP methods do not mutate server state
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let requestOrigin = "";
  if (originHeader) {
    requestOrigin = normalizeOrigin(originHeader);
  } else if (refererHeader) {
    try {
      requestOrigin = normalizeOrigin(new URL(refererHeader).origin);
    } catch {
      requestOrigin = "";
    }
  }

  // Permit programmatic test calls that do not provide browser headers
  if (env.IS_TEST && !originHeader && !refererHeader) {
    return next();
  }

  // Reject requests missing origin/referer in real browser contexts
  if (!requestOrigin) {
    return res.status(403).json({
      error: {
        code: "CSRF_FORBIDDEN",
        message: "State-changing request blocked: missing Origin or Referer header."
      }
    });
  }

  // Reject cross-site requests whose origin does not match allowed frontend
  const isAllowed = allowedOrigins.includes(requestOrigin);
  if (!isAllowed) {
    return res.status(403).json({
      error: {
        code: "CSRF_FORBIDDEN",
        message: `Cross-site request blocked: untrusted origin '${requestOrigin}'.`
      }
    });
  }

  next();
};
