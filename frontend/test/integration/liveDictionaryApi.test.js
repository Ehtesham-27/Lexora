import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dictionaryService } from "../../src/services/dictionaryService.js";

describe("Integration Tests: Live Free Dictionary API", () => {
  const curatedWords = [
    "hello",
    "ephemeral",
    "serendipity",
    "beautiful",
    "petrichor",
    "resilience",
    "sonder"
  ];

  for (const word of curatedWords) {
    it(`should successfully fetch and normalize "${word}"`, async () => {
      try {
        const result = await dictionaryService.searchWord(word);
        assert.ok(result, `Expected result for ${word}`);
        assert.equal(result.word.toLowerCase(), word.toLowerCase());
        assert.ok(Array.isArray(result.meanings), "Expected meanings array");
        assert.ok(result.meanings.length > 0, "Expected at least 1 meaning");

        // Validate specific traits
        if (word === "resilience" || word === "sonder") {
          // Words without audio should have audio === null
          assert.equal(result.audio, null, `${word} should not fabricate audio URL`);
        } else if (word === "hello" || word === "ephemeral" || word === "petrichor") {
          // Words with live audio in Free Dictionary API
          assert.ok(typeof result.audio === "string" && result.audio.length > 0, `${word} should have real audio`);
        }
      } catch (err) {
        if (err.code === "NETWORK_ERROR") {
          console.warn(`[Integration Skipped] Network unavailable while testing "${word}":`, err.message);
          return;
        }
        throw err;
      }
    });
  }

  it("should handle invalid word with NOT_FOUND error", async () => {
    try {
      await dictionaryService.searchWord("xyzqwerty123");
      assert.fail("Should have thrown NOT_FOUND for invalid word");
    } catch (err) {
      if (err.code === "NETWORK_ERROR") {
        console.warn("[Integration Skipped] Network unavailable for invalid word test");
        return;
      }
      assert.equal(err.code, "NOT_FOUND");
      assert.ok(err.message.includes("No definition found"));
    }
  });

  it("should handle leading/trailing spaces during live search", async () => {
    try {
      const result = await dictionaryService.searchWord("   serendipity   ");
      assert.equal(result.word, "serendipity");
    } catch (err) {
      if (err.code === "NETWORK_ERROR") return;
      throw err;
    }
  });
});
