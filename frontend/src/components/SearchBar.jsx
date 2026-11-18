import React, { useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";

export const SearchBar = ({ onSearch, initialValue = "", autoFocus = false, disabled = false }) => {
  const [query, setQuery] = useState(initialValue);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (disabled) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setError("Please enter a word to search.");
      return;
    }
    setError("");
    onSearch(trimmed);
  };

  const handleClear = () => {
    setQuery("");
    setError("");
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className={`search-input-wrapper ${error ? "has-error" : ""} ${disabled ? "is-disabled" : ""}`}>
          <Search size={20} className="search-leading-icon" />
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError("");
            }}
            placeholder="Search for a word... (e.g. serendipity, petrichor)"
            autoFocus={autoFocus}
            disabled={disabled}
            aria-label="Search dictionary"
          />
          {query.length > 0 && !disabled && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClear}
              aria-label="Clear input"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className="search-submit-btn"
            disabled={disabled}
            aria-label="Submit search"
          >
            <span>{disabled ? "Searching..." : "Search"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      {error && <div className="search-error-text">{error}</div>}

      <style>{`
        .search-bar-container {
          width: 100%;
          position: relative;
        }

        .search-form {
          width: 100%;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset);
          border-radius: var(--radius-pill);
          padding: 6px 8px 6px 20px;
          border: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .search-input-wrapper:focus-within {
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-clay-inset-focus);
        }

        .search-input-wrapper.has-error {
          border-color: #E26D5C;
        }

        .search-input-wrapper.is-disabled {
          opacity: 0.7;
          pointer-events: none;
        }

        .search-leading-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 1.05rem;
          color: var(--text-main);
          min-width: 0;
        }
        .search-input::placeholder {
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .search-clear-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          background-color: var(--surface-raised);
          box-shadow: var(--shadow-clay-sm);
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .search-clear-btn:hover {
          color: var(--text-main);
        }

        .search-submit-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--accent-primary);
          color: var(--text-on-accent);
          box-shadow: var(--shadow-clay-accent);
          border-radius: var(--radius-pill);
          padding: 10px 22px;
          font-weight: 600;
          font-size: 0.92rem;
          flex-shrink: 0;
          transition: all 0.18s ease;
        }
        .search-submit-btn:hover:not(:disabled) {
          background-color: var(--accent-primary-hover);
          transform: translateY(-1px);
        }
        .search-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .search-submit-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .search-error-text {
          margin-top: 8px;
          margin-left: 20px;
          font-size: 0.85rem;
          color: #D34B38;
          font-weight: 500;
        }

        @media (max-width: 600px) {
          .search-input-wrapper {
            padding: 5px 6px 5px 14px;
            gap: 8px;
          }
          .search-input {
            font-size: 0.92rem;
          }
          .search-submit-btn {
            padding: 8px 14px;
            font-size: 0.85rem;
          }
          .search-submit-btn span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
