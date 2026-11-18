/**
 * Lexora User Data Service
 * Handles all authenticated user data API calls (Favorites, Search History, Migration)
 * All requests include credentials (HttpOnly cookie) for authorization.
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
 * Shared fetch wrapper for user endpoints
 */
async function userFetch(path, options = {}) {
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
        ...(options.headers || {})
      }
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
    const errPayload = body?.error || {};
    const err = new Error(errPayload.message || "An unexpected error occurred.");
    err.code = errPayload.code || `HTTP_${response.status}`;
    err.status = response.status;
    if (errPayload.details) err.details = errPayload.details;
    throw err;
  }

  return body;
}

export const userService = {
  /**
   * Fetch authenticated user's favorites from MongoDB
   * @returns {Promise<Array>} list of favorite objects
   */
  async getFavorites() {
    const data = await userFetch("/user/favorites", { method: "GET" });
    return data?.favorites || [];
  },

  /**
   * Add a word to authenticated user's favorites
   * @param {Object} favoriteData
   * @returns {Promise<Object>}
   */
  async addFavorite(favoriteData) {
    const payload = typeof favoriteData === "string" ? { word: favoriteData } : favoriteData;
    const data = await userFetch("/user/favorites", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return data?.favorite;
  },

  /**
   * Remove a word from authenticated user's favorites
   * @param {string} word
   * @returns {Promise<Object>}
   */
  async removeFavorite(word) {
    const cleanWord = encodeURIComponent(String(word).trim().toLowerCase());
    return userFetch(`/user/favorites/${cleanWord}`, { method: "DELETE" });
  },

  /**
   * Check if a word is in authenticated user's favorites
   * @param {string} word
   * @returns {Promise<boolean>}
   */
  async checkFavorite(word) {
    const cleanWord = encodeURIComponent(String(word).trim().toLowerCase());
    const data = await userFetch(`/user/favorites/check/${cleanWord}`, { method: "GET" });
    return !!data?.isFavorite;
  },

  /**
   * Fetch authenticated user's recent search history (max 30)
   * @returns {Promise<{history: Array<string>, entries: Array<Object>}>}
   */
  async getHistory() {
    const data = await userFetch("/user/history", { method: "GET" });
    return {
      history: Array.isArray(data?.history) ? data.history : [],
      entries: Array.isArray(data?.entries) ? data.entries : []
    };
  },

  /**
   * Record a successful search in authenticated user's history
   * @param {string} word
   * @returns {Promise<Object>}
   */
  async recordSearch(word) {
    const cleanWord = String(word).trim().toLowerCase();
    return userFetch("/user/history", {
      method: "POST",
      body: JSON.stringify({ word: cleanWord })
    });
  },

  /**
   * Remove an individual entry from search history
   * @param {string} word
   * @returns {Promise<Object>}
   */
  async removeHistoryEntry(word) {
    const cleanWord = encodeURIComponent(String(word).trim().toLowerCase());
    return userFetch(`/user/history/${cleanWord}`, { method: "DELETE" });
  },

  /**
   * Clear all search history for authenticated user
   * @returns {Promise<Object>}
   */
  async clearHistory() {
    return userFetch("/user/history", { method: "DELETE" });
  },

  /**
   * Batch migrate local favorites and history to MongoDB
   * @param {Array} favorites
   * @param {Array} history
   * @returns {Promise<Object>}
   */
  async migrateUserData(favorites = [], history = []) {
    return userFetch("/user/migrate", {
      method: "POST",
      body: JSON.stringify({ favorites, history })
    });
  }
};
