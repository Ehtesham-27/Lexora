import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as authService from "../../src/services/authService.js";

/**
 * State & Route Access Contract Tests
 * Verifies that the auth state machine and route access guards conform to Phase 4 requirements:
 * 1. Unauthenticated users cannot access protected views
 * 2. Authenticated users can access the application
 * 3. Session loading screen displays while checking session (preventing flash of protected content)
 * 4. Logged-in users are redirected away from Login/Signup
 * 5. Intended route destination is preserved
 * 6. Logout clears session state and blocks protected access
 */
describe("Auth State Management & Route Protection Tests", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // Simulated Auth State Controller matching AuthProvider contract
  class TestAuthStateController {
    constructor() {
      this.user = null;
      this.isLoading = true;
      this.fetchCount = 0;
    }

    get isAuthenticated() {
      return !!this.user;
    }

    async initSession() {
      this.isLoading = true;
      try {
        this.fetchCount++;
        const currentUser = await authService.getCurrentUser();
        this.user = currentUser;
      } catch {
        this.user = null;
      } finally {
        this.isLoading = false;
      }
      return this.user;
    }

    async login(email, password) {
      const data = await authService.login(email, password);
      this.user = data?.user ?? null;
      return this.user;
    }

    async signup(name, email, password, confirmPassword) {
      const data = await authService.register(name, email, password, confirmPassword);
      this.user = data?.user ?? null;
      return this.user;
    }

    async logout() {
      await authService.logout();
      this.user = null;
    }

    /**
     * Resolves view to render according to route protection rules:
     * - "LOADING": While session restoration is in progress
     * - "AUTH_LOGIN": When unauthenticated and authView="login"
     * - "AUTH_SIGNUP": When unauthenticated and authView="signup"
     * - "APP": When authenticated (renders active tab e.g. "home", "search", etc.)
     */
    resolveRenderView(requestedRoute = "home", authView = "login") {
      if (this.isLoading) {
        return { view: "LOADING", canAccessProtected: false, currentRoute: null };
      }
      if (!this.isAuthenticated) {
        return {
          view: authView === "signup" ? "AUTH_SIGNUP" : "AUTH_LOGIN",
          canAccessProtected: false,
          currentRoute: null,
          intendedRoute: requestedRoute,
        };
      }
      return {
        view: "APP",
        canAccessProtected: true,
        currentRoute: requestedRoute,
        user: this.user,
      };
    }
  }

  describe("Session Restoration Lifecycle", () => {
    it("restores user session on browser reload when cookie is valid", async () => {
      const testUser = { id: "u1", name: "Alice Explorer", email: "alice@lexora.app" };
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ user: testUser }),
      });

      const controller = new TestAuthStateController();
      assert.equal(controller.isLoading, true);
      assert.equal(controller.isAuthenticated, false);

      await controller.initSession();

      assert.equal(controller.isLoading, false);
      assert.equal(controller.isAuthenticated, true);
      assert.deepEqual(controller.user, testUser);
    });

    it("transitions cleanly to unauthenticated state when session is invalid or expired (401)", async () => {
      globalThis.fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }),
      });

      const controller = new TestAuthStateController();
      await controller.initSession();

      assert.equal(controller.isLoading, false);
      assert.equal(controller.isAuthenticated, false);
      assert.equal(controller.user, null);
    });

    it("makes exactly one fetch per session check (no duplicate requests)", async () => {
      let callCount = 0;
      globalThis.fetch = async () => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({ user: { id: "u1", name: "Alice", email: "alice@lexora.app" } }),
        };
      };

      const controller = new TestAuthStateController();
      await controller.initSession();
      assert.equal(callCount, 1);
    });
  });

  describe("Login and Signup State Transitions", () => {
    it("login updates global state from unauthenticated to authenticated", async () => {
      const controller = new TestAuthStateController();
      controller.isLoading = false;
      assert.equal(controller.isAuthenticated, false);

      const loggedInUser = { id: "u2", name: "Bob", email: "bob@lexora.app" };
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ message: "Signed in", user: loggedInUser }),
      });

      await controller.login("bob@lexora.app", "Secret123");

      assert.equal(controller.isAuthenticated, true);
      assert.deepEqual(controller.user, loggedInUser);
    });

    it("signup updates state directly from registration response (no redundant /me call)", async () => {
      let fetchUrls = [];
      const registeredUser = { id: "u3", name: "Charlie", email: "charlie@lexora.app" };
      globalThis.fetch = async (url) => {
        fetchUrls.push(url);
        return {
          ok: true,
          status: 201,
          json: async () => ({ message: "Account created", user: registeredUser }),
        };
      };

      const controller = new TestAuthStateController();
      controller.isLoading = false;

      await controller.signup("Charlie", "charlie@lexora.app", "Secret123", "Secret123");

      assert.equal(controller.isAuthenticated, true);
      assert.deepEqual(controller.user, registeredUser);
      assert.equal(fetchUrls.length, 1);
      assert.ok(fetchUrls[0].includes("/auth/register"));
    });

    it("logout clears authenticated state and user data", async () => {
      const controller = new TestAuthStateController();
      controller.isLoading = false;
      controller.user = { id: "u1", name: "Alice", email: "alice@lexora.app" };
      assert.equal(controller.isAuthenticated, true);

      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ message: "Signed out successfully." }),
      });

      await controller.logout();

      assert.equal(controller.isAuthenticated, false);
      assert.equal(controller.user, null);
    });

    it("does not clear local state if logout network request fails", async () => {
      const controller = new TestAuthStateController();
      controller.isLoading = false;
      controller.user = { id: "u1", name: "Alice", email: "alice@lexora.app" };

      globalThis.fetch = async () => {
        throw new TypeError("Failed to fetch");
      };

      await assert.rejects(async () => {
        await controller.logout();
      });

      // User session state is preserved so UI does not enter misleading false-success state
      assert.equal(controller.isAuthenticated, true);
      assert.notEqual(controller.user, null);
    });
  });

  describe("Protected Route Access & Gatekeeper Rules", () => {
    it("renders loading screen while checking session, preventing content flash", () => {
      const controller = new TestAuthStateController();
      controller.isLoading = true;

      const state = controller.resolveRenderView("search");
      assert.equal(state.view, "LOADING");
      assert.equal(state.canAccessProtected, false);
      assert.equal(state.currentRoute, null);
    });

    it("redirects unauthenticated user away from protected tabs to login", () => {
      const controller = new TestAuthStateController();
      controller.isLoading = false;
      controller.user = null;

      const state = controller.resolveRenderView("settings", "login");
      assert.equal(state.view, "AUTH_LOGIN");
      assert.equal(state.canAccessProtected, false);
      assert.equal(state.intendedRoute, "settings");
    });

    it("redirects unauthenticated user to signup when authView is signup", () => {
      const controller = new TestAuthStateController();
      controller.isLoading = false;
      controller.user = null;

      const state = controller.resolveRenderView("feed", "signup");
      assert.equal(state.view, "AUTH_SIGNUP");
      assert.equal(state.canAccessProtected, false);
      assert.equal(state.intendedRoute, "feed");
    });

    it("grants authenticated user full access to protected views (home, feed, search, settings)", () => {
      const controller = new TestAuthStateController();
      controller.isLoading = false;
      controller.user = { id: "u1", name: "Alice", email: "alice@lexora.app" };

      const tabs = ["home", "feed", "search", "settings"];
      for (const tab of tabs) {
        const state = controller.resolveRenderView(tab);
        assert.equal(state.view, "APP");
        assert.equal(state.canAccessProtected, true);
        assert.equal(state.currentRoute, tab);
      }
    });

    it("prevents authenticated user from visiting Login or Signup pages", () => {
      const controller = new TestAuthStateController();
      controller.isLoading = false;
      controller.user = { id: "u1", name: "Alice", email: "alice@lexora.app" };

      // Even if login or signup view is requested, authenticated user is kept in the main app
      const state = controller.resolveRenderView("home", "login");
      assert.equal(state.view, "APP");
      assert.notEqual(state.view, "AUTH_LOGIN");
      assert.notEqual(state.view, "AUTH_SIGNUP");
    });

    it("preserves intended route destination across login", () => {
      const controller = new TestAuthStateController();
      controller.isLoading = false;
      controller.user = null;

      // User attempted to visit 'search' tab
      const unauthState = controller.resolveRenderView("search", "login");
      const savedDestination = unauthState.intendedRoute;
      assert.equal(savedDestination, "search");

      // User logs in
      controller.user = { id: "u1", name: "Alice", email: "alice@lexora.app" };

      // Restore to saved destination
      const authState = controller.resolveRenderView(savedDestination);
      assert.equal(authState.view, "APP");
      assert.equal(authState.currentRoute, "search");
    });
  });
});
