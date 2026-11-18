import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, WifiOff, BookOpen, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { SearchBar } from "../components/SearchBar";
import { WordResult } from "../components/WordResult";
import { RecentSearches } from "../components/RecentSearches";
import { dictionaryService } from "../services/dictionaryService";

export const SearchPage = ({
  initialWord = "",
  isFavorite,
  onToggleFavorite,
  history,
  onAddHistory,
  onRemoveHistory,
  onClearHistory
}) => {
  const [currentQuery, setCurrentQuery] = useState(initialWord);
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const lastSearchedRef = useRef("");

  const executeSearch = useCallback(async (word) => {
    if (!word || !word.trim()) return;
    const clean = word.trim().toLowerCase();

    // Prevent immediate duplicate query if already displaying this exact result
    if (clean === lastSearchedRef.current && searchResult && !searchError) {
      return;
    }

    lastSearchedRef.current = clean;
    setCurrentQuery(clean);
    setIsLoading(true);
    setSearchError(null);

    try {
      const data = await dictionaryService.searchWord(clean);
      setSearchResult(data);
      // ONLY add successful searches to history
      onAddHistory(clean);
    } catch (err) {
      // If superseded by a newer search, do nothing
      if (err.code === "ABORTED") return;

      setSearchResult(null);
      setSearchError({
        code: err.code || "UNKNOWN",
        message: err.message || `No definition found for "${word}".`,
        searchedWord: clean
      });
      // Failed searches are explicitly NOT added to history
    } finally {
      setIsLoading(false);
    }
  }, [onAddHistory, searchResult, searchError]);

  // If initialWord changes, execute search
  useEffect(() => {
    if (initialWord && initialWord.trim().length > 0 && initialWord.trim().toLowerCase() !== lastSearchedRef.current) {
      const timer = setTimeout(() => {
        executeSearch(initialWord);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialWord, executeSearch]);

  const suggestedWords = ["serendipity", "petrichor", "ephemeral", "resilience", "sonder", "beautiful", "hello"];

  return (
    <div className="search-page-container">
      {/* Search Header */}
      <div className="search-page-header">
        <h1 className="search-page-title font-serif">Dictionary Lookup</h1>
        <p className="search-page-subtitle">
          Search English words for meanings, phonetics, parts of speech, usage, and synonyms.
        </p>

        <div className="search-bar-wrap">
          <SearchBar
            initialValue={currentQuery}
            onSearch={executeSearch}
            autoFocus={!initialWord}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Recent Searches Bar */}
      <RecentSearches
        history={history}
        onSelectWord={executeSearch}
        onRemoveWord={onRemoveHistory}
        onClearAll={onClearHistory}
      />

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="search-skeleton-card clay-card">
          <div className="skeleton-header-row">
            <div className="skeleton-pill word-skeleton" />
            <div className="skeleton-pill btn-skeleton" />
          </div>
          <div className="skeleton-pill phonetic-skeleton" />
          <div className="skeleton-divider" />
          <div className="skeleton-pill def-skeleton-1" />
          <div className="skeleton-pill def-skeleton-2" />
          <div className="skeleton-pill def-skeleton-3" />
        </div>
      )}

      {/* Search Result */}
      {!isLoading && searchResult && (
        <WordResult
          result={searchResult}
          isFavorite={isFavorite(searchResult.word)}
          onToggleFavorite={onToggleFavorite}
          onSelectWord={executeSearch}
        />
      )}

      {/* Word Not Found State */}
      {!isLoading && searchError && searchError.code === "NOT_FOUND" && (
        <div className="search-not-found-card clay-card">
          <div className="error-icon-clay">
            <AlertCircle size={32} />
          </div>
          <h3 className="error-title font-serif">Word Not Found</h3>
          <p className="error-desc">{searchError.message}</p>

          <div className="suggestions-box">
            <span className="suggestions-label">Try exploring one of our featured words:</span>
            <div className="suggestions-pills">
              {suggestedWords.map((word) => (
                <button
                  key={word}
                  className="suggestion-pill"
                  onClick={() => executeSearch(word)}
                >
                  <Sparkles size={12} />
                  <span>{word}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Network / API Failure State */}
      {!isLoading && searchError && searchError.code !== "NOT_FOUND" && (
        <div className="search-network-error-card clay-card">
          <div className="network-error-icon-clay">
            <WifiOff size={32} />
          </div>
          <h3 className="error-title font-serif">Connection Issue</h3>
          <p className="error-desc">{searchError.message}</p>
          <button
            className="clay-btn retry-btn"
            onClick={() => executeSearch(searchError.searchedWord)}
          >
            <RotateCcw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty Initial State (no search performed yet) */}
      {!isLoading && !searchResult && !searchError && (
        <div className="search-empty-state clay-card">
          <div className="empty-icon-circle">
            <BookOpen size={36} />
          </div>
          <h3 className="empty-title font-serif">Begin your word exploration</h3>
          <p className="empty-desc">
            Type any word above or pick from one of the suggested vocabulary gems below:
          </p>

          <div className="suggestions-pills center">
            {suggestedWords.map((word) => (
              <button
                key={word}
                className="suggestion-pill"
                onClick={() => executeSearch(word)}
              >
                <span>{word}</span>
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .search-page-container {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .search-page-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 10px;
        }

        .search-page-title {
          font-size: 2.6rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.02em;
        }

        .search-page-subtitle {
          font-size: 1.05rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .search-bar-wrap {
          width: 100%;
        }

        /* Loading Skeleton */
        .search-skeleton-card {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .skeleton-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .skeleton-pill {
          border-radius: var(--radius-pill);
          background-color: var(--surface-lavender);
          animation: pulse 1.4s ease-in-out infinite;
        }

        .word-skeleton { width: 35%; height: 42px; }
        .btn-skeleton { width: 100px; height: 38px; }
        .phonetic-skeleton { width: 20%; height: 20px; }
        .skeleton-divider { height: 1px; background-color: var(--border-dark-subtle); margin: 6px 0; }
        .def-skeleton-1 { width: 90%; height: 22px; }
        .def-skeleton-2 { width: 75%; height: 22px; }
        .def-skeleton-3 { width: 60%; height: 22px; }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.25; }
        }

        /* Not Found */
        .search-not-found-card,
        .search-network-error-card {
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
        }

        .search-not-found-card {
          border-left: 5px solid var(--pastel-peach-text);
        }

        .search-network-error-card {
          border-left: 5px solid #E26D5C;
        }

        .error-icon-clay,
        .network-error-icon-clay {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          box-shadow: var(--shadow-clay-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-icon-clay {
          background-color: var(--pastel-peach);
          color: var(--pastel-peach-text);
        }

        .network-error-icon-clay {
          background-color: #F8D7DA;
          color: #721C24;
        }

        .error-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .error-desc {
          font-size: 1.02rem;
          color: var(--text-secondary);
          max-width: 480px;
        }

        .retry-btn {
          margin-top: 8px;
          padding: 10px 20px;
        }

        .suggestions-box {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .suggestions-label {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .suggestions-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .suggestion-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-sm);
          color: var(--text-main);
          font-size: 0.88rem;
          font-weight: 600;
          text-transform: capitalize;
          transition: all 0.16s ease;
        }
        .suggestion-pill:hover {
          color: var(--accent-primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-clay-md);
        }

        /* Empty Initial State */
        .search-empty-state {
          padding: 50px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 14px;
        }

        .empty-icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background-color: var(--surface-lavender);
          box-shadow: var(--shadow-clay-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          margin-bottom: 6px;
        }

        .empty-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .empty-desc {
          font-size: 1.02rem;
          color: var(--text-secondary);
          max-width: 480px;
          margin-bottom: 8px;
        }

        @media (max-width: 600px) {
          .search-page-title {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};
