import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth.js";
import { userService } from "../services/userService.js";
import { syncLocalDataToServer } from "../utils/migration.js";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep a ref of previous favorites to support rollback on failed mutations
  const previousFavoritesRef = useRef([]);

  // Load account favorites and trigger migration when authenticated user changes
  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      if (!user) {
        // User logged out: clear state immediately to prevent leaking data
        setFavorites([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Run safe migration for existing local data if not yet migrated
        await syncLocalDataToServer(user.id);

        // 2. Fetch authenticated favorites from MongoDB
        const serverFavorites = await userService.getFavorites();

        if (isMounted) {
          setFavorites(serverFavorites);
          previousFavoritesRef.current = serverFavorites;
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load favorites.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const isFavorite = useCallback(
    (word) => {
      if (!word) return false;
      const lower = String(word).trim().toLowerCase();
      return favorites.some((item) => {
        const itemWord = typeof item === "string" ? item : item.word;
        return String(itemWord).trim().toLowerCase() === lower;
      });
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (wordData) => {
      if (!wordData) return;
      const rawKey = typeof wordData === "string" ? wordData : wordData.word;
      const cleanWord = String(rawKey).trim().toLowerCase();
      if (!cleanWord) return;

      const currentlyFav = favorites.some((item) => {
        const itemWord = typeof item === "string" ? item : item.word;
        return String(itemWord).trim().toLowerCase() === cleanWord;
      });

      if (currentlyFav) {
        // ── Remove Favorite ──────────────────────────────────────────────────
        const previous = [...favorites];
        previousFavoritesRef.current = previous;

        // Optimistic update
        setFavorites((prev) =>
          prev.filter((item) => {
            const itemWord = typeof item === "string" ? item : item.word;
            return String(itemWord).trim().toLowerCase() !== cleanWord;
          })
        );

        if (user) {
          try {
            await userService.removeFavorite(cleanWord);
          } catch (err) {
            // Roll back on failure
            setFavorites(previous);
            setError(err.message || "Failed to remove favorite.");
          }
        }
      } else {
        // ── Add Favorite ─────────────────────────────────────────────────────
        let newEntry;
        if (typeof wordData === "string") {
          newEntry = {
            word: cleanWord,
            phonetic: "",
            partOfSpeech: "word",
            definition: "",
            audio: null,
            savedAt: new Date().toISOString()
          };
        } else {
          const firstMeaning = wordData.meanings?.[0];
          const firstDef = firstMeaning?.definitions?.[0];

          newEntry = {
            word: cleanWord,
            phonetic: wordData.phonetic || "",
            partOfSpeech: firstMeaning?.partOfSpeech || wordData.partOfSpeech || "word",
            definition: firstDef?.definition || wordData.definition || "",
            audio: wordData.audio || null,
            savedAt: new Date().toISOString()
          };
        }

        const previous = [...favorites];
        previousFavoritesRef.current = previous;

        // Optimistic update
        setFavorites((prev) => [newEntry, ...prev]);

        if (user) {
          try {
            const savedDoc = await userService.addFavorite(newEntry);
            if (savedDoc && savedDoc.id) {
              // Update optimistic entry with server ID
              setFavorites((prev) =>
                prev.map((item) =>
                  (typeof item === "string" ? item : item.word).toLowerCase() === cleanWord
                    ? { ...newEntry, id: savedDoc.id }
                    : item
                )
              );
            }
          } catch (err) {
            // Roll back on failure
            setFavorites(previous);
            setError(err.message || "Failed to add favorite.");
          }
        }
      }
    },
    [favorites, user]
  );

  const removeFavorite = useCallback(
    async (word) => {
      if (!word) return;
      const lower = String(word).trim().toLowerCase();

      const previous = [...favorites];
      previousFavoritesRef.current = previous;

      // Optimistic update
      setFavorites((prev) =>
        prev.filter((item) => {
          const itemWord = typeof item === "string" ? item : item.word;
          return String(itemWord).trim().toLowerCase() !== lower;
        })
      );

      if (user) {
        try {
          await userService.removeFavorite(lower);
        } catch (err) {
          // Roll back on failure
          setFavorites(previous);
          setError(err.message || "Failed to remove favorite.");
        }
      }
    },
    [favorites, user]
  );

  const clearFavorites = useCallback(async () => {
    const previous = [...favorites];
    setFavorites([]);

    if (user) {
      try {
        // Remove all favorites sequentially
        for (const fav of previous) {
          const w = typeof fav === "string" ? fav : fav.word;
          await userService.removeFavorite(w);
        }
      } catch (err) {
        setFavorites(previous);
        setError(err.message || "Failed to clear favorites.");
      }
    }
  }, [favorites, user]);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
    count: favorites.length,
    isLoading,
    error
  };
};
