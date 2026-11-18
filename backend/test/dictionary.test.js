import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import { WordCache } from "../models/WordCache.js";
import { dictionaryService, validateWord, normalizeDictionaryResponse } from "../services/dictionaryService.js";

describe("Lexora Dictionary Proxy & MongoDB Cache Tests", () => {
  let cacheStore = [];
  let upstreamFetchCount = 0;
  let mockFetchHandler = null;
  const originalFetch = globalThis.fetch;

  // Standard sample Free Dictionary API payload
  const mockApiEphemeral = [
    {
      word: "ephemeral",
      phonetic: "/əˈfɛ.mə.ɹəl/",
      phonetics: [
        { text: "/əˈfɛ.mə.ɹəl/", audio: "" },
        { text: "/əˈfɛ.mə.ɹəl/", audio: "https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3" }
      ],
      meanings: [
        {
          partOfSpeech: "adjective",
          definitions: [
            {
              definition: "Lasting for a very short time.",
              example: "ephemeral pleasures",
              synonyms: ["fleeting", "transitory"],
              antonyms: ["permanent"]
            }
          ],
          synonyms: ["momentary"],
          antonyms: []
        }
      ],
      sourceUrls: ["https://en.wiktionary.org/wiki/ephemeral"]
    }
  ];

  beforeEach(() => {
    cacheStore = [];
    upstreamFetchCount = 0;
    mockFetchHandler = null;

    // Mock WordCache.findOne
    WordCache.findOne = async ({ word }) => {
      const entry = cacheStore.find((c) => c.word.toLowerCase() === word.toLowerCase());
      if (!entry) return null;
      return {
        _id: "cache_id_123",
        word: entry.word,
        response: entry.response,
        fetchedAt: entry.fetchedAt,
        expiresAt: entry.expiresAt
      };
    };

    // Mock WordCache.findOneAndUpdate
    WordCache.findOneAndUpdate = async ({ word }, update, _options) => {
      const existingIndex = cacheStore.findIndex((c) => c.word.toLowerCase() === word.toLowerCase());
      const record = {
        word: update.word || word,
        response: update.response,
        fetchedAt: update.fetchedAt || new Date(),
        expiresAt: update.expiresAt
      };
      if (existingIndex >= 0) {
        cacheStore[existingIndex] = record;
      } else {
        cacheStore.push(record);
      }
      return record;
    };

    // Mock WordCache.countDocuments
    WordCache.countDocuments = async (query = {}) => {
      if (!query || Object.keys(query).length === 0) {
        return cacheStore.length;
      }
      if (query.expiresAt?.$gt) {
        const threshold = new Date(query.expiresAt.$gt).getTime();
        return cacheStore.filter((c) => new Date(c.expiresAt).getTime() > threshold).length;
      }
      if (query.expiresAt?.$lte) {
        const threshold = new Date(query.expiresAt.$lte).getTime();
        return cacheStore.filter((c) => new Date(c.expiresAt).getTime() <= threshold).length;
      }
      return cacheStore.length;
    };

    // Mock global fetch
    globalThis.fetch = async (url, options) => {
      upstreamFetchCount++;
      if (mockFetchHandler) {
        return mockFetchHandler(url, options);
      }
      // Default success for "ephemeral"
      return {
        ok: true,
        status: 200,
        json: async () => mockApiEphemeral
      };
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Input Validation", () => {
    it("normalizes word by trimming and converting to lowercase", () => {
      assert.strictEqual(validateWord("  EphEmeral  "), "ephemeral");
    });

    it("rejects non-string input with 400", () => {
      assert.throws(() => validateWord(null), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
      assert.throws(() => validateWord(12345), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
    });

    it("rejects empty or whitespace-only word with 400", () => {
      assert.throws(() => validateWord(""), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
      assert.throws(() => validateWord("   "), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
    });

    it("rejects words exceeding 50 characters with 400", () => {
      const longWord = "a".repeat(51);
      assert.throws(() => validateWord(longWord), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
    });

    it("rejects special characters, URLs, and potential injection symbols", () => {
      assert.throws(() => validateWord("word/with/slashes"), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
      assert.throws(() => validateWord("https://evil.com"), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
      assert.throws(() => validateWord("word<script>"), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
      assert.throws(() => validateWord("word;DROP TABLE"), (err) => err.statusCode === 400 && err.code === "INVALID_WORD");
    });

    it("allows valid hyphenated, space-separated, and apostrophe-containing words", () => {
      assert.strictEqual(validateWord("mother-in-law"), "mother-in-law");
      assert.strictEqual(validateWord("o'clock"), "o'clock");
      assert.strictEqual(validateWord("au revoir"), "au revoir");
    });
  });

  describe("Normalization Logic", () => {
    it("transforms raw API array into clean Lexora schema", () => {
      const normalized = normalizeDictionaryResponse(mockApiEphemeral, "ephemeral");
      assert.strictEqual(normalized.word, "ephemeral");
      assert.strictEqual(normalized.phonetic, "/əˈfɛ.mə.ɹəl/");
      assert.strictEqual(normalized.audio, "https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3");
      assert.strictEqual(normalized.meanings.length, 1);
      assert.strictEqual(normalized.meanings[0].partOfSpeech, "adjective");
      assert.strictEqual(normalized.meanings[0].definitions[0].example, "ephemeral pleasures");
    });

    it("handles words with no audio by setting audio to null", () => {
      const noAudio = [
        {
          word: "silent",
          meanings: [{ partOfSpeech: "adjective", definitions: [{ definition: "Making no sound." }] }]
        }
      ];
      const normalized = normalizeDictionaryResponse(noAudio, "silent");
      assert.strictEqual(normalized.audio, null);
    });

    it("throws 502 UPSTREAM_ERROR on malformed or empty array", () => {
      assert.throws(
        () => normalizeDictionaryResponse([], "empty"),
        (err) => err.statusCode === 502 && err.code === "UPSTREAM_ERROR"
      );
    });
  });

  describe("GET /api/dictionary/:word - Cache Behavior", () => {
    it("fetches upstream on cache miss, caches response, and returns source=upstream", async () => {
      const res = await request(app).get("/api/dictionary/ephemeral");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.word, "ephemeral");
      assert.strictEqual(res.body.source, "upstream");
      assert.strictEqual(upstreamFetchCount, 1);

      // Verify cached in store
      const cached = cacheStore.find((c) => c.word === "ephemeral");
      assert.ok(cached, "Word should have been stored in WordCache");
      assert.strictEqual(cached.response.word, "ephemeral");
      assert.ok(cached.expiresAt > new Date());
    });

    it("serves from cache on subsequent request and returns source=cache without calling upstream", async () => {
      // 1. Initial request (cache miss)
      await request(app).get("/api/dictionary/ephemeral");
      assert.strictEqual(upstreamFetchCount, 1);

      // 2. Second request (cache hit)
      const res = await request(app).get("/api/dictionary/ephemeral");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.word, "ephemeral");
      assert.strictEqual(res.body.source, "cache");
      // Upstream fetch count should remain 1!
      assert.strictEqual(upstreamFetchCount, 1, "Cache hit must not trigger external fetch");
    });

    it("refreshes expired cache entry by calling upstream again", async () => {
      // Seed an expired entry in cacheStore
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      cacheStore.push({
        word: "ephemeral",
        response: { word: "ephemeral", meanings: [] },
        fetchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31),
        expiresAt: pastDate
      });

      const res = await request(app).get("/api/dictionary/ephemeral");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.source, "upstream");
      assert.strictEqual(upstreamFetchCount, 1, "Expired cache must trigger fresh fetch");

      // Verify expiration was refreshed into the future
      const updated = cacheStore.find((c) => c.word === "ephemeral");
      assert.ok(updated.expiresAt > new Date());
    });

    it("does NOT cache 404 (word not found) responses", async () => {
      mockFetchHandler = async () => ({
        ok: false,
        status: 404,
        json: async () => ({ title: "No Definitions Found" })
      });

      const res = await request(app).get("/api/dictionary/nonexistentword");

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, "WORD_NOT_FOUND");

      // Verify not added to cache
      const cached = cacheStore.find((c) => c.word === "nonexistentword");
      assert.strictEqual(cached, undefined, "404 responses must never be cached");
    });

    it("coalesces concurrent requests for the same uncached word to a single upstream call", async () => {
      // Simulate delayed upstream response
      mockFetchHandler = async () => {
        await new Promise((r) => setTimeout(r, 50));
        return {
          ok: true,
          status: 200,
          json: async () => mockApiEphemeral
        };
      };

      // Fire 3 simultaneous requests for uncached "ephemeral"
      const [res1, res2, res3] = await Promise.all([
        request(app).get("/api/dictionary/ephemeral"),
        request(app).get("/api/dictionary/ephemeral"),
        request(app).get("/api/dictionary/ephemeral")
      ]);

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res3.status, 200);

      // Verify exactly ONE upstream call was made!
      assert.strictEqual(upstreamFetchCount, 1, "Concurrent requests must coalesce to a single upstream call");
    });

    it("gracefully falls back to upstream if database throws an error", async () => {
      // Simulate database failure during findOne
      WordCache.findOne = async () => {
        throw new Error("MongoDB connection timeout");
      };

      const res = await request(app).get("/api/dictionary/ephemeral");

      // Must succeed without exposing internal DB error
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.word, "ephemeral");
      assert.strictEqual(res.body.source, "upstream");
      assert.strictEqual(upstreamFetchCount, 1);
    });
  });

  describe("Upstream Error Mappings", () => {
    it("returns 429 when upstream dictionary rate limit is reached", async () => {
      mockFetchHandler = async () => ({
        ok: false,
        status: 429,
        json: async () => ({ message: "Rate limit exceeded" })
      });

      const res = await request(app).get("/api/dictionary/ratelimited");
      assert.strictEqual(res.status, 429);
      assert.strictEqual(res.body.error.code, "UPSTREAM_RATE_LIMITED");
      assert.ok(res.body.error.message.includes("rate limit"));
    });

    it("returns 504 when upstream request times out", async () => {
      mockFetchHandler = async () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        throw err;
      };

      const res = await request(app).get("/api/dictionary/timeoutword");
      assert.strictEqual(res.status, 504);
      assert.strictEqual(res.body.error.code, "UPSTREAM_TIMEOUT");
    });

    it("returns 502 when upstream returns 500 or network error", async () => {
      mockFetchHandler = async () => {
        throw new Error("getaddrinfo ENOTFOUND api.dictionaryapi.dev");
      };

      const res = await request(app).get("/api/dictionary/networkerror");
      assert.strictEqual(res.status, 502);
      assert.strictEqual(res.body.error.code, "UPSTREAM_ERROR");
    });

    it("returns 502 when upstream returns malformed JSON", async () => {
      mockFetchHandler = async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON");
        }
      });

      const res = await request(app).get("/api/dictionary/badjson");
      assert.strictEqual(res.status, 502);
      assert.strictEqual(res.body.error.code, "UPSTREAM_ERROR");
    });

    it("never exposes internal stack traces in error responses", async () => {
      mockFetchHandler = async () => {
        throw new Error("Sensitive internal database secret or file path");
      };

      const res = await request(app).get("/api/dictionary/testerror");
      assert.strictEqual(res.body.error.stack, undefined, "Stack trace must not be exposed to client");
    });
  });

  describe("GET /api/cache/stats - Diagnostics", () => {
    it("returns aggregate count of total, valid, and expired cache entries", async () => {
      const now = Date.now();
      cacheStore.push(
        {
          word: "valid1",
          response: {},
          fetchedAt: new Date(),
          expiresAt: new Date(now + 1000 * 60 * 60)
        },
        {
          word: "valid2",
          response: {},
          fetchedAt: new Date(),
          expiresAt: new Date(now + 1000 * 60 * 120)
        },
        {
          word: "expired1",
          response: {},
          fetchedAt: new Date(now - 1000 * 60 * 60 * 35),
          expiresAt: new Date(now - 1000 * 60)
        }
      );

      const res = await request(app).get("/api/cache/stats");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "ok");
      assert.strictEqual(res.body.cache.totalCachedWords, 3);
      assert.strictEqual(res.body.cache.validEntries, 2);
      assert.strictEqual(res.body.cache.expiredEntries, 1);
      assert.strictEqual(res.body.cache.ttlDays, 30);
    });
  });
});
