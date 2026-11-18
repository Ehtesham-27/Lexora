/**
 * Lexora Dictionary Service
 * Centralizes all dictionary API interactions via the Lexora Express backend proxy,
 * response normalization, and stable Word of the Day retrieval.
 */

import { mockDictionary } from "../data/mockDictionary.js";

// Configurable API base URL: defaults to VITE_API_BASE_URL or local Express backend
const getApiBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof process !== "undefined" && process.env && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  return "http://localhost:5000/api";
};

// In-memory request cache to prevent duplicate network calls during a session
const cache = new Map();

// Active AbortController to cancel previous in-flight searches on rapid clicks/keystrokes
let activeAbortController = null;

/**
 * Normalizes raw API response into a clean, predictable shape for Lexora UI components
 * Preserved for compatibility and client-side normalization testing
 * @param {Array} rawEntries
 * @param {string} searchedWord
 * @returns {Object}
 */
export const normalizeDictionaryResponse = (rawEntries, searchedWord) => {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    throw new Error(`Invalid response format for "${searchedWord}".`);
  }

  const primary = rawEntries[0];
  const word = primary.word || searchedWord;

  // 1. Resolve phonetic text
  let phoneticText = primary.phonetic || "";
  if (!phoneticText && Array.isArray(primary.phonetics)) {
    const textEntry = primary.phonetics.find((p) => p.text && p.text.trim().length > 0);
    if (textEntry) phoneticText = textEntry.text;
  }

  // 2. Resolve pronunciation audio URL (find first valid non-empty audio)
  let audioUrl = null;
  const allPhonetics = [];

  rawEntries.forEach((entry) => {
    if (Array.isArray(entry.phonetics)) {
      entry.phonetics.forEach((p) => {
        let cleanAudio = (p.audio || "").trim();
        if (cleanAudio.startsWith("//")) {
          cleanAudio = `https:${cleanAudio}`;
        }
        if (cleanAudio && (cleanAudio.endsWith(".mp3") || cleanAudio.endsWith(".wav") || cleanAudio.startsWith("http"))) {
          if (!audioUrl) {
            audioUrl = cleanAudio;
          }
        }
        if (p.text || cleanAudio) {
          allPhonetics.push({
            text: p.text || "",
            audio: cleanAudio || null
          });
        }
      });
    }
  });

  // 3. Normalize meanings across all returned entries
  const meaningsMap = new Map();

  rawEntries.forEach((entry) => {
    if (Array.isArray(entry.meanings)) {
      entry.meanings.forEach((meaning) => {
        const pos = (meaning.partOfSpeech || "general").toLowerCase().trim();

        if (!meaningsMap.has(pos)) {
          meaningsMap.set(pos, {
            partOfSpeech: pos,
            definitions: [],
            synonyms: new Set(),
            antonyms: new Set()
          });
        }

        const currentPos = meaningsMap.get(pos);

        // Collect meaning-level synonyms/antonyms
        if (Array.isArray(meaning.synonyms)) {
          meaning.synonyms.forEach((s) => s && currentPos.synonyms.add(s.trim()));
        }
        if (Array.isArray(meaning.antonyms)) {
          meaning.antonyms.forEach((a) => a && currentPos.antonyms.add(a.trim()));
        }

        // Process definitions
        if (Array.isArray(meaning.definitions)) {
          meaning.definitions.forEach((def) => {
            const defText = (def.definition || "").trim();
            if (!defText) return;

            const exampleText = (def.example || "").trim();
            const defSynonyms = Array.isArray(def.synonyms)
              ? def.synonyms.filter(Boolean).map((s) => s.trim())
              : [];
            const defAntonyms = Array.isArray(def.antonyms)
              ? def.antonyms.filter(Boolean).map((a) => a.trim())
              : [];

            // Add definition if not duplicate
            const alreadyExists = currentPos.definitions.some((d) => d.definition === defText);
            if (!alreadyExists) {
              currentPos.definitions.push({
                definition: defText,
                example: exampleText || null,
                synonyms: defSynonyms,
                antonyms: defAntonyms
              });
            }
          });
        }
      });
    }
  });

  // Convert meanings map to structured array
  const formattedMeanings = Array.from(meaningsMap.values())
    .map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions,
      synonyms: Array.from(m.synonyms),
      antonyms: Array.from(m.antonyms)
    }))
    .filter((m) => m.definitions.length > 0);

  return {
    word: word.toLowerCase(),
    phonetic: phoneticText,
    audio: audioUrl,
    allPhonetics,
    meanings: formattedMeanings,
    sourceUrls: primary.sourceUrls || []
  };
};

