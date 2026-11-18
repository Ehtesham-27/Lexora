import { env } from "../config/env.js";
import { WordCache } from "../models/WordCache.js";

// In-flight request de-duplication map: word -> Promise
const pendingRequests = new Map();

/**
 * Validates and normalizes user input for a dictionary word search
 * @param {string} rawWord
 * @returns {string} normalized lowercase word
 */
export const validateWord = (rawWord) => {
  if (typeof rawWord !== "string") {
    const error = new Error("Word parameter must be a string.");
    error.statusCode = 400;
    error.code = "INVALID_WORD";
    throw error;
  }

  const trimmed = rawWord.trim().toLowerCase();

  if (trimmed.length === 0) {
    const error = new Error("Word parameter cannot be empty.");
    error.statusCode = 400;
    error.code = "INVALID_WORD";
    throw error;
  }

  if (trimmed.length > 50) {
    const error = new Error("Word exceeds maximum allowed length of 50 characters.");
    error.statusCode = 400;
    error.code = "INVALID_WORD";
    throw error;
  }

  // Allow alphabetic characters, hyphens, spaces, and apostrophes (e.g., "mother-in-law", "o'clock")
  // Reject URL schemes, slashes, numbers, or injection symbols
  const validPattern = /^[a-zA-Z\s'-]+$/;
  if (!validPattern.test(trimmed)) {
    const error = new Error("Word contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.");
    error.statusCode = 400;
    error.code = "INVALID_WORD";
    throw error;
  }

  return trimmed;
};

/**
 * Normalizes raw upstream dictionary response into the standard Lexora schema
 * @param {Array} rawEntries
 * @param {string} searchedWord
 * @returns {Object} normalized dictionary data
 */
export const normalizeDictionaryResponse = (rawEntries, searchedWord) => {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    const err = new Error(`Malformed upstream dictionary response for "${searchedWord}".`);
    err.statusCode = 502;
    err.code = "UPSTREAM_ERROR";
    throw err;
  }

  const primary = rawEntries[0];
  const word = (primary.word || searchedWord).toLowerCase();

  // 1. Resolve phonetic spelling
  let phoneticText = primary.phonetic || "";
  if (!phoneticText && Array.isArray(primary.phonetics)) {
    const textEntry = primary.phonetics.find((p) => p.text && p.text.trim().length > 0);
    if (textEntry) phoneticText = textEntry.text;
  }

  // 2. Resolve audio pronunciation
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

  // 3. Normalize meanings by part of speech
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

        if (Array.isArray(meaning.synonyms)) {
          meaning.synonyms.forEach((s) => s && currentPos.synonyms.add(s.trim()));
        }
        if (Array.isArray(meaning.antonyms)) {
          meaning.antonyms.forEach((a) => a && currentPos.antonyms.add(a.trim()));
        }

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

  const formattedMeanings = Array.from(meaningsMap.values())
    .map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions,
      synonyms: Array.from(m.synonyms),
      antonyms: Array.from(m.antonyms)
    }))
    .filter((m) => m.definitions.length > 0);

  return {
    word,
    phonetic: phoneticText,
    audio: audioUrl,
    allPhonetics,
    meanings: formattedMeanings,
    sourceUrls: primary.sourceUrls || []
  };
};

/**
 * Fetches raw word definition from the Free Dictionary API
 * @param {string} word
 * @returns {Promise<Array>} raw upstream entries
 */
