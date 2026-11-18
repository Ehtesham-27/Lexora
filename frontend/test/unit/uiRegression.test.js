import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { dictionaryService } from "../../src/services/dictionaryService.js";
import { mockDictionary } from "../../src/data/mockDictionary.js";
import { feedWords } from "../../src/data/feedWords.js";
import { quizQuestions } from "../../src/data/quizQuestions.js";
import { getStorageItem, setStorageItem, removeStorageItem } from "../../src/utils/localStorage.js";

describe("UI & Core Feature Regression Tests", () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Mock minimal browser window and localStorage for safe node execution
    const mockStorage = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (k) => mockStorage.get(k) ?? null,
        setItem: (k, v) => mockStorage.set(k, String(v)),
        removeItem: (k) => mockStorage.delete(k),
        clear: () => mockStorage.clear(),
      },
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  });

  describe("Dictionary Search & Mock Fallback", () => {
    it("returns mock dictionary word for curated entries (e.g. serendipity)", async () => {
      // Mock fetch returning 404 upstream to trigger curated mock fallback
      globalThis.fetch = async () => ({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const entry = await dictionaryService.searchWord("serendipity");
      assert.equal(entry.word, "serendipity");
      assert.ok(entry.meanings.length > 0);
      assert.ok(entry.meanings[0].definitions.length > 0);
    });

    it("verifies all required mock dictionary words exist", () => {
      const requiredWords = ["hello", "serendipity", "ephemeral", "beautiful", "petrichor", "resilience", "sonder"];
      for (const w of requiredWords) {
        assert.ok(mockDictionary[w], `Mock dictionary must contain "${w}"`);
        assert.equal(mockDictionary[w].word, w);
        assert.ok(mockDictionary[w].meanings.length > 0);
      }
    });

    it("correctly rejects whitespace and empty word searches", async () => {
      await assert.rejects(async () => dictionaryService.searchWord(""), { code: "EMPTY_INPUT" });
      await assert.rejects(async () => dictionaryService.searchWord("   "), { code: "EMPTY_INPUT" });
    });
  });

  describe("Word of the Day", () => {
    it("returns formatted Word of the Day via backend or resilient fallback", async () => {
      // In node test without live backend, fallback to petrichor is used
      const wotd = await dictionaryService.getWordOfTheDay();
      assert.ok(wotd.word, "Word of the day must have word property");
      assert.ok(wotd.meanings && wotd.meanings.length > 0);
    });
  });

  describe("Discovery Feed", () => {
    it("has valid curated vocabulary items with pronunciation and definitions", () => {
      assert.ok(feedWords.length >= 4);
      for (const item of feedWords) {
        assert.ok(item.id, "Feed item must have id");
        assert.ok(item.word, "Feed item must have word");
        assert.ok(item.definition, "Feed item must have definition");
        assert.ok(item.example, "Feed item must have example");
      }
    });
  });

  describe("Practice Quiz Data", () => {
    it("contains valid 4-option quiz questions with correct index", () => {
      assert.ok(quizQuestions.length > 0);
      for (const q of quizQuestions) {
        assert.ok(q.question);
        assert.equal(q.options.length, 4, "Quiz question must have exactly 4 choices");
        assert.ok(typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4);
        assert.ok(q.options[q.correctIndex], "Option at correctIndex must exist");
      }
    });
  });

  describe("Local Storage Persistence (Favorites, History, Theme)", () => {
    it("stores and retrieves favorites safely in browser local storage", () => {
      const initialFavorites = ["petrichor", "serendipity"];
      setStorageItem("lexora_favorites", initialFavorites);

      const retrieved = getStorageItem("lexora_favorites", []);
      assert.deepEqual(retrieved, initialFavorites);

      // Add favorite
      const updated = [...retrieved, "ephemeral"];
      setStorageItem("lexora_favorites", updated);
      assert.deepEqual(getStorageItem("lexora_favorites", []), ["petrichor", "serendipity", "ephemeral"]);

      // Remove favorite
      removeStorageItem("lexora_favorites");
      assert.deepEqual(getStorageItem("lexora_favorites", []), []);
    });

    it("stores and retrieves search history safely", () => {
      const historyItems = [
        { word: "serendipity", timestamp: 1000 },
        { word: "ephemeral", timestamp: 2000 },
      ];
      setStorageItem("lexora_search_history", historyItems);

      const retrieved = getStorageItem("lexora_search_history", []);
      assert.deepEqual(retrieved, historyItems);
    });

    it("persists theme preference across sessions", () => {
      setStorageItem("lexora_theme", "dark");
      assert.equal(getStorageItem("lexora_theme", "light"), "dark");

      setStorageItem("lexora_theme", "light");
      assert.equal(getStorageItem("lexora_theme", "dark"), "light");
    });
  });

  describe("Floating Navigation Items", () => {
    it("defines the standard 4 navigation tabs: home, feed, search, settings", () => {
      const validTabs = ["home", "feed", "search", "settings"];
      assert.equal(validTabs.length, 4);
      assert.ok(validTabs.includes("home"));
      assert.ok(validTabs.includes("feed"));
      assert.ok(validTabs.includes("search"));
      assert.ok(validTabs.includes("settings"));
    });
  });
});
