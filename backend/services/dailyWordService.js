import { DailyWord } from "../models/DailyWord.js";
import { dictionaryService } from "./dictionaryService.js";
import { curatedDailyWords } from "../data/curatedDailyWords.js";

// In-flight deduplication map for daily word generation per dateKey
const inFlightDailyRequests = new Map();

/**
 * Returns current UTC calendar date formatted as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export const getUtcDateKey = (date = new Date()) => {
  return date.toISOString().split("T")[0];
};

/**
 * Deterministically computes an initial candidate index from date string
 * @param {string} dateKey
 * @returns {number}
 */
export const computeDateHash = (dateKey = "") => {
  if (!dateKey || typeof dateKey !== "string") return 0;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 0;
};

/**
 * Formats a DailyWord Mongoose document or plain object into client response contract
 * @param {Object} record
 * @returns {Object}
 */
export const formatDailyWordResponse = (record) => {
  const dict = record.dictionaryData || {};
  return {
    date: record.date,
    word: record.word,
    phonetic: dict.phonetic || "",
    audio: dict.audio || null,
    allPhonetics: dict.allPhonetics || [],
    meanings: dict.meanings || [],
    sourceUrls: dict.sourceUrls || [],
    source: "daily"
  };
};

export const dailyWordService = {
  /**
   * Retrieves today's persistent Word of the Day, selecting and caching one if absent
   * @param {string} [overrideDateKey] Optional dateKey for testing date transitions
   * @returns {Promise<Object>}
   */
  async getDailyWord(overrideDateKey) {
    const dateKey = overrideDateKey || getUtcDateKey();

    // 1. Check if today's record already exists in MongoDB
    try {
      const existing = await DailyWord.findOne({ date: dateKey });
      if (existing) {
        return formatDailyWordResponse(existing);
      }
    } catch (dbErr) {
      console.warn(`[DailyWordService] Failed to query DailyWord for ${dateKey}:`, dbErr.message);
    }

    // 2. Coalesce concurrent in-flight generation requests for the same date
    if (inFlightDailyRequests.has(dateKey)) {
      return inFlightDailyRequests.get(dateKey);
    }

    const generationPromise = (async () => {
      try {
        // Double-check existence inside generation lock in case another request resolved
        try {
          const secondCheck = await DailyWord.findOne({ date: dateKey });
          if (secondCheck) {
            return formatDailyWordResponse(secondCheck);
          }
        } catch {}

        // 3. Find recently used words from past 7 days to avoid immediate repeats
        const recentWords = new Set();
        try {
          const recentDocs = await DailyWord.find({ date: { $ne: dateKey } })
            .sort({ date: -1 })
            .limit(7)
            .select("word");

          recentDocs.forEach((d) => recentWords.add(d.word.toLowerCase()));
        } catch (recentErr) {
          console.warn("[DailyWordService] Could not fetch recent words:", recentErr.message);
        }

        // 4. Select candidate word from curated pool with retry limit
        const poolSize = curatedDailyWords?.length || 1;
        const baseIndex = (computeDateHash(dateKey) || 0) % poolSize;
        const maxRetries = Math.min(5, poolSize);
        let selectedWord = null;
        let resolvedDictionaryData = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const candidateIndex = (baseIndex + attempt) % poolSize;
          const candidate = curatedDailyWords[candidateIndex].toLowerCase();

          // Avoid words used in the past 7 days unless all candidates are exhausted
          if (attempt < maxRetries - 1 && recentWords.has(candidate)) {
            continue;
          }

          try {
            const data = await dictionaryService.lookupWord(candidate);
            if (data && data.word) {
              selectedWord = candidate;
              resolvedDictionaryData = data;
              break;
            }
          } catch (lookupErr) {
            console.warn(`[DailyWordService] Candidate "${candidate}" failed lookup:`, lookupErr.message);
          }
        }

        if (!selectedWord || !resolvedDictionaryData) {
          const error = new Error("Unable to retrieve a valid Word of the Day at this time.");
          error.statusCode = 503;
          error.code = "DAILY_WORD_UNAVAILABLE";
          throw error;
        }

        // 5. Persist to MongoDB with race-condition handling
        let savedRecord;
        try {
          savedRecord = await DailyWord.create({
            date: dateKey,
            word: selectedWord,
            dictionaryData: resolvedDictionaryData
          });
        } catch (insertErr) {
          // If another concurrent request inserted the record first (Mongo E11000)
          if (insertErr.code === 11000) {
            console.log(`[DailyWordService] Duplicate key race detected for ${dateKey}; retrieving winning record.`);
            const winningRecord = await DailyWord.findOne({ date: dateKey });
            if (winningRecord) {
              return formatDailyWordResponse(winningRecord);
            }
          }
          throw insertErr;
        }

        return formatDailyWordResponse(savedRecord);
      } finally {
        inFlightDailyRequests.delete(dateKey);
      }
    })();

    inFlightDailyRequests.set(dateKey, generationPromise);
    return generationPromise;
  },

  // Export in-flight map for concurrency testing
  _inFlightDailyRequests: inFlightDailyRequests
};
