import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Rate limiter for sensitive authentication endpoints (register, login)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.IS_TEST ? 1000 : 50, // Sensible limit: 50 requests per 15 min in dev/prod
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.IS_TEST,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again after 15 minutes."
    }
  }
});

/**
 * General API rate limiter for standard dictionary and user endpoints
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.IS_TEST ? 5000 : 300, // 300 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.IS_TEST,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later."
    }
  }
});
