import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { userService } from "../../src/services/userService.js";

describe("Frontend User Data Service Unit Tests", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockFetchResponse = (status, data, ok = undefined) => {
    const isOk = ok !== undefined ? ok : status >= 200 && status < 300;
    globalThis.fetch = async (url, options) => {
      return {
        ok: isOk,
        status,
        json: async () => data,
        url,
        options
      };
    };
  };

  const mockFetchNetworkError = () => {
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
  };

  describe("Favorites API calls", () => {
    it("getFavorites() retrieves user favorites list from backend", async () => {
      const mockList = [
        { id: "fav1", word: "serendipity", phonetic: "/s/", partOfSpeech: "noun" }
      ];
      mockFetchResponse(200, { favorites: mockList });

      const favs = await userService.getFavorites();
      assert.deepEqual(favs, mockList);
    });

    it("addFavorite() submits favorite data to POST /user/favorites", async () => {
      let capturedBody = null;
      globalThis.fetch = async (_url, options) => {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            message: "Favorite added successfully.",
            favorite: { id: "fav2", word: "petrichor" }
          })
        };
      };

      const result = await userService.addFavorite({
        word: "petrichor",
        phonetic: "/p/",
        definition: "Rain scent"
      });

      assert.equal(capturedBody.word, "petrichor");
      assert.equal(result.id, "fav2");
    });

    it("removeFavorite() sends DELETE to /user/favorites/:word", async () => {
      let capturedUrl = null;
      let capturedMethod = null;
      globalThis.fetch = async (url, options) => {
        capturedUrl = url;
        capturedMethod = options.method;
        return {
          ok: true,
          status: 200,
          json: async () => ({ message: "Favorite removed successfully." })
        };
      };

      await userService.removeFavorite("sonder");
      assert.equal(capturedMethod, "DELETE");
      assert.ok(capturedUrl.endsWith("/user/favorites/sonder"));
    });

    it("checkFavorite() returns boolean isFavorite status", async () => {
      mockFetchResponse(200, { isFavorite: true, word: "resilience" });
      const isFav = await userService.checkFavorite("resilience");
      assert.equal(isFav, true);

      mockFetchResponse(200, { isFavorite: false, word: "unknown" });
      const isNotFav = await userService.checkFavorite("unknown");
      assert.equal(isNotFav, false);
    });
  });

  describe("Search History API calls", () => {
    it("getHistory() retrieves history array and entries", async () => {
      mockFetchResponse(200, {
        history: ["petrichor", "ephemeral"],
        entries: [{ word: "petrichor" }, { word: "ephemeral" }]
      });

      const res = await userService.getHistory();
      assert.deepEqual(res.history, ["petrichor", "ephemeral"]);
      assert.equal(res.entries.length, 2);
    });

    it("recordSearch() sends word to POST /user/history", async () => {
      let capturedBody = null;
      globalThis.fetch = async (_url, options) => {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({ message: "Recorded", word: "sonder" })
        };
      };

      await userService.recordSearch("  Sonder  ");
      assert.equal(capturedBody.word, "sonder");
    });

    it("removeHistoryEntry() sends DELETE to /user/history/:word", async () => {
      let capturedUrl = null;
      globalThis.fetch = async (url, _options) => {
        capturedUrl = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({ message: "Removed" })
        };
      };

      await userService.removeHistoryEntry("ephemeral");
      assert.ok(capturedUrl.endsWith("/user/history/ephemeral"));
    });

    it("clearHistory() sends DELETE to /user/history", async () => {
      let capturedMethod = null;
      globalThis.fetch = async (_url, options) => {
        capturedMethod = options.method;
        return {
          ok: true,
          status: 200,
          json: async () => ({ message: "Cleared" })
        };
      };

      await userService.clearHistory();
      assert.equal(capturedMethod, "DELETE");
    });
  });

  describe("Migration API call", () => {
    it("migrateUserData() posts batch local data to /user/migrate", async () => {
      let capturedBody = null;
      globalThis.fetch = async (_url, options) => {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: "Migrated",
            migratedFavoritesCount: 1,
            migratedHistoryCount: 2
          })
        };
      };

      const result = await userService.migrateUserData(
        [{ word: "serendipity" }],
        ["petrichor", "ephemeral"]
      );

      assert.equal(capturedBody.favorites.length, 1);
      assert.equal(capturedBody.history.length, 2);
      assert.equal(result.migratedFavoritesCount, 1);
      assert.equal(result.migratedHistoryCount, 2);
    });
  });

  describe("Security and Network Error Handling", () => {
    it("ensures credentials: 'include' is sent on every user request", async () => {
      let capturedOptions = null;
      globalThis.fetch = async (_url, options) => {
        capturedOptions = options;
        return {
          ok: true,
          status: 200,
          json: async () => ({ favorites: [] })
        };
      };

      await userService.getFavorites();
      assert.equal(capturedOptions.credentials, "include");
    });

    it("maps network connection failures to NETWORK_ERROR exception", async () => {
      mockFetchNetworkError();

      await assert.rejects(
        async () => {
          await userService.getFavorites();
        },
        (err) => {
          assert.equal(err.code, "NETWORK_ERROR");
          assert.ok(err.message.includes("Unable to reach Lexora servers"));
          return true;
        }
      );
    });
  });
});
