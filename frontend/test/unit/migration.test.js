import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  syncLocalDataToServer,
  FAVORITES_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  MIGRATION_FLAG_PREFIX
} from "../../src/utils/migration.js";
import { setStorageItem, getStorageItem } from "../../src/utils/localStorage.js";
import { userService } from "../../src/services/userService.js";

describe("LocalStorage to Server Migration Tests", () => {
  const originalWindow = globalThis.window;
  let mockStorage;

  beforeEach(() => {
    mockStorage = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (k) => mockStorage.get(k) ?? null,
        setItem: (k, v) => mockStorage.set(k, String(v)),
        removeItem: (k) => mockStorage.delete(k),
        clear: () => mockStorage.clear()
      }
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("returns migrated: false when userId is not provided", async () => {
    const res = await syncLocalDataToServer(null);
    assert.equal(res.migrated, false);
  });

  it("skips migration if user account has already been marked as migrated", async () => {
    const userId = "u123";
    setStorageItem(`${MIGRATION_FLAG_PREFIX}${userId}`, true);

    let called = false;
    const originalMigrate = userService.migrateUserData;
    userService.migrateUserData = async () => {
      called = true;
      return { migratedFavoritesCount: 0, migratedHistoryCount: 0 };
    };

    const res = await syncLocalDataToServer(userId);
    userService.migrateUserData = originalMigrate;

    assert.equal(res.migrated, false);
    assert.equal(called, false);
  });

  it("sets migration flag and exits if no local data exists", async () => {
    const userId = "u123";
    // Storage has no favorites or history
    const res = await syncLocalDataToServer(userId);

    assert.equal(res.migrated, false);
    assert.equal(getStorageItem(`${MIGRATION_FLAG_PREFIX}${userId}`, false), true);
  });

  it("successfully migrates local data, marks flag, and cleans up local keys", async () => {
    const userId = "u123";
    const localFavs = [{ word: "serendipity", definition: "A happy chance" }];
    const localHist = ["petrichor", "ephemeral"];

    setStorageItem(FAVORITES_STORAGE_KEY, localFavs);
    setStorageItem(HISTORY_STORAGE_KEY, localHist);

    let capturedFavs = null;
    let capturedHist = null;
    const originalMigrate = userService.migrateUserData;
    userService.migrateUserData = async (favs, hist) => {
      capturedFavs = favs;
      capturedHist = hist;
      return { migratedFavoritesCount: 1, migratedHistoryCount: 2 };
    };

    const res = await syncLocalDataToServer(userId);
    userService.migrateUserData = originalMigrate;

    assert.equal(res.migrated, true);
    assert.deepEqual(capturedFavs, localFavs);
    assert.deepEqual(capturedHist, localHist);
    assert.equal(getStorageItem(`${MIGRATION_FLAG_PREFIX}${userId}`, false), true);

    // Legacy unauthenticated keys should now be removed
    assert.equal(mockStorage.has(FAVORITES_STORAGE_KEY), false);
    assert.equal(mockStorage.has(HISTORY_STORAGE_KEY), false);
  });

  it("preserves local storage keys when migration API fails (allowing retry)", async () => {
    const userId = "u123";
    const localFavs = [{ word: "resilience" }];
    setStorageItem(FAVORITES_STORAGE_KEY, localFavs);

    const originalMigrate = userService.migrateUserData;
    userService.migrateUserData = async () => {
      throw new Error("Network timeout during migration");
    };

    const res = await syncLocalDataToServer(userId);
    userService.migrateUserData = originalMigrate;

    assert.equal(res.migrated, false);
    assert.ok(res.error);

    // Migration flag must NOT be set
    assert.equal(getStorageItem(`${MIGRATION_FLAG_PREFIX}${userId}`, false), false);
    // Local storage data MUST NOT be deleted
    assert.deepEqual(getStorageItem(FAVORITES_STORAGE_KEY, []), localFavs);
  });

  it("handles malformed JSON in localStorage safely without throwing", async () => {
    const userId = "u123";
    mockStorage.set(FAVORITES_STORAGE_KEY, "{not valid json");

    const res = await syncLocalDataToServer(userId);
    // Safe parse defaults to [] and completes without unhandled exception
    assert.equal(res.migrated, false);
  });
});
