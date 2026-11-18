import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import { User } from "../models/User.js";
import { UserFavorite } from "../models/UserFavorite.js";
import { UserSearchHistory } from "../models/UserSearchHistory.js";
import { signToken, COOKIE_NAME } from "../utils/token.js";

describe("User Data Migration Endpoint (/api/user/migrate)", () => {
  let mockUsers = [];
  let mockFavorites = [];
  let mockHistory = [];
  let userToken;
  let testUser;

  beforeEach(() => {
    mockUsers = [];
    mockFavorites = [];
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

    UserFavorite.findOne = async ({ userId, word }) => {
      return (
        mockFavorites.find(
          (f) => f.userId === userId.toString() && f.word.toLowerCase() === word.toLowerCase()
        ) || null
      );
    };

    UserFavorite.create = async (doc) => {
      const newDoc = {
        _id: "fav_" + (mockFavorites.length + 1),
        ...doc,
        userId: doc.userId.toString()
      };
      mockFavorites.push(newDoc);
      return newDoc;
    };

    UserSearchHistory.findOneAndUpdate = async ({ userId, word }, update) => {
      const clean = word.toLowerCase();
      let found = mockHistory.find(
        (h) => h.userId === userId.toString() && h.word.toLowerCase() === clean
      );
      if (found) {
        found.searchedAt = update.searchedAt;
      } else {
        found = {
          _id: "hist_" + (mockHistory.length + 1),
          userId: userId.toString(),
          word: clean,
          searchedAt: update.searchedAt
        };
        mockHistory.push(found);
      }
      return found;
    };

    UserSearchHistory.find = ({ userId }) => ({
      sort: () => ({
        skip: (n) => ({
          select: () => {
            const excess = mockHistory
              .filter((h) => h.userId === userId.toString())
              .sort((a, b) => b.searchedAt - a.searchedAt)
              .slice(n);
            return Promise.resolve(excess.map((e) => ({ _id: e._id })));
          }
        })
      })
    });

    UserSearchHistory.deleteMany = async (filter) => {
      if (filter._id && filter._id.$in) {
        const ids = filter._id.$in.map(String);
        mockHistory = mockHistory.filter((h) => !ids.includes(h._id));
      }
      return { deletedCount: 1 };
    };
  });

  it("migrates local favorites and history into user account", async () => {
    const res = await request(app)
      .post("/api/user/migrate")
      .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
      .send({
        favorites: [
          { word: "serendipity", definition: "A pleasant surprise" },
          { word: "petrichor", definition: "Rain smell" }
        ],
        history: ["petrichor", "ephemeral", "resilience"]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.migratedFavoritesCount, 2);
    assert.strictEqual(res.body.migratedHistoryCount, 3);
    assert.strictEqual(mockFavorites.length, 2);
    assert.strictEqual(mockHistory.length, 3);
  });

  it("deduplicates already existing favorites during migration", async () => {
    // User already has "serendipity" in favorites
    mockFavorites.push({
      _id: "fav_existing",
      userId: testUser._id,
      word: "serendipity"
    });

    const res = await request(app)
      .post("/api/user/migrate")
      .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
      .send({
        favorites: [
          { word: "serendipity", definition: "A pleasant surprise" },
          { word: "sonder", definition: "Realization about others" }
        ]
      });

    assert.strictEqual(res.status, 200);
    // Only "sonder" should be newly created
    assert.strictEqual(res.body.migratedFavoritesCount, 1);
    assert.strictEqual(mockFavorites.length, 2);
  });

  it("handles malformed entries gracefully without failing the entire batch", async () => {
    const res = await request(app)
      .post("/api/user/migrate")
      .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
      .send({
        favorites: [
          null,
          { word: "" },
          { word: "validword" },
          { word: "a".repeat(100) }
        ],
        history: [null, "", "validhistory", 12345]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.migratedFavoritesCount, 1);
    assert.strictEqual(mockFavorites[0].word, "validword");
  });
});
