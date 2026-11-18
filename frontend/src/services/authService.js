/**
 * Lexora Auth Service
 * Handles all authentication API calls to the Lexora Express backend.
 * All requests include credentials (HttpOnly cookie) for session management.
 */

const getApiBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof process !== "undefined" && process.env && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  return "http://localhost:5000/api";
};

/**
 * Shared fetch wrapper — always sends cookies, always expects JSON.
 * Maps backend error shapes to thrown Error objects with .code and .message.
 */
async function authFetch(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    const err = new Error("Unable to reach Lexora servers. Check your internet connection.");
    err.code = "NETWORK_ERROR";
    throw err;
  }

  let body;
  try {
    body = await response.json();
  } catch {
    const err = new Error("Received an unexpected response from the server.");
    err.code = "PARSE_ERROR";
    err.status = response?.status;
    throw err;
  }

  if (!response.ok) {
    // Backend error shape: { error: { code, message, details? } }
    const errPayload = body?.error || {};
    const err = new Error(errPayload.message || "An unexpected error occurred.");
    err.code = errPayload.code || `HTTP_${response.status}`;
    err.status = response.status;
    if (errPayload.details) err.details = errPayload.details;
    throw err;
  }

  return body;
}

/**
 * Register a new user.
 * @returns {Promise<{message: string, user: object}>}
 */
export async function register(name, email, password, confirmPassword) {
  return authFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, confirmPassword }),
  });
}

/**
 * Log in an existing user.
 * @returns {Promise<{message: string, user: object}>}
 */
export async function login(email, password) {
  return authFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Restore the current session by calling GET /auth/me.
 * Returns the user object if the cookie is valid, or null on 401.
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    const data = await authFetch("/auth/me", { method: "GET" });
    return data?.user ?? null;
  } catch (err) {
    // 401 Unauthorized — no active session
    if (
      err.status === 401 ||
      err.code === "HTTP_401" ||
      err.code === "UNAUTHORIZED" ||
      err.code === "TOKEN_EXPIRED" ||
      err.code === "INVALID_TOKEN" ||
      err.code === "USER_NOT_FOUND"
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Log out the current user (clears HttpOnly cookie).
 * @returns {Promise<{message: string}>}
 */
export async function logout() {
  return authFetch("/auth/logout", { method: "POST" });
}
