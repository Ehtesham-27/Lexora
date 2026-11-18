import { verifyToken, COOKIE_NAME } from "../utils/token.js";
import { User } from "../models/User.js";

/**
 * Authentication middleware verifying JWT cookie or Bearer token
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    // Also support Bearer header for programmatic clients
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. Please sign in."
        }
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res.status(401).json({
          error: {
            code: "TOKEN_EXPIRED",
            message: "Your session has expired. Please sign in again."
          }
        });
      }
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid session token. Please sign in again."
        }
      });
    }

    // Verify user still exists in database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "Account no longer exists."
        }
      });
    }

    // Attach authenticated user identity to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
