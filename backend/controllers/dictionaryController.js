import { env } from "../config/env.js";
import { dictionaryService } from "../services/dictionaryService.js";
import { dailyWordService } from "../services/dailyWordService.js";

/**
 * Controller to handle persistent Word of the Day
 * GET /api/dictionary/word-of-the-day
 */
export const getWordOfTheDay = async (_req, res, next) => {
  try {
    const dailyWord = await dailyWordService.getDailyWord();
    res.status(200).json(dailyWord);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle word definition retrieval
 * GET /api/dictionary/:word
 */
export const getWord = async (req, res, next) => {
  try {
    const { word } = req.params;
    const result = await dictionaryService.lookupWord(word);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to retrieve aggregate cache diagnostics
 * GET /api/cache/stats
 * Disabled in production environments for security hardening
 */
export const getCacheStats = async (req, res, next) => {
  try {
    if (env.IS_PROD) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Cache diagnostics endpoint is disabled in production environments."
        }
      });
    }

    const stats = await dictionaryService.getCacheStats();
    res.status(200).json({
      status: "ok",
      cache: stats
    });
  } catch (error) {
    next(error);
  }
};
