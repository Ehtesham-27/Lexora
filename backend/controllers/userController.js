import { UserFavorite } from "../models/UserFavorite.js";
import { UserSearchHistory } from "../models/UserSearchHistory.js";
import { validateWord } from "../utils/normalizeWord.js";

const MAX_HISTORY_ENTRIES = 30;

/**
 * Prunes user search history so at most MAX_HISTORY_ENTRIES (30) remain
 * @param {import('mongoose').Types.ObjectId|string} userId
 */
const pruneUserHistory = async (userId) => {
  const excess = await UserSearchHistory.find({ userId })
    .sort({ searchedAt: -1 })
    .skip(MAX_HISTORY_ENTRIES)
    .select("_id");

  if (excess.length > 0) {
    const idsToDelete = excess.map((doc) => doc._id);
    await UserSearchHistory.deleteMany({ _id: { $in: idsToDelete } });
  }
};

/**
 * GET /api/user/favorites
 * Retrieve authenticated user's favorites
 */
export const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const favorites = await UserFavorite.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      favorites: favorites.map((fav) => (fav.toSafeObject ? fav.toSafeObject() : fav))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/favorites
 * Add a word to authenticated user's favorites
 */
export const addFavorite = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { word, phonetic, partOfSpeech, definition, audio } = req.body || {};

    const cleanWord = validateWord(word);

    // Check if already in favorites to be idempotent
    const existing = await UserFavorite.findOne({ userId, word: cleanWord });
    if (existing) {
      return res.status(200).json({
        message: "Word is already in favorites.",
        favorite: existing.toSafeObject ? existing.toSafeObject() : existing
      });
    }

    try {
      const newFav = await UserFavorite.create({
        userId,
        word: cleanWord,
        phonetic: typeof phonetic === "string" ? phonetic.trim() : "",
        partOfSpeech: typeof partOfSpeech === "string" ? partOfSpeech.trim() : "word",
        definition: typeof definition === "string" ? definition.trim() : "",
        audio: typeof audio === "string" && audio.trim() ? audio.trim() : null
      });

      return res.status(201).json({
        message: "Favorite added successfully.",
        favorite: newFav.toSafeObject ? newFav.toSafeObject() : newFav
      });
    } catch (err) {
      // Handle concurrent duplicate key race gracefully
      if (err.code === 11000) {
        const found = await UserFavorite.findOne({ userId, word: cleanWord });
        return res.status(200).json({
          message: "Word is already in favorites.",
          favorite: found ? (found.toSafeObject ? found.toSafeObject() : found) : null
        });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/user/favorites/:word
 * Remove a word from authenticated user's favorites
 */
export const removeFavorite = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cleanWord = validateWord(req.params.word);

    await UserFavorite.deleteOne({ userId, word: cleanWord });

    res.status(200).json({
      message: "Favorite removed successfully.",
      word: cleanWord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/favorites/check/:word
 * Check if a word is saved in authenticated user's favorites
 */
export const checkFavorite = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cleanWord = validateWord(req.params.word);

    const exists = await UserFavorite.findOne({ userId, word: cleanWord });

    res.status(200).json({
      isFavorite: !!exists,
      word: cleanWord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/history
 * Retrieve authenticated user's recent search history (max 30)
 */
export const getHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const entries = await UserSearchHistory.find({ userId })
      .sort({ searchedAt: -1 })
      .limit(MAX_HISTORY_ENTRIES);

    const historyWords = entries.map((entry) => entry.word);

    res.status(200).json({
      history: historyWords,
      entries: entries.map((entry) => (entry.toSafeObject ? entry.toSafeObject() : entry))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/history
 * Record a successful search in authenticated user's history
 */
export const recordSearchHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cleanWord = validateWord(req.body?.word);

    // Upsert: moves existing word to newest timestamp, or inserts fresh
    const updated = await UserSearchHistory.findOneAndUpdate(
      { userId, word: cleanWord },
      { searchedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Enforce 30-entry cap
    await pruneUserHistory(userId);

    res.status(201).json({
      message: "Search history recorded successfully.",
      word: cleanWord,
      searchedAt: updated.searchedAt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/user/history/:word
 * Remove an individual entry from search history
 */
export const removeHistoryEntry = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cleanWord = validateWord(req.params.word);

    await UserSearchHistory.deleteOne({ userId, word: cleanWord });

    res.status(200).json({
      message: "History entry removed successfully.",
      word: cleanWord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/user/history
 * Clear entire search history for authenticated user
 */
export const clearHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await UserSearchHistory.deleteMany({ userId });

    res.status(200).json({
      message: "Search history cleared successfully."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/migrate
 * Batch import and merge local storage favorites & history into authenticated account
 */
export const migrateUserData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { favorites = [], history = [] } = req.body || {};

    let migratedFavoritesCount = 0;
    let migratedHistoryCount = 0;

    // 1. Process local favorites safely
    if (Array.isArray(favorites)) {
      for (const item of favorites) {
        try {
          const rawWord = typeof item === "string" ? item : item?.word;
          const cleanWord = validateWord(rawWord);

          const existing = await UserFavorite.findOne({ userId, word: cleanWord });
          if (!existing) {
            await UserFavorite.create({
              userId,
              word: cleanWord,
              phonetic: typeof item?.phonetic === "string" ? item.phonetic.trim() : "",
              partOfSpeech: typeof item?.partOfSpeech === "string" ? item.partOfSpeech.trim() : "word",
              definition: typeof item?.definition === "string" ? item.definition.trim() : "",
              audio: typeof item?.audio === "string" && item.audio.trim() ? item.audio.trim() : null
            });
            migratedFavoritesCount++;
          }
        } catch {
          // Skip invalid words in local storage without failing the batch
        }
      }
    }

    // 2. Process local history safely (preserving order, up to 30 items)
    if (Array.isArray(history)) {
      // Reverse iterate so the first item in the array ends up with the most recent timestamp
      const reversedHistory = [...history].reverse();
      let index = 0;
      for (const item of reversedHistory) {
        try {
          const rawWord = typeof item === "string" ? item : item?.word;
          const cleanWord = validateWord(rawWord);

          // Stagger timestamps slightly to preserve original recency order
          const timestamp = new Date(Date.now() - (reversedHistory.length - index) * 1000);
          await UserSearchHistory.findOneAndUpdate(
            { userId, word: cleanWord },
            { searchedAt: timestamp },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          migratedHistoryCount++;
          index++;
        } catch {
          // Skip invalid items in local storage
        }
      }
      await pruneUserHistory(userId);
    }

    res.status(200).json({
      message: "Data migration completed successfully.",
      migratedFavoritesCount,
      migratedHistoryCount
    });
  } catch (error) {
    next(error);
  }
};
