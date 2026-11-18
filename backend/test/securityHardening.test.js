import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import { env } from "../config/env.js";
import { WordCache } from "../models/WordCache.js";
import { computeDateHash, getUtcDateKey } from "../services/dailyWordService.js";
import { normalizeOrigin, getAllowedOrigins } from "../middleware/csrfProtection.js";

describe("Phase 6 Security Hardening & Production Reliability Tests", () => {
  describe("Security Headers (Helmet)", () => {
    it("sets secure HTTP response headers on API requests", async () => {
      const res = await request(app).get("/api/health");

      assert.strictEqual(res.status, 200);
      // Helmet headers
      assert.strictEqual(res.headers["x-content-type-options"], "nosniff");
      assert.strictEqual(res.headers["x-dns-prefetch-control"], "off");
      assert.strictEqual(res.headers["x-download-options"], "noopen");
      assert.strictEqual(res.headers["x-frame-options"], "SAMEORIGIN");
    });
  });

  describe("CSRF Protection Middleware", () => {
    it("normalizes origin strings correctly", () => {
      assert.strictEqual(normalizeOrigin("http://localhost:5173/"), "http://localhost:5173");
      assert.strictEqual(normalizeOrigin("https://LEXORA.COM/app"), "https://lexora.com");
      assert.strictEqual(normalizeOrigin(""), "");
    });

    it("retrieves allowed origins from config", () => {
      const origins = getAllowedOrigins();
      assert.ok(Array.isArray(origins));
      assert.ok(origins.includes("http://localhost:5173"));
    });

    it("rejects state-changing POST request from untrusted origin", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://malicious-site.com")
        .send({ email: "user@test.com", password: "Password123!" });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, "CSRF_FORBIDDEN");
      assert.ok(res.body.error.message.includes("untrusted origin"));
    });

    it("rejects state-changing DELETE request from untrusted origin", async () => {
      const res = await request(app)
        .delete("/api/user/favorites/test")
        .set("Origin", "https://evil-attacker.io");

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, "CSRF_FORBIDDEN");
    });

    it("rejects state-changing POST request with untrusted Referer", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .set("Referer", "https://phishing.site/fake-page")
        .send({ name: "Hacker", email: "hacker@test.com", password: "Password123!" });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, "CSRF_FORBIDDEN");
    });

    it("permits state-changing POST request with trusted Origin", async () => {
      // In this test, origin is valid (http://localhost:5173), so CSRF middleware passes.
      // The auth controller will then process the request (failing on validation if empty, but NOT 403).
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", "http://localhost:5173")
        .send({});

      // Passes CSRF (not 403); caught by validation (400)
      assert.notStrictEqual(res.status, 403);
      assert.strictEqual(res.status, 400);
    });

    it("exempts safe GET requests from CSRF origin rejection", async () => {
      const res = await request(app)
        .get("/api/health")
        .set("Origin", "https://any-external-site.com");

      assert.strictEqual(res.status, 200);
    });
  });

  describe("Diagnostics Endpoint Restriction", () => {
    it("returns cache statistics in test/development mode", async () => {
      WordCache.countDocuments = async () => 0;
      const res = await request(app).get("/api/cache/stats");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "ok");
      assert.ok(res.body.cache);
    });

    it("rejects cache statistics access with 403 in production mode", async () => {
      const originalIsProd = env.IS_PROD;
      try {
        env.IS_PROD = true;
        const res = await request(app).get("/api/cache/stats");
        assert.strictEqual(res.status, 403);
        assert.strictEqual(res.body.error.code, "FORBIDDEN");
        assert.ok(res.body.error.message.includes("disabled in production"));
      } finally {
        env.IS_PROD = originalIsProd;
      }
    });
  });

  describe("API Payload Limit Protection", () => {
    it("rejects request bodies that exceed the 1MB payload limit", async () => {
      // Create a payload string slightly larger than 1MB
      const hugeString = "a".repeat(1.2 * 1024 * 1024);

      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send({ name: hugeString });

      assert.strictEqual(res.status, 413); // Payload Too Large
    });
  });

  describe("Error Sanitization & 404 Fallback", () => {
    it("returns clean structured 404 error without stack traces", async () => {
      const res = await request(app).get("/api/non-existent-endpoint-test");

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, "NOT_FOUND");
      assert.strictEqual(typeof res.body.error.message, "string");
      assert.strictEqual(res.body.stack, undefined);
    });
  });

  describe("Word of the Day Safe Date Hash Calculation", () => {
    it("handles empty, missing, or malformed dateKey safely without NaN", () => {
      assert.strictEqual(computeDateHash(""), 0);
      assert.strictEqual(computeDateHash(null), 0);
      assert.strictEqual(computeDateHash(undefined), 0);
      assert.ok(Number.isInteger(computeDateHash("2026-11-18")));
      assert.ok(computeDateHash("2026-11-18") >= 0);
    });

    it("generates deterministic YYYY-MM-DD UTC date format", () => {
      const key = getUtcDateKey(new Date("2026-05-15T12:00:00Z"));
      assert.strictEqual(key, "2026-05-15");
    });
  });
});