export const dictionaryService = {
  /**
   * Search for a word using Lexora backend proxy with caching, aborting, and error mapping
   * @param {string} rawWord
   * @returns {Promise<Object>}
   */
  async searchWord(rawWord) {
    if (typeof rawWord !== "string") {
      const err = new Error("Please enter a valid word to search.");
      err.code = "INVALID_INPUT";
      throw err;
    }

    const normalized = rawWord.trim().toLowerCase();
    if (normalized.length === 0) {
      const err = new Error("Please enter a word to search.");
      err.code = "EMPTY_INPUT";
      throw err;
    }

    // 1. Check in-memory session cache first for instant response
    if (cache.has(normalized)) {
      return cache.get(normalized);
    }

    // 2. Cancel previous in-flight request to avoid race conditions
    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();
    const { signal } = activeAbortController;

    const baseUrl = getApiBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/dictionary/${encodeURIComponent(normalized)}`, {
        signal,
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      // Handle 404: Word Not Found
      if (response.status === 404) {
        if (mockDictionary[normalized]) {
          const fallback = mockDictionary[normalized];
          cache.set(normalized, fallback);
          return fallback;
        }

        const notFoundErr = new Error(`No definition found for "${rawWord.trim()}".`);
        notFoundErr.code = "NOT_FOUND";
        notFoundErr.word = normalized;
        throw notFoundErr;
      }

      // Handle other non-200 HTTP statuses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const apiErr = new Error(
          errorData.error?.message || errorData.message || `Dictionary API request failed (${response.status}).`
        );
        apiErr.code = errorData.error?.code || "API_ERROR";
        apiErr.status = response.status;
        throw apiErr;
      }

      const data = await response.json();
      const normalizedResult = Array.isArray(data)
        ? normalizeDictionaryResponse(data, normalized)
        : data;

      // Cache successful response in local session cache
      cache.set(normalized, normalizedResult);
      return normalizedResult;
    } catch (err) {
      // If request was aborted because a newer search was initiated, rethrow silently
      if (err.name === "AbortError") {
        const abortErr = new Error("Search superseded");
        abortErr.code = "ABORTED";
        throw abortErr;
      }

      // If network failure occurred (offline, DNS, timeout, backend server offline), try curated fallback if available
      if (err.code !== "NOT_FOUND" && err.code !== "INVALID_INPUT" && err.code !== "EMPTY_INPUT") {
        if (mockDictionary[normalized]) {
          const fallback = mockDictionary[normalized];
          cache.set(normalized, fallback);
          return fallback;
        }

        // Provide clear network error message
        const networkErr = new Error("Unable to connect to dictionary service. Please verify your internet connection.");
        networkErr.code = "NETWORK_ERROR";
        networkErr.originalError = err;
        throw networkErr;
      }

      throw err;
    } finally {
      activeAbortController = null;
    }
  },

  /**
   * Get the persistent Word of the Day from the Lexora backend API
   * Ensures every client sees the exact same word for today's UTC calendar date
   * @returns {Promise<Object>}
   */
  async getWordOfTheDay() {
    const baseUrl = getApiBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/dictionary/word-of-the-day`, {
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(
          errorData.error?.message || errorData.message || `Failed to fetch Word of the Day (${response.status}).`
        );
        err.code = errorData.error?.code || "WOTD_ERROR";
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      // In offline / network disconnected environments during unit tests or offline usage,
      // fallback to curated entry to ensure resilient offline UX
      if (err.code !== "WOTD_ERROR") {
        console.warn("[DictionaryService] Backend Word of the Day unavailable, using offline fallback:", err.message);
        return mockDictionary.petrichor;
      }
      throw err;
    }
  }
};
