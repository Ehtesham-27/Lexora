import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth.js";
import { userService } from "../services/userService.js";
import { syncLocalDataToServer } from "../utils/migration.js";

const MAX_HISTORY_ITEMS = 30;

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const previousHistoryRef = useRef([]);

  // Fetch account search history when user logs in / changes
  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!user) {
        // User logged out: clear state immediately to prevent leaking across accounts
        setHistory([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Run safe migration if local data exists
        await syncLocalDataToServer(user.id);

        const data = await userService.getHistory();
        if (isMounted) {
          const list = Array.isArray(data?.history) ? data.history : [];
          setHistory(list);
          previousHistoryRef.current = list;
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load search history.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const addHistory = useCallback(
    async (rawWord) => {
      if (!rawWord || typeof rawWord !== "string") return;
      const cleanWord = rawWord.trim().toLowerCase();
      if (!cleanWord) return;

      // Optimistic update: move to top, cap at MAX_HISTORY_ITEMS
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.toLowerCase() !== cleanWord);
        return [cleanWord, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      });

      if (user) {
        try {
          // Asynchronously persist to MongoDB without blocking the user
          await userService.recordSearch(cleanWord);
        } catch (err) {
          console.warn("[SearchHistory] Failed to record search history on server:", err.message);
          // Do not roll back or fail dictionary search if history logging fails
        }
      }
    },
    [user]
  );

  const removeHistory = useCallback(
    async (rawWord) => {
      if (!rawWord) return;
      const cleanWord = String(rawWord).trim().toLowerCase();

      const previous = [...history];
      previousHistoryRef.current = previous;

      // Optimistic update
      setHistory((prev) => prev.filter((item) => item.toLowerCase() !== cleanWord));

      if (user) {
        try {
          await userService.removeHistoryEntry(cleanWord);
        } catch (err) {
          // Roll back on failure
          setHistory(previous);
          setError(err.message || "Failed to remove history entry.");
        }
      }
    },
    [history, user]
  );

  const clearHistory = useCallback(async () => {
    const previous = [...history];
    previousHistoryRef.current = previous;

    // Optimistic update
    setHistory([]);

    if (user) {
      try {
        await userService.clearHistory();
      } catch (err) {
        // Roll back on failure
        setHistory(previous);
        setError(err.message || "Failed to clear search history.");
      }
    }
  }, [history, user]);

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
    count: history.length,
    isLoading,
    error
  };
};
