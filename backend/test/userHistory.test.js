import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import { User } from "../models/User.js";
import { UserSearchHistory } from "../models/UserSearchHistory.js";
import { signToken, COOKIE_NAME } from "../utils/token.js";

describe("User Search History Endpoints (/api/user/history)", () => {
  let mockUsers = [];
  let mockHistory = [];
  let userToken;
  let testUser;

  const createMockDoc = (data) => ({
    _id: data._id || "hist_123",
    userId: data.userId,
    word: data.word,
    searchedAt: data.searchedAt || new Date(),
    toSafeObject: function () {
      return {
        id: this._id.toString(),
        word: this.word,
        searchedAt: this.searchedAt.toISOString()
      };
    }
  });

  beforeEach(() => {
    mockUsers = [];
    mockHistory = [];

    testUser = {
      _id: "507f1f77bcf86cd799439011",
      name: "Jane Austen",
      email: "jane@example.com"
    };
    mockUsers.push(testUser);

    userToken = signToken({
      id: testUser._id,
      email: testUser.email,
      name: testUser.name
    });

    User.findById = async (id) => {
      const u = mockUsers.find((x) => x._id === id);
      return u ? { ...u, toSafeObject: () => u } : null;
    };

    UserSearchHistory.find = ({ userId }) => ({
      sort: () => ({
        limit: (n) => {
          const userEntries = mockHistory
            .filter((h) => h.userId === userId.toString())
            .sort((a, b) => b.searchedAt - a.searchedAt)
            .slice(0, n);
          return Promise.resolve(userEntries.map(createMockDoc));
        },
        skip: (n) => ({
          select: () => {
            const userEntries = mockHistory
              .filter((h) => h.userId === userId.toString())
              .sort((a, b) => b.searchedAt - a.searchedAt)
              .slice(n);
            return Promise.resolve(userEntries.map((e) => ({ _id: e._id })));
          }
        })
      })
    });

    UserSearchHistory.findOneAndUpdate = async ({ userId, word }, update) => {
      const clean = word.toLowerCase();
      let found = mockHistory.find(
        (h) => h.userId === userId.toString() && h.word.toLowerCase() === clean
      );
      if (found) {
        found.searchedAt = update.searchedAt || new Date();
      } else {
        found = {
          _id: "hist_" + (mockHistory.length + 1),
          userId: userId.toString(),
          word: clean,
          searchedAt: update.searchedAt || new Date()
        };
        mockHistory.push(found);
      }
      return createMockDoc(found);
    };

    UserSearchHistory.deleteOne = async ({ userId, word }) => {
      mockHistory = mockHistory.filter(
        (h) => !(h.userId === userId.toString() && h.word.toLowerCase() === word.toLowerCase())
      );
      return { deletedCount: 1 };
    };

    UserSearchHistory.deleteMany = async (filter) => {
      if (filter._id && filter._id.$in) {
        const idsToDelete = filter._id.$in.map(String);
        mockHistory = mockHistory.filter((h) => !idsToDelete.includes(h._id));
      } else if (filter.userId) {
        mockHistory = mockHistory.filter((h) => h.userId !== filter.userId.toString());
      }
      return { deletedCount: 1 };
    };
  });

  describe("Authentication Guard", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/user/history");
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, "UNAUTHORIZED");
    });
  });

  describe("POST /api/user/history", () => {
    it("records a successful search and normalizes word to lowercase", async () => {
      const res = await request(app)
        .post("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "  Petrichor  " });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.word, "petrichor");
      assert.strictEqual(mockHistory.length, 1);
    });

    it("re-searching existing word updates recency without duplicate entries", async () => {
      // First search
      await request(app)
        .post("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "serendipity" });

      const firstTime = mockHistory[0].searchedAt;

      // Small delay
      await new Promise((r) => setTimeout(r, 10));

      // Second search for same word
      const res = await request(app)
        .post("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "Serendipity" });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(mockHistory.length, 1);
      assert.ok(mockHistory[0].searchedAt >= firstTime);
    });

    it("rejects empty or whitespace-only searches with 400", async () => {
      const res = await request(app)
        .post("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "    " });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "INVALID_WORD");
    });

    it("enforces 30-entry maximum history limit by pruning oldest entries", async () => {
      // Seed 30 items
      for (let i = 1; i <= 30; i++) {
        mockHistory.push({
          _id: "hist_" + i,
          userId: testUser._id,
          word: "word" + i,
          searchedAt: new Date(Date.now() - (31 - i) * 1000)
        });
      }
      assert.strictEqual(mockHistory.length, 30);

      // Search a 31st new word
      const res = await request(app)
        .post("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "newestword" });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(mockHistory.length, 30);
      // Oldest word1 should have been pruned
      assert.ok(!mockHistory.some((h) => h.word === "word1"));
      assert.ok(mockHistory.some((h) => h.word === "newestword"));
    });
  });

  describe("GET /api/user/history", () => {
    it("returns sorted history array for authenticated user", async () => {
      mockHistory.push(
        {
          _id: "hist_1",
          userId: testUser._id,
          word: "older",
          searchedAt: new Date(Date.now() - 5000)
        },
        {
          _id: "hist_2",
          userId: testUser._id,
          word: "newer",
          searchedAt: new Date(Date.now())
        }
      );

      const res = await request(app)
        .get("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`]);

      assert.strictEqual(res.status, 200);
      assert.deepEqual(res.body.history, ["newer", "older"]);
      assert.strictEqual(res.body.entries.length, 2);
    });
  });

  describe("DELETE /api/user/history/:word", () => {
    it("removes individual search history entry", async () => {
      mockHistory.push({
        _id: "hist_1",
        userId: testUser._id,
        word: "to-remove",
        searchedAt: new Date()
      });

      const res = await request(app)
        .delete("/api/user/history/to-remove")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`]);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.message, "History entry removed successfully.");
      assert.strictEqual(mockHistory.length, 0);
    });
  });

  describe("DELETE /api/user/history", () => {
    it("clears all search history for authenticated user", async () => {
      mockHistory.push(
        { _id: "hist_1", userId: testUser._id, word: "worda", searchedAt: new Date() },
        { _id: "hist_2", userId: testUser._id, word: "wordb", searchedAt: new Date() }
      );

      const res = await request(app)
        .delete("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`]);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.message, "Search history cleared successfully.");
      assert.strictEqual(mockHistory.length, 0);
    });
  });
});
