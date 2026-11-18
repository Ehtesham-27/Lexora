import { Router } from "express";
import { getWord, getWordOfTheDay, getCacheStats } from "../controllers/dictionaryController.js";

const router = Router();

// Specific routes must come before parameterized :word route
router.get("/dictionary/word-of-the-day", getWordOfTheDay);
router.get("/dictionary/:word", getWord);
router.get("/cache/stats", getCacheStats);

export default router;
