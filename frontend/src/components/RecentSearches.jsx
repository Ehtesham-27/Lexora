import React from "react";
import { History, X, Trash2 } from "lucide-react";

export const RecentSearches = ({ history, onSelectWord, onRemoveWord, onClearAll }) => {
  if (!history || history.length === 0) {
    return (
      <div className="recent-searches-empty">
        <History size={16} className="text-muted" />
        <span>No recent searches yet. Search a word above to build your log!</span>
        <style>{`
          .recent-searches-empty {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            font-size: 0.88rem;
            color: var(--text-muted);
            background-color: var(--surface-main);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-clay-inset-sm);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="recent-searches-wrapper">
      <div className="recent-header">
        <div className="recent-title">
          <History size={15} />
          <span>Recently Searched</span>
        </div>
        {onClearAll && (
          <button className="clear-all-btn" onClick={onClearAll} title="Clear search history">
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="chips-row">
        {history.map((word) => (
          <div key={word} className="recent-chip clay-btn" onClick={() => onSelectWord(word)}>
            <span className="chip-label">{word}</span>
            {onRemoveWord && (
              <button
                type="button"
                className="chip-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveWord(word);
                }}
                title={`Remove ${word}`}
                aria-label={`Remove ${word}`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .recent-searches-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .recent-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .recent-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .clear-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--radius-pill);
          transition: color 0.15s ease;
        }
        .clear-all-btn:hover {
          color: #E26D5C;
        }

        .chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .recent-chip {
          padding: 6px 14px;
          font-size: 0.88rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-card);
          box-shadow: var(--shadow-clay-sm);
        }
        .recent-chip:hover {
          color: var(--accent-primary);
        }

        .chip-label {
          text-transform: capitalize;
        }

        .chip-remove-btn {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
        }
        .chip-remove-btn:hover {
          color: #E26D5C;
          transform: scale(1.15);
        }
      `}</style>
    </div>
  );
};
