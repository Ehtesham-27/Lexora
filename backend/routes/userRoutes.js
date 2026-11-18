import { Router } from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  getHistory,
  recordSearchHistory,
  removeHistoryEntry,
  clearHistory,
  migrateUserData
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

// All user data routes require authentication via HttpOnly cookie or Bearer token
router.use(requireAuth);

// Favorites endpoints
router.get("/favorites", getFavorites);
router.post("/favorites", addFavorite);
router.delete("/favorites/:word", removeFavorite);
router.get("/favorites/check/:word", checkFavorite);

// Search history endpoints
router.get("/history", getHistory);
router.post("/history", recordSearchHistory);
router.delete("/history/:word", removeHistoryEntry);
router.delete("/history", clearHistory);

// Migration endpoint for local data synchronization
router.post("/migrate", migrateUserData);

export default router;
