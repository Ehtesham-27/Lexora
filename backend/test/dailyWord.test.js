import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import { DailyWord } from "../models/DailyWord.js";
import { dictionaryService } from "../services/dictionaryService.js";
import { dailyWordService, getUtcDateKey, computeDateHash } from "../services/dailyWordService.js";

describe("Lexora Persistent Word of the Day (Phase 3C)", () => {
  let dailyWordsStore = [];
  let lookupCallCount = 0;
  let mockLookupHandler = null;
  const originalLookupWord = dictionaryService.lookupWord;

  // Sample normalized dictionary data for candidates
  const sampleDictionaryPayload = (word) => ({
    word: word.toLowerCase(),
    phonetic: `/${word}/`,
    audio: `https://api.dictionaryapi.dev/media/${word}.mp3`,
    allPhonetics: [{ text: `/${word}/`, audio: `https://api.dictionaryapi.dev/media/${word}.mp3` }],
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [{ definition: `Definition of ${word}`, example: `Example using ${word}` }],
        synonyms: ["syn1"],
        antonyms: []
      }
    ],
    sourceUrls: [`https://en.wiktionary.org/wiki/${word}`],
    source: "upstream"
  });

  beforeEach(() => {
    dailyWordsStore = [];
    lookupCallCount = 0;
    mockLookupHandler = null;

    // Mock DailyWord.findOne
    DailyWord.findOne = async (query) => {
      const match = dailyWordsStore.find((d) => d.date === query.date);
      if (!match) return null;
      return {
        _id: "daily_id_" + match.date,
        date: match.date,
        word: match.word,
        dictionaryData: match.dictionaryData,
        createdAt: match.createdAt || new Date(),
        updatedAt: match.updatedAt || new Date()
      };
    };

    // Mock DailyWord.create
    DailyWord.create = async (doc) => {
      // Check unique constraint on date
      const exists = dailyWordsStore.find((d) => d.date === doc.date);
      if (exists) {
        const mongoDupErr = new Error(`E11000 duplicate key error collection: lexora.dailywords index: date_1 dup key: { date: "${doc.date}" }`);
        mongoDupErr.code = 11000;
        throw mongoDupErr;
      }
      const record = {
        _id: "daily_id_" + doc.date,
        date: doc.date,
        word: doc.word,
        dictionaryData: doc.dictionaryData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dailyWordsStore.push(record);
      return record;
    };

    // Mock DailyWord.find (for recent words query)
    DailyWord.find = (query) => {
      let filtered = dailyWordsStore.slice();
      if (query?.date?.$ne) {
        filtered = filtered.filter((d) => d.date !== query.date.$ne);
      }
      return {
        sort: () => ({
          limit: () => ({
            select: async () => filtered
          })
        })
      };
    };

    // Mock dictionaryService.lookupWord
    dictionaryService.lookupWord = async (word) => {
      lookupCallCount++;
      if (mockLookupHandler) {
        return mockLookupHandler(word);
      }
      return sampleDictionaryPayload(word);
    };
  });

  describe("UTC Date & Hash Utilities", () => {
    it("formats current UTC date into YYYY-MM-DD", () => {
      const fixedDate = new Date(Date.UTC(2026, 10, 18, 15, 30, 0)); // 2026-11-18
      assert.strictEqual(getUtcDateKey(fixedDate), "2026-11-18");
    });

    it("generates deterministic integer hash from date string", () => {
      const hash1 = computeDateHash("2026-11-18");
      const hash2 = computeDateHash("2026-11-18");
      const hash3 = computeDateHash("2026-11-19");

      assert.strictEqual(hash1, hash2, "Identical dates must yield identical hashes");
      assert.notStrictEqual(hash1, hash3, "Different dates should yield different hashes");
    });
  });

  describe("Daily Word Service Logic", () => {
    it("generates and persists a new word when no record exists for today", async () => {
      const result = await dailyWordService.getDailyWord("2026-11-18");

      assert.ok(result);
      assert.strictEqual(result.date, "2026-11-18");
      assert.ok(typeof result.word === "string");
      assert.strictEqual(result.source, "daily");
      assert.strictEqual(dailyWordsStore.length, 1);
      assert.strictEqual(dailyWordsStore[0].date, "2026-11-18");
      assert.strictEqual(dailyWordsStore[0].word, result.word);
    });

    it("returns existing daily record without re-selecting or fetching from dictionary", async () => {
      // Pre-seed an existing daily record for 2026-11-18
      dailyWordsStore.push({
        date: "2026-11-18",
        word: "serendipity",
        dictionaryData: sampleDictionaryPayload("serendipity"),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await dailyWordService.getDailyWord("2026-11-18");

      assert.strictEqual(result.word, "serendipity");
      assert.strictEqual(result.date, "2026-11-18");
      assert.strictEqual(result.source, "daily");
      assert.strictEqual(lookupCallCount, 0, "Lookup service must not be called when record already exists");
    });

    it("generates a new unique record when date transitions to next day", async () => {
      const day1 = await dailyWordService.getDailyWord("2026-11-18");
      const day2 = await dailyWordService.getDailyWord("2026-11-19");

      assert.strictEqual(day1.date, "2026-11-18");
      assert.strictEqual(day2.date, "2026-11-19");
      assert.strictEqual(dailyWordsStore.length, 2);
    });

    it("moves to next candidate when first candidate fails lookup", async () => {
      let attempt = 0;
      mockLookupHandler = async (word) => {
        attempt++;
        if (attempt === 1) {
          const notFound = new Error("Not found");
          notFound.statusCode = 404;
          notFound.code = "WORD_NOT_FOUND";
          throw notFound;
        }
        return sampleDictionaryPayload(word);
      };

      const result = await dailyWordService.getDailyWord("2026-11-18");
      assert.ok(result);
      assert.strictEqual(lookupCallCount, 2, "Should have retried with next candidate");
    });

    it("respects max retry limit and throws error when all candidates fail", async () => {
      mockLookupHandler = async () => {
        const fail = new Error("Upstream down");
        fail.statusCode = 502;
        fail.code = "UPSTREAM_ERROR";
        throw fail;
      };

      await assert.rejects(
        async () => {
          await dailyWordService.getDailyWord("2026-11-18");
        },
        (err) => err.statusCode === 503 && err.code === "DAILY_WORD_UNAVAILABLE"
      );

      // Verify retry limit was respected (max 5 attempts)
      assert.strictEqual(lookupCallCount, 5);
      assert.strictEqual(dailyWordsStore.length, 0, "Failed words must not be persisted");
    });

    it("safely handles duplicate-key race condition and retrieves winning record", async () => {
      // Simulate another thread inserting the record during this thread's generation
      let callCount = 0;
      DailyWord.create = async (doc) => {
        callCount++;
        // Pre-insert into store to simulate competitor thread winning
        dailyWordsStore.push({
          date: doc.date,
          word: "luminous",
          dictionaryData: sampleDictionaryPayload("luminous")
        });

        const mongoDupErr = new Error(`E11000 duplicate key error collection: lexora.dailywords index: date_1 dup key: { date: "${doc.date}" }`);
        mongoDupErr.code = 11000;
        throw mongoDupErr;
      };

      const result = await dailyWordService.getDailyWord("2026-11-18");
      assert.strictEqual(result.date, "2026-11-18");
      assert.strictEqual(result.word, "luminous", "Should retrieve the competitor thread's winning record");
    });

    it("coalesces concurrent requests for today's word to a single generation call", async () => {
      mockLookupHandler = async (word) => {
        await new Promise((r) => setTimeout(r, 40));
        return sampleDictionaryPayload(word);
      };

      // 4 simultaneous requests on date turnover
      const [r1, r2, r3, r4] = await Promise.all([
        dailyWordService.getDailyWord("2026-11-18"),
        dailyWordService.getDailyWord("2026-11-18"),
        dailyWordService.getDailyWord("2026-11-18"),
        dailyWordService.getDailyWord("2026-11-18")
      ]);

      assert.strictEqual(r1.word, r2.word);
      assert.strictEqual(r2.word, r3.word);
      assert.strictEqual(r3.word, r4.word);
      assert.strictEqual(dailyWordsStore.length, 1, "Only 1 record should be inserted in DB");
      assert.strictEqual(lookupCallCount, 1, "Only 1 candidate lookup should occur");
    });
  });

  describe("GET /api/dictionary/word-of-the-day Endpoint", () => {
    it("returns 200 with full structured daily word payload", async () => {
      const res = await request(app).get("/api/dictionary/word-of-the-day");

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.date);
      assert.match(res.body.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(typeof res.body.word === "string");
      assert.strictEqual(res.body.source, "daily");
      assert.ok(Array.isArray(res.body.meanings));
      assert.ok(Array.isArray(res.body.allPhonetics));
      assert.ok(Array.isArray(res.body.sourceUrls));
    });

    it("subsequent requests on the same day return identical word and date", async () => {
      const res1 = await request(app).get("/api/dictionary/word-of-the-day");
      const res2 = await request(app).get("/api/dictionary/word-of-the-day");

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res1.body.word, res2.body.word);
      assert.strictEqual(res1.body.date, res2.body.date);
    });

    it("does not conflict with /api/dictionary/:word parameterized route", async () => {
      const wotdRes = await request(app).get("/api/dictionary/word-of-the-day");
      assert.strictEqual(wotdRes.status, 200);
      assert.strictEqual(wotdRes.body.source, "daily");

      const wordRes = await request(app).get("/api/dictionary/ephemeral");
      assert.strictEqual(wordRes.status, 200);
      assert.strictEqual(wordRes.body.word, "ephemeral");
    });

    it("returns structured 503 when candidate pool is exhausted or upstream fails", async () => {
      mockLookupHandler = async () => {
        const fail = new Error("All upstreams offline");
        fail.statusCode = 502;
        fail.code = "UPSTREAM_ERROR";
        throw fail;
      };

      const res = await request(app).get("/api/dictionary/word-of-the-day");
      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.body.error.code, "DAILY_WORD_UNAVAILABLE");
      assert.strictEqual(res.body.error.stack, undefined, "Stack trace must not be exposed to client");
    });
  });
});
