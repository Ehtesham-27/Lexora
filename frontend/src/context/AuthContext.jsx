/* oxlint-disable react/only-export-components */
/**
 * Lexora AuthContext
 * Provides authentication state and actions to the entire app.
 *
 * State:
 *   user            — user object from backend ({ id, name, email }) or null
 *   isLoading       — true while session check is in progress on mount
 *   isAuthenticated — derived: !!user
 *
 * Actions (all async):
 *   login(email, password)                           — authenticates and updates state
 *   signup(name, email, password, confirmPassword)   — registers, sets user state
 *   logout()                                         — clears cookie and state
 *   refreshSession()                                 — re-checks GET /auth/me
 */

import React, { createContext, useState, useEffect, useCallback } from "react";
import * as authService from "../services/authService.js";
import { useAuth } from "../hooks/useAuth.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session via GET /auth/me
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Refresh session — call GET /auth/me and update state.
   */
  const refreshSession = useCallback(async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  /**
   * Login — calls POST /auth/login, sets user state.
   * Throws on failure so the calling component can handle the error.
   */
  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    const loggedInUser = data?.user ?? null;
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  /**
   * Signup — calls POST /auth/register.
   * Backend sets the HttpOnly cookie and returns user on success.
   * Throws on failure.
   */
  const signup = useCallback(async (name, email, password, confirmPassword) => {
    const data = await authService.register(name, email, password, confirmPassword);
    const registeredUser = data?.user ?? null;
    setUser(registeredUser);
    return registeredUser;
  }, []);

  /**
   * Logout — calls POST /auth/logout, clears state.
   * Throws on failure so the caller can show an error and prevent uncertain state.
   */
  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth };
export default AuthContext;
