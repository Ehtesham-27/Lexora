import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { FavoriteButton } from "./FavoriteButton";

export const WordCard = ({ wordItem, isFavorite, onToggleFavorite, onExplore }) => {
  return (
    <div className="discovery-word-card clay-card">
      <div className="card-header">
        <div className="tags-group">
          <span className={`clay-badge clay-badge-${wordItem.levelColor || "lavender"}`}>
            {wordItem.level || "Word"}
          </span>
          <span className="part-of-speech-text">{wordItem.partOfSpeech}</span>
        </div>
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(wordItem)}
          label=""
        />
      </div>

      <div className="card-body">
        <div className="word-phonetic-row">
          <h3 className="card-word font-serif">{wordItem.word}</h3>
          {wordItem.phonetic && <span className="card-phonetic">{wordItem.phonetic}</span>}
        </div>

        <p className="card-definition">{wordItem.definition}</p>

        {wordItem.example && (
          <p className="card-example">&ldquo;{wordItem.example}&rdquo;</p>
        )}

        {wordItem.etymology && (
          <div className="card-etymology">
            <Sparkles size={13} className="etymology-icon" />
            <span>{wordItem.etymology}</span>
          </div>
        )}
      </div>

      <div className="card-footer">
        <button
          className="explore-word-btn"
          onClick={() => onExplore(wordItem.word)}
        >
          <span>Look up in dictionary</span>
          <ArrowRight size={15} />
        </button>
      </div>

      <style>{`
        .discovery-word-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .discovery-word-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-clay-lg);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tags-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .part-of-speech-text {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: capitalize;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .word-phonetic-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .card-word {
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.01em;
          text-transform: capitalize;
        }

        .card-phonetic {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: var(--accent-primary);
          font-weight: 500;
          letter-spacing: 0.02em;
          background-color: var(--surface-lavender-subtle);
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          display: inline-block;
        }

        .card-definition {
          font-size: 1rem;
          color: var(--text-main);
          line-height: 1.5;
        }

        .card-example {
          font-size: 0.92rem;
          color: var(--text-secondary);
          font-style: italic;
          line-height: 1.45;
          padding-left: 10px;
          border-left: 2px solid var(--surface-lavender);
        }

        .card-etymology {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .etymology-icon {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .card-footer {
          margin-top: 4px;
          padding-top: 14px;
          border-top: 1px solid var(--border-dark-subtle);
          display: flex;
          justify-content: flex-end;
        }

        .explore-word-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--accent-primary);
          transition: transform 0.15s ease;
        }
        .explore-word-btn:hover {
          transform: translateX(3px);
        }
      `}</style>
    </div>
  );
};
