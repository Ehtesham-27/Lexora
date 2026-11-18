import React, { useState } from "react";
import { Volume2, AlertCircle } from "lucide-react";
import { FavoriteButton } from "./FavoriteButton";
import { playAudio } from "../utils/audio";

export const WordResult = ({ result, isFavorite, onToggleFavorite, onSelectWord }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);

  if (!result) return null;

  const cleanPhonetic = (raw) => {
    if (!raw || typeof raw !== "string") return "";
    let clean = raw.trim();
    // Standardize IPA turned-r (ɹ) to standard 'r'
    clean = clean.replace(/ɹ/g, "r");
    // Clean up irregular commas or awkward spacing
    clean = clean.replace(/^[/\s,]+/, "").replace(/[/\s,]+$/, "");
    return `/${clean}/`;
  };

  const handlePlayAudio = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setAudioError(false);

    try {
      const altUrls = result.allPhonetics
        ? result.allPhonetics.map((p) => p.audio).filter((a) => a && a !== result.audio)
        : [];
      await playAudio(result.audio, result.word, altUrls);
    } catch (err) {
      console.warn("Audio error:", err);
      setAudioError(true);
      setTimeout(() => setAudioError(false), 2500);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="word-result-container clay-card">
      {/* Top Header */}
      <div className="result-header">
        <div className="word-meta-group">
          <h1 className="result-word font-serif">{result.word}</h1>
          
          <div className="phonetic-group">
            {result.phonetic && (
              <span className="result-phonetic">{cleanPhonetic(result.phonetic)}</span>
            )}
            
            {/* Always allow audio/speech pronunciation */}
            {(result.audio || result.word) && (
              <button
                className={`clay-audio-btn ${isPlaying ? "playing" : ""} ${audioError ? "error" : ""}`}
                onClick={handlePlayAudio}
                aria-label={`Listen to pronunciation for ${result.word}`}
                title="Listen to pronunciation"
              >
                <Volume2 size={15} />
                <span>
                  {isPlaying ? "Playing..." : "Listen"}
                </span>
              </button>
            )}
          </div>
        </div>

        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(result)}
          label="Save Word"
        />
      </div>

      {/* Meanings List */}
      <div className="meanings-list">
        {result.meanings && result.meanings.length > 0 ? (
          result.meanings.map((meaning, mIndex) => (
            <div key={mIndex} className="meaning-section">
              <div className="pos-badge-row">
                <span className="clay-badge clay-badge-lavender part-of-speech-pill">
                  {meaning.partOfSpeech}
                </span>
                <div className="pos-divider" />
              </div>

              {/* Meaning-level Synonyms / Antonyms if definitions don't have them */}
              {((meaning.synonyms && meaning.synonyms.length > 0) || (meaning.antonyms && meaning.antonyms.length > 0)) && (
                <div className="meaning-chips-bar">
                  {meaning.synonyms && meaning.synonyms.length > 0 && (
                    <div className="related-group">
                      <span className="related-label">Synonyms:</span>
                      <div className="related-tags">
                        {meaning.synonyms.slice(0, 8).map((syn) => (
                          <button
                            key={syn}
                            className="related-tag-btn synonym"
                            onClick={() => onSelectWord && onSelectWord(syn)}
                            title={`Search "${syn}"`}
                          >
                            {syn}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {meaning.antonyms && meaning.antonyms.length > 0 && (
                    <div className="related-group">
                      <span className="related-label">Antonyms:</span>
                      <div className="related-tags">
                        {meaning.antonyms.slice(0, 8).map((ant) => (
                          <button
                            key={ant}
                            className="related-tag-btn antonym"
                            onClick={() => onSelectWord && onSelectWord(ant)}
                            title={`Search "${ant}"`}
                          >
                            {ant}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Definitions */}
              <ol className="definitions-ordered-list">
                {meaning.definitions?.map((def, dIndex) => (
                  <li key={dIndex} className="definition-item">
                    <p className="definition-body">{def.definition}</p>
                    
                    {def.example && (
                      <blockquote className="definition-example">
                        &ldquo;{def.example}&rdquo;
                      </blockquote>
                    )}

                    {/* Definition-level Synonyms & Antonyms */}
                    {((def.synonyms && def.synonyms.length > 0) || (def.antonyms && def.antonyms.length > 0)) && (
                      <div className="related-words-row">
                        {def.synonyms && def.synonyms.length > 0 && (
                          <div className="related-group">
                            <span className="related-label">Synonyms:</span>
                            <div className="related-tags">
                              {def.synonyms.map((syn) => (
                                <button
                                  key={syn}
                                  className="related-tag-btn synonym"
                                  onClick={() => onSelectWord && onSelectWord(syn)}
                                  title={`Search "${syn}"`}
                                >
                                  {syn}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {def.antonyms && def.antonyms.length > 0 && (
                          <div className="related-group">
                            <span className="related-label">Antonyms:</span>
                            <div className="related-tags">
                              {def.antonyms.map((ant) => (
                                <button
                                  key={ant}
                                  className="related-tag-btn antonym"
                                  onClick={() => onSelectWord && onSelectWord(ant)}
                                  title={`Search "${ant}"`}
                                >
                                  {ant}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))
        ) : (
          <div className="empty-definitions-notice">
            <AlertCircle size={18} />
            <span>No detailed definitions available for this entry.</span>
          </div>
        )}
      </div>

      <style>{`
        .word-result-container {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .result-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-dark-subtle);
        }

        .word-meta-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .result-word {
          font-size: 2.8rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.02em;
          text-transform: capitalize;
          line-height: 1.1;
        }

        .phonetic-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .result-phonetic {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          font-size: 1.05rem;
          color: var(--accent-primary);
          font-weight: 500;
          letter-spacing: 0.02em;
          background-color: var(--surface-lavender-subtle);
          padding: 4px 12px;
          border-radius: var(--radius-pill);
          box-shadow: var(--shadow-clay-inset-sm);
          display: inline-flex;
          align-items: center;
          line-height: 1.2;
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

        .meanings-list {
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .meaning-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .pos-badge-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .part-of-speech-pill {
          font-size: 0.85rem;
          padding: 4px 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pos-divider {
          flex: 1;
          height: 1px;
          background: var(--border-dark-subtle);
        }

        .meaning-chips-bar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset-sm);
        }

        .definitions-ordered-list {
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .definition-item {
          padding-left: 6px;
        }

        .definition-body {
          font-size: 1.05rem;
          color: var(--text-main);
          line-height: 1.55;
        }

        .definition-example {
          margin-top: 6px;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset-sm);
          color: var(--text-secondary);
          font-style: italic;
          font-size: 0.95rem;
          border-left: 3px solid var(--accent-primary);
        }

        .related-words-row {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .related-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .related-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .related-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .related-tag-btn {
          font-size: 0.82rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-sm);
          transition: all 0.15s ease;
        }
        .related-tag-btn.synonym {
          color: var(--pastel-mint-text);
        }
        .related-tag-btn.antonym {
          color: var(--pastel-peach-text);
        }
        .related-tag-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-clay-md);
        }

        .empty-definitions-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 0.92rem;
        }

        @media (max-width: 600px) {
          .word-result-container {
            padding: 20px;
          }
          .result-word {
            font-size: 2.2rem;
          }
        }
      `}</style>
    </div>
  );
};
