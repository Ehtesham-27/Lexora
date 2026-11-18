import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeDictionaryResponse, dictionaryService } from "../../src/services/dictionaryService.js";

describe("Unit Tests: Dictionary Service & Normalization", () => {
  describe("normalizeDictionaryResponse", () => {
    it("should normalize a full API entry with multiple phonetics and audio", () => {
      const rawApiData = [
        {
          word: "ephemeral",
          phonetic: "/əˈfɛ.mə.ɹəl/",
          phonetics: [
            { text: "/əˈfɛ.mə.ɹəl/", audio: "" },
            {
              text: "/əˈfɛ.mə.ɹəl/",
              audio: "https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3"
            }
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
          ]
        }
      ];

      const result = normalizeDictionaryResponse(rawApiData, "ephemeral");

      assert.equal(result.word, "ephemeral");
      assert.equal(result.phonetic, "/əˈfɛ.mə.ɹəl/");
      assert.equal(result.audio, "https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3");
      assert.equal(result.meanings.length, 1);
      assert.equal(result.meanings[0].partOfSpeech, "adjective");
      assert.equal(result.meanings[0].definitions[0].definition, "Lasting for a very short time.");
      assert.equal(result.meanings[0].definitions[0].example, "ephemeral pleasures");
      assert.deepEqual(result.meanings[0].definitions[0].synonyms, ["fleeting", "transitory"]);
      assert.deepEqual(result.meanings[0].definitions[0].antonyms, ["permanent"]);
      assert.ok(result.meanings[0].synonyms.includes("momentary"));
    });

    it("should handle words with protocol-relative audio URLs (// -> https:)", () => {
      const rawData = [
        {
          word: "testword",
          phonetics: [
            { audio: "//ssl.gstatic.com/dictionary/static/sounds/20200429/test--_gb_1.mp3" }
          ],
          meanings: [
            {
              partOfSpeech: "noun",
              definitions: [{ definition: "A test definition" }]
            }
          ]
        }
      ];

      const result = normalizeDictionaryResponse(rawData, "testword");
      assert.equal(result.audio, "https://ssl.gstatic.com/dictionary/static/sounds/20200429/test--_gb_1.mp3");
    });

    it("should set audio to null when no audio files exist", () => {
      const rawData = [
        {
          word: "resilience",
          phonetics: [{ text: "/ɹə.zɪl.ɪ.əns/", audio: "" }],
          meanings: [
            {
              partOfSpeech: "noun",
              definitions: [{ definition: "Capacity to recover quickly" }]
            }
          ]
        }
      ];

      const result = normalizeDictionaryResponse(rawData, "resilience");
      assert.equal(result.audio, null);
      assert.equal(result.phonetic, "/ɹə.zɪl.ɪ.əns/");
    });

    it("should group multiple meanings with the same partOfSpeech", () => {
      const rawData = [
        {
          word: "hello",
          meanings: [
            {
              partOfSpeech: "noun",
              definitions: [{ definition: "An utterance of hello" }]
            },
            {
              partOfSpeech: "noun",
              definitions: [{ definition: "A greeting or greeting gesture" }]
            }
          ]
        }
      ];

      const result = normalizeDictionaryResponse(rawData, "hello");
      assert.equal(result.meanings.length, 1);
      assert.equal(result.meanings[0].partOfSpeech, "noun");
      assert.equal(result.meanings[0].definitions.length, 2);
    });

    it("should omit empty optional fields without crashing or adding empty strings", () => {
      const rawData = [
        {
          word: "minimal",
          meanings: [
            {
              partOfSpeech: "adjective",
              definitions: [{ definition: "Bare minimum" }]
            }
          ]
        }
      ];

      const result = normalizeDictionaryResponse(rawData, "minimal");
      assert.equal(result.audio, null);
      assert.equal(result.meanings[0].definitions[0].example, null);
      assert.deepEqual(result.meanings[0].definitions[0].synonyms, []);
      assert.deepEqual(result.meanings[0].definitions[0].antonyms, []);
    });

    it("should throw error if input is empty or invalid array", () => {
      assert.throws(() => normalizeDictionaryResponse([], "empty"), /Invalid response format/);
      assert.throws(() => normalizeDictionaryResponse(null, "null"), /Invalid response format/);
    });
  });

  describe("dictionaryService input validation", () => {
    it("should reject empty input with code EMPTY_INPUT", async () => {
      await assert.rejects(
        async () => {
          await dictionaryService.searchWord("");
        },
        (err) => err.code === "EMPTY_INPUT"
      );
    });

    it("should reject whitespace-only input with code EMPTY_INPUT", async () => {
      await assert.rejects(
        async () => {
          await dictionaryService.searchWord("     ");
        },
        (err) => err.code === "EMPTY_INPUT"
      );
    });

    it("should reject non-string input with code INVALID_INPUT", async () => {
      await assert.rejects(
        async () => {
          await dictionaryService.searchWord(null);
        },
        (err) => err.code === "INVALID_INPUT"
      );
      await assert.rejects(
        async () => {
          await dictionaryService.searchWord(12345);
        },
        (err) => err.code === "INVALID_INPUT"
      );
    });
  });

  describe("dictionaryService getWordOfTheDay", () => {
    it("should return a stable, valid word entry for the day", async () => {
      const wotd = await dictionaryService.getWordOfTheDay();
      assert.ok(wotd);
      assert.ok(typeof wotd.word === "string");
      assert.ok(wotd.word.length > 0);
      assert.ok(Array.isArray(wotd.meanings));
      assert.ok(wotd.meanings.length > 0);
    });
  });
});
