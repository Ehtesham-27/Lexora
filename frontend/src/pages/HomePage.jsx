import React, { useState, useEffect } from "react";
import { Bookmark, BrainCircuit, ArrowRight, Sparkles, BookOpen, Search as SearchIcon, X, Trash2 } from "lucide-react";
import { SearchBar } from "../components/SearchBar";
import { WordOfDay } from "../components/WordOfDay";
import { StatCard } from "../components/StatCard";
import { RecentSearches } from "../components/RecentSearches";
import { dictionaryService } from "../services/dictionaryService";

export const HomePage = ({
  onSearch,
  onExploreWord,
  favorites,
  isFavorite,
  onToggleFavorite,
  onRemoveFavorite,
  history,
  onRemoveHistory,
  onClearHistory,
  onOpenPractice
}) => {
  const [wotd, setWotd] = useState(null);
  const [wotdLoading, setWotdLoading] = useState(true);
  const [wotdError, setWotdError] = useState(null);
  const [favoriteFilter, setFavoriteFilter] = useState("");

  const handleRetryWotd = () => {
    setWotdLoading(true);
    setWotdError(null);
    dictionaryService
      .getWordOfTheDay()
      .then((data) => {
        setWotd(data);
        setWotdLoading(false);
      })
      .catch((err) => {
        setWotdError(err.message || "Failed to load Word of the Day.");
        setWotdLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    dictionaryService
      .getWordOfTheDay()
      .then((data) => {
        if (isMounted) {
          setWotd(data);
          setWotdLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setWotdError(err.message || "Failed to load Word of the Day.");
          setWotdLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter favorites based on filter query
  const filteredFavorites = favorites.filter((fav) => {
    if (!favoriteFilter.trim()) return true;
    const wordKey = typeof fav === "string" ? fav : fav.word;
    const def = typeof fav === "object" ? fav.definition : "";
    const query = favoriteFilter.trim().toLowerCase();
    return wordKey.toLowerCase().includes(query) || def.toLowerCase().includes(query);
  });

  return (
    <div className="home-page-container">
      {/* Hero Greeting Section */}
      <section className="hero-section">
        <div className="hero-text-group">
          <div className="welcome-tag">
            <Sparkles size={14} className="sparkle-icon" />
            <span>Welcome to Lexora</span>
          </div>
          <h1 className="hero-title font-serif">
            Find the right word.
          </h1>
          <p className="hero-subtitle">
            Discover rich definitions, explore usage, listen to pronunciations, and expand your vocabulary one word at a time.
          </p>
        </div>

        {/* Prominent Search Bar */}
        <div className="hero-search-wrapper">
          <SearchBar onSearch={onSearch} />
        </div>
      </section>

      {/* Vocabulary Stats Row */}
      <section className="stats-row" aria-label="Vocabulary statistics">
        <StatCard
          icon={Bookmark}
          value={favorites.length}
          label="Saved Words"
          subtitle="Your personal lexicon"
          colorVariant="lavender"
        />
        <StatCard
          icon={BookOpen}
          value={history.length}
          label="Words Explored"
          subtitle="Searches & references"
          colorVariant="blue"
        />
        <StatCard
          icon={BrainCircuit}
          value="5 / 5"
          label="Practice Ready"
          subtitle="Daily interactive quiz"
          colorVariant="mint"
          onClick={onOpenPractice}
        />
      </section>

      {/* Word of the Day Feature Card */}
      <section className="section-block">
        <WordOfDay
          wordData={wotd}
          isLoading={wotdLoading}
          error={wotdError}
          onRetry={handleRetryWotd}
          isFavorite={wotd ? isFavorite(wotd.word) : false}
          onToggleFavorite={onToggleFavorite}
          onExplore={onExploreWord}
        />
      </section>

      {/* Practice Quiz Banner Card */}
      <section className="section-block">
        <div className="practice-banner clay-card">
          <div className="practice-banner-content">
            <div className="practice-badge">
              <BrainCircuit size={15} />
              <span>Vocabulary Booster</span>
            </div>
            <h3 className="practice-title font-serif">Ready for today&apos;s practice?</h3>
            <p className="practice-desc">
              Reinforce what you&apos;ve discovered with our 5-question multiple choice challenge.
            </p>
          </div>
          <button className="clay-btn-primary practice-cta-btn" onClick={onOpenPractice}>
            <span>Start Practice</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Saved Words / Favorites Section */}
      <section className="section-block">
        <div className="section-header-row">
          <div className="section-title-group">
            <h3 className="section-heading font-serif">Saved Vocabulary</h3>
            <span className="section-count-badge">{favorites.length} saved</span>
          </div>

          {/* Filter Input if user has multiple favorites */}
          {favorites.length > 2 && (
            <div className="favorites-filter-wrap">
              <SearchIcon size={14} className="filter-icon" />
              <input
                type="text"
                placeholder="Filter saved words..."
                value={favoriteFilter}
                onChange={(e) => setFavoriteFilter(e.target.value)}
                className="favorites-filter-input"
              />
              {favoriteFilter && (
                <button
                  className="filter-clear-btn"
                  onClick={() => setFavoriteFilter("")}
                  title="Clear filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {favorites.length === 0 ? (
          <div className="empty-favorites-clay clay-card">
            <Bookmark size={24} className="empty-fav-icon" />
            <p className="empty-fav-text">
              No saved words yet. Tap the <strong>Save</strong> button on any word card to build your personal vocabulary list!
            </p>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="empty-favorites-clay clay-card">
            <p className="empty-fav-text">
              No saved words match &ldquo;{favoriteFilter}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="saved-words-grid">
            {filteredFavorites.map((fav) => {
              const wordKey = typeof fav === "string" ? fav : fav.word;
              const phonetic = typeof fav === "object" ? fav.phonetic : "";
              const def = typeof fav === "object" ? fav.definition : "";
              const pos = typeof fav === "object" ? fav.partOfSpeech : "";

              return (
                <div
                  key={wordKey}
                  className="saved-word-mini-card clay-card-interactive"
                  onClick={() => onExploreWord(wordKey)}
                >
                  <div className="mini-card-top">
                    <div className="mini-word-group">
                      <span className="mini-word font-serif">{wordKey}</span>
                      {pos && <span className="mini-pos-badge">{pos}</span>}
                    </div>
                    <button
                      type="button"
                      className="mini-remove-fav-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRemoveFavorite) {
                          onRemoveFavorite(wordKey);
                        } else {
                          onToggleFavorite(fav);
                        }
                      }}
                      title={`Remove ${wordKey} from saved`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {phonetic && <span className="mini-phonetic">{phonetic}</span>}
                  {def && <p className="mini-def">{def}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Searches */}
      <section className="section-block">
        <RecentSearches
          history={history}
          onSelectWord={onSearch}
          onRemoveWord={onRemoveHistory}
          onClearAll={onClearHistory}
        />
      </section>

      <style>{`
        .home-page-container {
          display: flex;
          flex-direction: column;
          gap: 36px;
        }

        .hero-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 22px;
          padding: 24px 0 10px 0;
        }

        .hero-text-group {
          max-width: 660px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .welcome-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-lavender);
          color: var(--pastel-lavender-text);
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          box-shadow: var(--shadow-clay-sm);
        }

        .hero-title {
          font-size: 3.2rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .hero-subtitle {
          font-size: 1.08rem;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        .hero-search-wrapper {
          width: 100%;
          max-width: 680px;
        }

        .stats-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .section-block {
          width: 100%;
        }

        .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .section-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-heading {
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .section-count-badge {
          font-size: 0.82rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset-sm);
          color: var(--accent-primary);
        }

        .favorites-filter-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset-sm);
          border-radius: var(--radius-pill);
          padding: 4px 12px;
        }

        .filter-icon {
          color: var(--text-muted);
        }

        .favorites-filter-input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.85rem;
          color: var(--text-main);
          width: 140px;
        }
        .favorites-filter-input::placeholder {
          color: var(--text-muted);
        }

        .filter-clear-btn {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .filter-clear-btn:hover {
          color: var(--text-main);
        }

        /* Empty Favorites */
        .empty-favorites-clay {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-radius: var(--radius-md);
        }

        .empty-fav-icon {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .empty-fav-text {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        /* Practice Banner */
        .practice-banner {
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: linear-gradient(135deg, var(--surface-card) 40%, var(--pastel-mint) 150%);
          flex-wrap: wrap;
        }

        .practice-banner-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .practice-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--pastel-mint-text);
          text-transform: uppercase;
        }

        .practice-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .practice-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
        }

        .practice-cta-btn {
          flex-shrink: 0;
        }

        /* Saved Words Grid */
        .saved-words-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }

        .saved-word-mini-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }

        .mini-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mini-word-group {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .mini-word {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          text-transform: capitalize;
        }

        .mini-pos-badge {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--accent-primary);
          text-transform: uppercase;
          background-color: var(--surface-lavender-subtle);
          padding: 1px 6px;
          border-radius: var(--radius-pill);
        }

        .mini-remove-fav-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-sm);
          transition: all 0.15s ease;
        }
        .mini-remove-fav-btn:hover {
          color: #E26D5C;
          transform: scale(1.1);
        }

        .mini-phonetic {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          font-size: 0.8rem;
          color: var(--accent-primary);
          background-color: var(--surface-lavender-subtle);
          padding: 1px 6px;
          border-radius: var(--radius-pill);
          display: inline-block;
        }

        .mini-def {
          font-size: 0.88rem;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.45;
        }

        @media (max-width: 680px) {
          .hero-title {
            font-size: 2.3rem;
          }
          .stats-row {
            flex-direction: column;
          }
          .practice-banner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};
