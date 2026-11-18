import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User } from "../models/User.js";
import { signToken, COOKIE_NAME } from "../utils/token.js";

describe("Lexora Auth API & System Endpoints", () => {
  // In-memory user store for mock database operations
  let usersStore = [];

  // Helper to create a fake user document with methods
  const createMockUserDoc = (data) => ({
    _id: data._id || "507f1f77bcf86cd799439011",
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comparePassword: async function (plain) {
      return bcrypt.compare(plain, this.passwordHash);
    },
    toSafeObject: function () {
      return {
        id: this._id.toString(),
        name: this.name,
        email: this.email,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  });

  beforeEach(() => {
    usersStore = [];

    // Mock User.findOne
    User.findOne = async ({ email }) => {
      const found = usersStore.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return found ? createMockUserDoc(found) : null;
    };

    // Mock User.create
    User.create = async ({ name, email, passwordHash }) => {
      const doc = {
        _id: "507f1f77bcf86cd7994390" + (usersStore.length + 10).toString(16),
        name,
        email,
        passwordHash
      };
      usersStore.push(doc);
      return createMockUserDoc(doc);
    };

    // Mock User.findById
    User.findById = async (id) => {
      const found = usersStore.find((u) => u._id === id);
      return found ? createMockUserDoc(found) : null;
    };
  });

  describe("GET /api/health", () => {
    it("returns status 200 with system health information", async () => {
      const res = await request(app).get("/api/health");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "ok");
      assert.ok(res.body.timestamp);
      assert.ok(res.body.database);
    });
  });

  describe("POST /api/auth/register", () => {
    const validUser = {
      name: "Eleanor Vance",
      email: "eleanor@example.com",
      password: "Password123",
      confirmPassword: "Password123"
    };

    it("registers a new user successfully and sets HttpOnly cookie", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(validUser);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.message, "Account registered successfully.");
      assert.strictEqual(res.body.user.name, "Eleanor Vance");
      assert.strictEqual(res.body.user.email, "eleanor@example.com");
      assert.strictEqual(res.body.user.passwordHash, undefined); // Sensitive field stripped

      // Cookie check
      const cookies = res.headers["set-cookie"];
      assert.ok(cookies, "Expected set-cookie header");
      const cookieStr = cookies.join("; ");
      assert.ok(cookieStr.includes(COOKIE_NAME));
      assert.ok(cookieStr.toLowerCase().includes("httponly"));
    });

    it("rejects duplicate email with 409 Conflict", async () => {
      // First registration
      await request(app).post("/api/auth/register").send(validUser);

      // Attempt duplicate registration
      const res = await request(app)
        .post("/api/auth/register")
        .send(validUser);

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.error.code, "EMAIL_ALREADY_EXISTS");
    });

    it("rejects invalid email with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUser,
          email: "not-an-email"
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "VALIDATION_ERROR");
    });

    it("rejects short or weak password (< 8 chars or missing numbers)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUser,
          password: "short",
          confirmPassword: "short"
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "VALIDATION_ERROR");
    });

    it("rejects mismatched passwords with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUser,
          confirmPassword: "DifferentPassword123"
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "VALIDATION_ERROR");
      assert.ok(res.body.error.message.includes("Passwords do not match"));
    });

    it("rejects missing required fields with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "incomplete@example.com"
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "VALIDATION_ERROR");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Seed a user
      const passwordHash = await bcrypt.hash("Secret123", 10);
      usersStore.push({
        _id: "507f1f77bcf86cd799439011",
        name: "Jane Austen",
        email: "jane@example.com",
        passwordHash
      });
    });

    it("logs in successfully with valid credentials and sets cookie", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "jane@example.com",
          password: "Secret123"
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.message, "Signed in successfully.");
      assert.strictEqual(res.body.user.name, "Jane Austen");
      assert.strictEqual(res.body.user.passwordHash, undefined);

      const cookies = res.headers["set-cookie"];
      assert.ok(cookies);
      assert.ok(cookies.join("; ").includes(COOKIE_NAME));
    });

    it("rejects non-existent email with generic 401 (prevent enumeration)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "Secret123"
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, "INVALID_CREDENTIALS");
      assert.strictEqual(res.body.error.message, "Invalid email or password.");
    });

    it("rejects wrong password with generic 401 (prevent enumeration)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "jane@example.com",
          password: "WrongPassword999"
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, "INVALID_CREDENTIALS");
      assert.strictEqual(res.body.error.message, "Invalid email or password.");
    });

    it("rejects empty fields with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: ""
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, "VALIDATION_ERROR");
    });
  });

  describe("GET /api/auth/me (Protected Route)", () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash("Secret123", 10);
      testUser = {
        _id: "507f1f77bcf86cd799439011",
        name: "Jane Austen",
        email: "jane@example.com",
        passwordHash
      };
      usersStore.push(testUser);

      validToken = signToken({
        id: testUser._id,
        email: testUser.email,
        name: testUser.name
      });
    });

    it("returns user profile when authenticated with cookie", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [`${COOKIE_NAME}=${validToken}`]);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user.email, "jane@example.com");
      assert.strictEqual(res.body.user.name, "Jane Austen");
      assert.strictEqual(res.body.user.passwordHash, undefined);
    });

    it("returns user profile when authenticated with Bearer authorization header", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${validToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user.email, "jane@example.com");
    });

    it("rejects unauthenticated request with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/auth/me");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, "UNAUTHORIZED");
    });

    it("rejects tampered or invalid token with 401", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [`${COOKIE_NAME}=invalid_token_payload`]);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.code, "INVALID_TOKEN");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears auth cookie and returns success response", async () => {
      const res = await request(app).post("/api/auth/logout");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.message, "Signed out successfully.");

      const cookies = res.headers["set-cookie"];
      assert.ok(cookies);
      const cookieStr = cookies.join("; ");
      assert.ok(cookieStr.includes(COOKIE_NAME));
      // In express clearCookie sets expiry in the past or maxAge=0
      assert.ok(
        cookieStr.includes("Expires=Thu, 01 Jan 1970") || cookieStr.includes("Max-Age=0") || cookieStr.includes(`${COOKIE_NAME}=;`)
      );
    });
  });

  describe("404 Not Found Handler", () => {
    it("returns structured JSON 404 for unknown endpoints", async () => {
      const res = await request(app).get("/api/unknown-route");
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, "NOT_FOUND");
    });
  });
});