export const fetchFromUpstream = async (word) => {
  const url = `${env.DICTIONARY_API_BASE_URL}/${encodeURIComponent(word)}`;
  const controller = new AbortController();
  const timeoutMs = 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Lexora-Backend/1.0"
      }
    });

    clearTimeout(timer);

    if (response.status === 404) {
      const err = new Error(`No definition found for "${word}".`);
      err.statusCode = 404;
      err.code = "WORD_NOT_FOUND";
      throw err;
    }

    if (response.status === 429) {
      const err = new Error("Upstream dictionary rate limit reached. Please try again shortly.");
      err.statusCode = 429;
      err.code = "UPSTREAM_RATE_LIMITED";
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`Upstream dictionary provider returned error (${response.status}).`);
      err.statusCode = 502;
      err.code = "UPSTREAM_ERROR";
      throw err;
    }

    let rawData;
    try {
      rawData = await response.json();
    } catch {
      const err = new Error("Upstream dictionary provider returned malformed JSON.");
      err.statusCode = 502;
      err.code = "UPSTREAM_ERROR";
      throw err;
    }

    return rawData;
  } catch (error) {
    clearTimeout(timer);

    if (error.name === "AbortError") {
      const timeoutErr = new Error("Upstream dictionary provider request timed out.");
      timeoutErr.statusCode = 504;
      timeoutErr.code = "UPSTREAM_TIMEOUT";
      throw timeoutErr;
    }

    // Pass through structured errors
    if (error.statusCode) {
      throw error;
    }

    // Other network errors (DNS, offline, connection refused)
    const netErr = new Error("Failed to communicate with external dictionary service.");
    netErr.statusCode = 502;
    netErr.code = "UPSTREAM_ERROR";
    throw netErr;
  }
};

export const dictionaryService = {
  /**
   * Performs word lookup with cache check, upstream fetch on miss, and deduplication
   * @param {string} rawWord
   * @returns {Promise<Object>}
   */
  async lookupWord(rawWord) {
    const normalizedWord = validateWord(rawWord);

    // 1. Check MongoDB Cache
    try {
      const cached = await WordCache.findOne({ word: normalizedWord });

      if (cached) {
        const isExpired = new Date(cached.expiresAt).getTime() <= Date.now();

        if (!isExpired && cached.response) {
          return {
            ...cached.response,
            source: "cache"
          };
        }
      }
    } catch (dbErr) {
      // Graceful degradation: If MongoDB is down or fails, continue to upstream
      console.warn(`[DictionaryService] Cache lookup failed for "${normalizedWord}":`, dbErr.message);
    }

    // 2. Upstream fetch with in-flight request deduplication
    if (pendingRequests.has(normalizedWord)) {
      // Coalesce duplicate concurrent requests to the same in-flight promise
      return pendingRequests.get(normalizedWord);
    }

    const requestPromise = (async () => {
      try {
        const rawEntries = await fetchFromUpstream(normalizedWord);
        const normalizedData = normalizeDictionaryResponse(rawEntries, normalizedWord);

        // 3. Cache successful response in MongoDB
        try {
          const ttlMs = env.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + ttlMs);

          await WordCache.findOneAndUpdate(
            { word: normalizedWord },
            {
              word: normalizedWord,
              response: normalizedData,
              fetchedAt: now,
              expiresAt
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true
            }
          );
        } catch (cacheWriteErr) {
          console.warn(`[DictionaryService] Cache write failed for "${normalizedWord}":`, cacheWriteErr.message);
        }

        return {
          ...normalizedData,
          source: "upstream"
        };
      } finally {
        pendingRequests.delete(normalizedWord);
      }
    })();

    pendingRequests.set(normalizedWord, requestPromise);
    return requestPromise;
  },

  /**
   * Aggregate statistics about cached words
   * @returns {Promise<Object>}
   */
  async getCacheStats() {
    const now = new Date();

    const [totalCachedWords, validEntries, expiredEntries] = await Promise.all([
      WordCache.countDocuments({}),
      WordCache.countDocuments({ expiresAt: { $gt: now } }),
      WordCache.countDocuments({ expiresAt: { $lte: now } })
    ]);

    return {
      totalCachedWords,
      validEntries,
      expiredEntries,
      ttlDays: env.CACHE_TTL_DAYS
    };
  },

  // Export internal map for testing concurrency
  _pendingRequests: pendingRequests
};
