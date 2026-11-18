import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { register, login, getCurrentUser, logout } from "../../src/services/authService.js";

describe("Frontend Auth Service Unit Tests", () => {
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
        options,
      };
    };
  };

  const mockFetchNetworkError = () => {
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
  };

  describe("register()", () => {
    it("successfully registers a new user", async () => {
      const mockUser = { id: "u123", name: "Jane Doe", email: "jane@example.com" };
      mockFetchResponse(201, {
        message: "Account registered successfully.",
        user: mockUser,
      });

      const result = await register("Jane Doe", "jane@example.com", "Secret123", "Secret123");
      assert.equal(result.message, "Account registered successfully.");
      assert.deepEqual(result.user, mockUser);
    });

    it("handles duplicate email conflict (409)", async () => {
      mockFetchResponse(409, {
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email address already exists.",
        },
      });

      await assert.rejects(
        async () => {
          await register("Jane Doe", "jane@example.com", "Secret123", "Secret123");
        },
        (err) => {
          assert.equal(err.code, "EMAIL_ALREADY_EXISTS");
          assert.equal(err.status, 409);
          assert.equal(err.message, "An account with this email address already exists.");
          return true;
        }
      );
    });

    it("handles backend validation errors (400)", async () => {
      mockFetchResponse(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Password must be at least 8 characters long.",
          details: [{ path: ["password"], message: "Password must be at least 8 characters long." }],
        },
      });

      await assert.rejects(
        async () => {
          await register("Jane", "jane@example.com", "short", "short");
        },
        (err) => {
          assert.equal(err.code, "VALIDATION_ERROR");
          assert.equal(err.status, 400);
          assert.ok(Array.isArray(err.details));
          return true;
        }
      );
    });

    it("handles network failure during registration", async () => {
      mockFetchNetworkError();

      await assert.rejects(
        async () => {
          await register("Jane Doe", "jane@example.com", "Secret123", "Secret123");
        },
        (err) => {
          assert.equal(err.code, "NETWORK_ERROR");
          assert.ok(err.message.includes("Unable to reach Lexora servers"));
          return true;
        }
      );
    });
  });

  describe("login()", () => {
    it("successfully logs in with valid credentials", async () => {
      const mockUser = { id: "u123", name: "Jane Doe", email: "jane@example.com" };
      mockFetchResponse(200, {
        message: "Signed in successfully.",
        user: mockUser,
      });

      const result = await login("jane@example.com", "Secret123");
      assert.equal(result.message, "Signed in successfully.");
      assert.deepEqual(result.user, mockUser);
    });

    it("handles invalid credentials with generic 401 error", async () => {
      mockFetchResponse(401, {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });

      await assert.rejects(
        async () => {
          await login("jane@example.com", "WrongPassword");
        },
        (err) => {
          assert.equal(err.code, "INVALID_CREDENTIALS");
          assert.equal(err.status, 401);
          assert.equal(err.message, "Invalid email or password.");
          return true;
        }
      );
    });

    it("handles network error during login", async () => {
      mockFetchNetworkError();

      await assert.rejects(
        async () => {
          await login("jane@example.com", "Secret123");
        },
        (err) => {
          assert.equal(err.code, "NETWORK_ERROR");
          assert.ok(err.message.includes("Unable to reach Lexora servers"));
          return true;
        }
      );
    });
  });

  describe("getCurrentUser()", () => {
    it("restores active session and returns user profile on 200", async () => {
      const mockUser = { id: "u123", name: "Jane Doe", email: "jane@example.com" };
      mockFetchResponse(200, { user: mockUser });

      const user = await getCurrentUser();
      assert.deepEqual(user, mockUser);
    });

    it("returns null when session is unauthenticated (401 UNAUTHORIZED)", async () => {
      mockFetchResponse(401, {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. Please sign in.",
        },
      });

      const user = await getCurrentUser();
      assert.equal(user, null);
    });

    it("returns null when session token is expired (401 TOKEN_EXPIRED)", async () => {
      mockFetchResponse(401, {
        error: {
          code: "TOKEN_EXPIRED",
          message: "Your session has expired. Please sign in again.",
        },
      });

      const user = await getCurrentUser();
      assert.equal(user, null);
    });

    it("returns null when session token is invalid (401 INVALID_TOKEN)", async () => {
      mockFetchResponse(401, {
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid session token. Please sign in again.",
        },
      });

      const user = await getCurrentUser();
      assert.equal(user, null);
    });

    it("throws when server cannot be reached (network error)", async () => {
      mockFetchNetworkError();

      await assert.rejects(
        async () => {
          await getCurrentUser();
        },
        (err) => {
          assert.equal(err.code, "NETWORK_ERROR");
          return true;
        }
      );
    });
  });

  describe("logout()", () => {
    it("successfully logs out and clears auth session", async () => {
      mockFetchResponse(200, {
        message: "Signed out successfully.",
      });

      const result = await logout();
      assert.equal(result.message, "Signed out successfully.");
    });

    it("throws an error when logout API endpoint returns 500 error", async () => {
      mockFetchResponse(500, {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to complete sign out.",
        },
      });

      await assert.rejects(
        async () => {
          await logout();
        },
        (err) => {
          assert.equal(err.code, "INTERNAL_SERVER_ERROR");
          assert.equal(err.status, 500);
          return true;
        }
      );
    });

    it("throws a NETWORK_ERROR when logout fails due to connection failure", async () => {
      mockFetchNetworkError();

      await assert.rejects(
        async () => {
          await logout();
        },
        (err) => {
          assert.equal(err.code, "NETWORK_ERROR");
          return true;
        }
      );
    });
  });

  describe("Cookie credentials inclusion", () => {
    it("ensures credentials: 'include' is sent on every auth call", async () => {
      let capturedOptions = null;
      globalThis.fetch = async (_url, options) => {
        capturedOptions = options;
        return {
          ok: true,
          status: 200,
          json: async () => ({ message: "ok", user: { id: "1" } }),
        };
      };

      await getCurrentUser();
      assert.equal(capturedOptions.credentials, "include");

      await login("a@b.com", "p");
      assert.equal(capturedOptions.credentials, "include");

      await logout();
      assert.equal(capturedOptions.credentials, "include");
    });
  });
});
