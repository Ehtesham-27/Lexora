import React, { useState } from "react";
import { Sparkles, Volume2, ArrowRight, RotateCw } from "lucide-react";
import { FavoriteButton } from "./FavoriteButton";
import { playAudio } from "../utils/audio";

export const WordOfDay = ({
  wordData,
  isLoading = false,
  error = null,
  onRetry,
  isFavorite,
  onToggleFavorite,
  onExplore
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);

  if (error) {
    return (
      <div className="word-of-day-card clay-card wotd-error-state">
        <div className="card-top-row">
          <div className="wotd-badge">
            <Sparkles size={14} className="sparkle-icon" />
            <span>Word of the Day</span>
          </div>
        </div>
        <div className="wotd-error-content">
          <p className="wotd-error-message">Unable to load today&apos;s featured word.</p>
          {onRetry && (
            <button className="clay-btn retry-btn" onClick={onRetry}>
              <RotateCw size={14} />
              <span>Try Again</span>
            </button>
          )}
        </div>
        <style>{`
          .wotd-error-state {
            padding: 28px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            border-left: 5px solid var(--accent-primary);
          }
          .wotd-error-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
          }
          .wotd-error-message {
            color: var(--text-secondary);
            font-size: 0.95rem;
          }
          .retry-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 16px;
            font-size: 0.85rem;
          }
        `}</style>
      </div>
    );
  }

  if (isLoading || !wordData) {
    return (
      <div className="word-of-day-card clay-card skeleton-loading">
        <div className="skeleton-bar title-bar" />
        <div className="skeleton-bar text-bar" />
        <style>{`
          .skeleton-loading {
            padding: 28px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .skeleton-bar {
            border-radius: var(--radius-pill);
            background-color: var(--surface-lavender);
            animation: pulse 1.5s ease-in-out infinite;
          }
          .title-bar { width: 40%; height: 32px; }
          .text-bar { width: 80%; height: 20px; }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  const cleanPhonetic = (raw) => {
    if (!raw || typeof raw !== "string") return "";
    let clean = raw.trim();
    clean = clean.replace(/ɹ/g, "r");
    clean = clean.replace(/^[/\s,]+/, "").replace(/[/\s,]+$/, "");
    return `/${clean}/`;
  };

  const handlePlayAudio = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setAudioError(false);

    try {
      const altUrls = wordData.allPhonetics
        ? wordData.allPhonetics.map((p) => p.audio).filter((a) => a && a !== wordData.audio)
        : [];
      await playAudio(wordData.audio, wordData.word, altUrls);
    } catch (err) {
      console.warn("Audio playback error:", err);
      setAudioError(true);
      setTimeout(() => setAudioError(false), 2500);
    } finally {
      setIsPlaying(false);
    }
  };

  const primaryMeaning = wordData.meanings?.[0];
  const primaryDefinition = primaryMeaning?.definitions?.[0];

  return (
    <div className="word-of-day-card clay-card">
      {/* Header Tag */}
      <div className="card-top-row">
        <div className="wotd-badge">
          <Sparkles size={14} className="sparkle-icon" />
          <span>Word of the Day</span>
        </div>
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(wordData)}
          label="Save"
        />
      </div>

      {/* Word and Phonetics */}
      <div className="word-main-group">
        <div className="word-title-row">
          <h2 className="word-heading font-serif">{wordData.word}</h2>
          {primaryMeaning?.partOfSpeech && (
            <span className="clay-badge clay-badge-lavender">
              {primaryMeaning.partOfSpeech}
            </span>
          )}
        </div>

        <div className="phonetic-audio-row">
          {wordData.phonetic && (
            <span className="phonetic-text">{cleanPhonetic(wordData.phonetic)}</span>
          )}
          {(wordData.audio || wordData.word) && (
            <button
              className={`clay-audio-btn ${isPlaying ? "playing" : ""} ${audioError ? "error" : ""}`}
              onClick={handlePlayAudio}
              aria-label="Play pronunciation"
              title="Listen to pronunciation"
            >
              <Volume2 size={16} />
              <span className="audio-label">
                {isPlaying ? "Playing..." : "Listen"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Definition & Example */}
      {primaryDefinition && (
        <div className="definition-box">
          <p className="definition-text">{primaryDefinition.definition}</p>
          {primaryDefinition.example && (
            <p className="example-text">
              &ldquo;{primaryDefinition.example}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Bottom Action */}
      <div className="card-footer-row">
        <button
          className="clay-btn explore-btn"
          onClick={() => onExplore(wordData.word)}
        >
          <span>Explore Word</span>
          <ArrowRight size={16} />
        </button>
      </div>

      <style>{`
        .word-of-day-card {
          padding: 28px;
          background: linear-gradient(135deg, var(--surface-card) 60%, var(--surface-lavender-subtle) 100%);
          display: flex;
          flex-direction: column;
          gap: 20px;
          border-left: 5px solid var(--accent-primary);
        }

        .card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .wotd-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-lavender);
          color: var(--pastel-lavender-text);
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          box-shadow: var(--shadow-clay-sm);
        }

        .sparkle-icon {
          color: var(--accent-primary);
        }

        .word-main-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .word-title-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
        }

        .word-heading {
          font-size: 2.3rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.02em;
          text-transform: capitalize;
        }

        .phonetic-audio-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .phonetic-text {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          font-size: 0.95rem;
          color: var(--accent-primary);
          font-weight: 500;
          letter-spacing: 0.02em;
          background-color: var(--surface-lavender-subtle);
          padding: 3px 10px;
          border-radius: var(--radius-pill);
          box-shadow: var(--shadow-clay-inset-sm);
          display: inline-flex;
          align-items: center;
        }

        .clay-audio-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-sm);
          color: var(--accent-primary);
          font-size: 0.82rem;
          font-weight: 600;
          transition: all 0.15s ease;
        }
        .clay-audio-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-clay-md);
        }
        .clay-audio-btn.playing {
          background-color: var(--surface-lavender);
          box-shadow: var(--shadow-clay-pressed);
        }
        .clay-audio-btn.error {
          color: #D34B38;
          background-color: var(--pastel-peach);
        }

        .definition-box {
          padding: 16px 18px;
          border-radius: var(--radius-md);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset-sm);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .definition-text {
          font-size: 1.02rem;
          color: var(--text-main);
          line-height: 1.55;
        }

        .example-text {
          font-size: 0.95rem;
          color: var(--text-secondary);
          font-style: italic;
          line-height: 1.45;
        }

        .card-footer-row {
          display: flex;
          justify-content: flex-end;
        }

        .explore-btn {
          padding: 8px 18px;
          font-size: 0.88rem;
        }

        @media (max-width: 600px) {
          .word-of-day-card {
            padding: 20px;
          }
          .word-heading {
            font-size: 1.9rem;
          }
        }
      `}</style>
    </div>
  );
};
