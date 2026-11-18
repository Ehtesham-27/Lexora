import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import { User } from "../models/User.js";
import { UserFavorite } from "../models/UserFavorite.js";
import { UserSearchHistory } from "../models/UserSearchHistory.js";
import { signToken, COOKIE_NAME } from "../utils/token.js";

describe("Cross-User Isolation & Security Tests", () => {
  let mockUsers = [];
  let mockFavorites = [];
  let mockHistory = [];

  let tokenUserA;
  let tokenUserB;

  const userA = {
    _id: "507f1f77bcf86cd799439011",
    name: "User Alpha",
    email: "alpha@example.com"
  };

  const userB = {
    _id: "507f1f77bcf86cd799439022",
    name: "User Beta",
    email: "beta@example.com"
  };

  beforeEach(() => {
    mockUsers = [userA, userB];
    mockFavorites = [];
    mockHistory = [];

    tokenUserA = signToken({ id: userA._id, email: userA.email, name: userA.name });
    tokenUserB = signToken({ id: userB._id, email: userB.email, name: userB.name });

    User.findById = async (id) => {
      const u = mockUsers.find((x) => x._id === id);
      return u ? { ...u, toSafeObject: () => u } : null;
    };

    UserFavorite.find = ({ userId }) => ({
      sort: () => {
        const uFavs = mockFavorites.filter((f) => f.userId === userId.toString());
        return Promise.resolve(
          uFavs.map((f) => ({
            ...f,
            toSafeObject: () => ({ id: f._id, word: f.word })
          }))
        );
      }
    });

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
      return {
        ...newDoc,
        toSafeObject: () => ({ id: newDoc._id, word: newDoc.word })
      };
    };

    UserFavorite.deleteOne = async ({ userId, word }) => {
      mockFavorites = mockFavorites.filter(
        (f) => !(f.userId === userId.toString() && f.word.toLowerCase() === word.toLowerCase())
      );
      return { deletedCount: 1 };
    };

    UserSearchHistory.find = ({ userId }) => ({
      sort: () => ({
        limit: (n) => {
          const uHist = mockHistory
            .filter((h) => h.userId === userId.toString())
            .slice(0, n);
          return Promise.resolve(
            uHist.map((h) => ({
              ...h,
              toSafeObject: () => ({ id: h._id, word: h.word })
            }))
          );
        },
        skip: () => ({
          select: () => Promise.resolve([])
        })
      })
    });

    UserSearchHistory.deleteOne = async ({ userId, word }) => {
      mockHistory = mockHistory.filter(
        (h) => !(h.userId === userId.toString() && h.word.toLowerCase() === word.toLowerCase())
      );
      return { deletedCount: 1 };
    };

    UserSearchHistory.deleteMany = async ({ userId }) => {
      mockHistory = mockHistory.filter((h) => h.userId !== userId.toString());
      return { deletedCount: 1 };
    };
  });

  describe("Favorites Isolation", () => {
    it("User A cannot see User B's favorites", async () => {
      mockFavorites.push(
        { _id: "f1", userId: userA._id, word: "serendipity" },
        { _id: "f2", userId: userB._id, word: "ephemeral" }
      );

      // User A requests favorites
      const resA = await request(app)
        .get("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${tokenUserA}`]);

      assert.strictEqual(resA.status, 200);
      assert.strictEqual(resA.body.favorites.length, 1);
      assert.strictEqual(resA.body.favorites[0].word, "serendipity");

      // User B requests favorites
      const resB = await request(app)
        .get("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${tokenUserB}`]);

      assert.strictEqual(resB.status, 200);
      assert.strictEqual(resB.body.favorites.length, 1);
      assert.strictEqual(resB.body.favorites[0].word, "ephemeral");
    });

    it("User A cannot delete User B's favorite", async () => {
      mockFavorites.push({ _id: "f2", userId: userB._id, word: "ephemeral" });

      // User A attempts to delete "ephemeral"
      const res = await request(app)
        .delete("/api/user/favorites/ephemeral")
        .set("Cookie", [`${COOKIE_NAME}=${tokenUserA}`]);

      assert.strictEqual(res.status, 200);
      // User B's favorite must remain untouched
      assert.strictEqual(mockFavorites.length, 1);
      assert.strictEqual(mockFavorites[0].userId, userB._id);
    });

    it("ignores spoofed userId in request body or params", async () => {
      // User A sends body with userId: userB._id
      const res = await request(app)
        .post("/api/user/favorites")
        .set("Cookie", [`${COOKIE_NAME}=${tokenUserA}`])
        .send({
          word: "sonder",
          userId: userB._id // Spoof attempt
        });

      assert.strictEqual(res.status, 201);
      // Stored record must be associated with User A, NOT User B
      assert.strictEqual(mockFavorites.length, 1);
      assert.strictEqual(mockFavorites[0].userId, userA._id);
      assert.notEqual(mockFavorites[0].userId, userB._id);
    });
  });

  describe("History Isolation", () => {
    it("User A cannot see User B's search history", async () => {
      mockHistory.push(
        { _id: "h1", userId: userA._id, word: "alpha-word" },
        { _id: "h2", userId: userB._id, word: "beta-word" }
      );

      const resA = await request(app)
        .get("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${tokenUserA}`]);

      assert.strictEqual(resA.status, 200);
      assert.deepEqual(resA.body.history, ["alpha-word"]);

      const resB = await request(app)
        .get("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${tokenUserB}`]);

      assert.strictEqual(resB.status, 200);
      assert.deepEqual(resB.body.history, ["beta-word"]);
    });

    it("User A clearing history does not affect User B's history", async () => {
      mockHistory.push(
        { _id: "h1", userId: userA._id, word: "alpha-word" },
        { _id: "h2", userId: userB._id, word: "beta-word" }
      );

      // User A clears history
      await request(app)
        .delete("/api/user/history")
        .set("Cookie", [`${COOKIE_NAME}=${tokenUserA}`]);

      // User B's history must remain untouched
      assert.strictEqual(mockHistory.length, 1);
      assert.strictEqual(mockHistory[0].userId, userB._id);
      assert.strictEqual(mockHistory[0].word, "beta-word");
    });
  });
});
