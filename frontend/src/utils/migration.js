import { getStorageItem, setStorageItem, removeStorageItem } from "./localStorage.js";
import { userService } from "../services/userService.js";

export const FAVORITES_STORAGE_KEY = "lexora_favorites";
export const HISTORY_STORAGE_KEY = "lexora_history";
export const MIGRATION_FLAG_PREFIX = "lexora_migrated_user_";

/**
 * Checks and performs safe, idempotent migration of localStorage data to MongoDB
 * @param {string} userId - Authenticated user's unique ID
 * @returns {Promise<{ migrated: boolean, result?: Object, error?: Error }>}
 */
export async function syncLocalDataToServer(userId) {
  if (!userId) {
    return { migrated: false };
  }

  const migrationKey = `${MIGRATION_FLAG_PREFIX}${userId}`;
  const alreadyMigrated = getStorageItem(migrationKey, false);

  if (alreadyMigrated) {
    return { migrated: false };
  }

  // 1. Read local storage data safely
  const localFavorites = getStorageItem(FAVORITES_STORAGE_KEY, []);
  const localHistory = getStorageItem(HISTORY_STORAGE_KEY, []);

  const hasFavorites = Array.isArray(localFavorites) && localFavorites.length > 0;
  const hasHistory = Array.isArray(localHistory) && localHistory.length > 0;

  // If no local data exists, mark migrated and exit
  if (!hasFavorites && !hasHistory) {
    setStorageItem(migrationKey, true);
    return { migrated: false };
  }

  try {
    // 2. Call backend migration endpoint with local data
    const result = await userService.migrateUserData(localFavorites, localHistory);

    // 3. Confirm success (backend returned 200 with result)
    if (result && typeof result.migratedFavoritesCount === "number") {
      // 4. Mark migration as complete for this user
      setStorageItem(migrationKey, true);
      // Clean up legacy unauthenticated keys to prevent leaking or re-importing
      removeStorageItem(FAVORITES_STORAGE_KEY);
      removeStorageItem(HISTORY_STORAGE_KEY);
      return { migrated: true, result };
    }

    return { migrated: false };
  } catch (err) {
    // If migration failed: DO NOT delete local storage! Allow retry.
    console.warn("[Migration] Local data migration failed, preserving local data for retry:", err.message);
    return { migrated: false, error: err };
  }
}
