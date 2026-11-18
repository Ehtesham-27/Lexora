import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import { User } from "../models/User.js";
import { UserFavorite } from "../models/UserFavorite.js";
import { signToken, COOKIE_NAME } from "../utils/token.js";

describe("User Favorites Endpoints (/api/user/favorites)", () => {
  let mockUsers = [];
  let mockFavorites = [];
  let userToken;
  let testUser;

  const createMockDoc = (data) => ({
    _id: data._id || "fav_123",
    userId: data.userId,
    word: data.word,
    phonetic: data.phonetic || "",
    partOfSpeech: data.partOfSpeech || "word",
    definition: data.definition || "",
    audio: data.audio || null,
    createdAt: data.createdAt || new Date(),
    toSafeObject: function () {
      return {
        id: this._id.toString(),
        word: this.word,
        phonetic: this.phonetic,
        partOfSpeech: this.partOfSpeech,
        definition: this.definition,
        audio: this.audio,
        savedAt: this.createdAt.toISOString()
      };
    }
  });

  beforeEach(() => {
    mockUsers = [];
    mockFavorites = [];

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

    UserFavorite.find = ({ userId }) => ({
      sort: () => {
        const userFavs = mockFavorites.filter((f) => f.userId === userId.toString());
        return Promise.resolve(userFavs.map(createMockDoc));
      }
    });

    UserFavorite.findOne = async ({ userId, word }) => {
      const found = mockFavorites.find(
        (f) => f.userId === userId.toString() && f.word.toLowerCase() === word.toLowerCase()
      );
      return found ? createMockDoc(found) : null;
    };

    UserFavorite.create = async (doc) => {
      // Check unique constraint violation
      const exists = mockFavorites.some(
        (f) => f.userId === doc.userId.toString() && f.word.toLowerCase() === doc.word.toLowerCase()
      );
      if (exists) {
        const err = new Error("Duplicate key");
        err.code = 11000;
        throw err;
      }
      const newDoc = {
        _id: "fav_" + (mockFavorites.length + 1),
        ...doc,
        userId: doc.userId.toString(),
        createdAt: new Date()
      };
      mockFavorites.push(newDoc);
      return createMockDoc(newDoc);
    };

    UserFavorite.deleteOne = async ({ userId, word }) => {
      mockFavorites = mockFavorites.filter(
        (f) => !(f.userId === userId.toString() && f.word.toLowerCase() === word.toLowerCase())
      );
      return { deletedCount: 1 };
    };
  });

  describe("Authentication Guard", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/user/favorites");
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, "UNAUTHORIZED");
    });
  });

  describe("GET /api/user/favorites", () => {
    it("returns list of favorites for authenticated user", async () => {
      mockFavorites.push({
        _id: "fav_1",
        userId: testUser._id,
        word: "serendipity",
        phonetic: "/ˌsɛr.ənˈdɪp.ə.ti/",
        partOfSpeech: "noun",
        definition: "A pleasant event by chance",
        createdAt: new Date()
      });

      const res = await request(app)
        .get("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`]);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.favorites));
      assert.strictEqual(res.body.favorites.length, 1);
      assert.strictEqual(res.body.favorites[0].word, "serendipity");
    });
  });

  describe("POST /api/user/favorites", () => {
    it("successfully adds a new favorite word", async () => {
      const res = await request(app)
        .post("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({
          word: "Petrichor",
          phonetic: "/ˈpɛt.rɪ.kɔːr/",
          partOfSpeech: "noun",
          definition: "Fragrance of rain on dry ground",
          audio: "https://example.com/audio.mp3"
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.favorite.word, "petrichor"); // normalized to lowercase
      assert.strictEqual(mockFavorites.length, 1);
    });

    it("duplicate favorite addition returns 200 without creating duplicate", async () => {
      // First addition
      await request(app)
        .post("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "ephemeral" });

      // Second addition
      const res = await request(app)
        .post("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "ephemeral" });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.message, "Word is already in favorites.");
      assert.strictEqual(mockFavorites.length, 1);
    });

    it("rejects invalid or empty word with 400", async () => {
      const res = await request(app)
        .post("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "   " });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "INVALID_WORD");
    });

    it("rejects words exceeding 50 characters with 400", async () => {
      const res = await request(app)
        .post("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "a".repeat(51) });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "INVALID_WORD");
    });

    it("rejects invalid symbols or injection characters with 400", async () => {
      const res = await request(app)
        .post("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`])
        .send({ word: "<script>alert(1)</script>" });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "INVALID_WORD");
    });
  });

  describe("DELETE /api/user/favorites/:word", () => {
    it("removes a word from user favorites", async () => {
      mockFavorites.push({
        _id: "fav_1",
        userId: testUser._id,
        word: "sonder",
        createdAt: new Date()
      });

      const res = await request(app)
        .delete("/api/user/favorites/sonder")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`]);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.message, "Favorite removed successfully.");
      assert.strictEqual(mockFavorites.length, 0);
    });
  });

  describe("GET /api/user/favorites/check/:word", () => {
    it("returns isFavorite: true when word is saved", async () => {
      mockFavorites.push({
        _id: "fav_1",
        userId: testUser._id,
        word: "resilience",
        createdAt: new Date()
      });

      const res = await request(app)
        .get("/api/user/favorites/check/resilience")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`]);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.isFavorite, true);
    });

    it("returns isFavorite: false when word is not saved", async () => {
      const res = await request(app)
        .get("/api/user/favorites/check/nonexistent")
        .set("Cookie", [`${COOKIE_NAME}=${userToken}`]);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.isFavorite, false);
    });
  });
});
