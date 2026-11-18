import React, { useState } from "react";
import { Compass } from "lucide-react";
import { feedWords } from "../data/feedWords";
import { WordCard } from "../components/WordCard";

export const FeedPage = ({ onExploreWord, isFavorite, onToggleFavorite }) => {
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filterOptions = ["All", "Essential", "Intermediate", "Advanced", "Poetic", "Philosophical"];

  const filteredWords = selectedFilter === "All"
    ? feedWords
    : feedWords.filter((w) => w.level.toLowerCase() === selectedFilter.toLowerCase());

  return (
    <div className="feed-page-container">
      {/* Header */}
      <div className="feed-header">
        <div className="feed-header-left">
          <div className="feed-badge">
            <Compass size={14} />
            <span>Discovery Feed</span>
          </div>
          <h1 className="feed-title font-serif">Curated Vocabulary</h1>
          <p className="feed-subtitle">
            Explore expressive, nuanced words hand-picked to elevate your understanding and expression.
          </p>
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="filter-chips-row">
        {filterOptions.map((filter) => {
          const isActive = selectedFilter === filter;
          return (
            <button
              key={filter}
              className={`filter-chip ${isActive ? "active" : ""}`}
              onClick={() => setSelectedFilter(filter)}
            >
              <span>{filter}</span>
            </button>
          );
        })}
      </div>

      {/* Feed Stream */}
      <div className="feed-cards-grid">
        {filteredWords.map((item) => (
          <WordCard
            key={item.id}
            wordItem={item}
            isFavorite={isFavorite(item.word)}
            onToggleFavorite={onToggleFavorite}
            onExplore={onExploreWord}
          />
        ))}
      </div>

      <style>{`
        .feed-page-container {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .feed-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-top: 10px;
        }

        .feed-header-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 640px;
        }

        .feed-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-lavender);
          color: var(--pastel-lavender-text);
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          width: fit-content;
        }

        .feed-title {
          font-size: 2.6rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.02em;
        }

        .feed-subtitle {
          font-size: 1.05rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .filter-chips-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          padding-bottom: 4px;
        }

        .filter-chip {
          padding: 8px 18px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-card);
          box-shadow: var(--shadow-clay-sm);
          color: var(--text-secondary);
          font-size: 0.88rem;
          font-weight: 600;
          transition: all 0.18s ease;
        }
        .filter-chip:hover {
          color: var(--text-main);
          transform: translateY(-1px);
        }
        .filter-chip.active {
          background-color: var(--surface-lavender);
          color: var(--accent-primary);
          box-shadow: var(--shadow-clay-pressed);
        }

        .feed-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        @media (max-width: 600px) {
          .feed-title {
            font-size: 2rem;
          }
          .feed-cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
