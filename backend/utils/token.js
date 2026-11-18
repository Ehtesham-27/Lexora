import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const COOKIE_NAME = "lexora_token";
export const TOKEN_EXPIRY = "7d";
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * Signs a JWT with user payload
 * @param {Object} payload
 * @returns {string}
 */
export const signToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

/**
 * Verifies a JWT token
 * @param {string} token
 * @returns {Object} decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Sets the authentication cookie on the Express response
 * @param {import('express').Response} res
 * @param {string} token
 */
export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.IS_PROD,
    sameSite: env.IS_PROD ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  });
};

/**
 * Clears the authentication cookie from the Express response
 * @param {import('express').Response} res
 */
export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.IS_PROD,
    sameSite: env.IS_PROD ? "none" : "lax",
    path: "/"
  });
};
