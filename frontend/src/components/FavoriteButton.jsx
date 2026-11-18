import React from "react";
import { Heart } from "lucide-react";

export const FavoriteButton = ({ isFavorite, onToggle, label = "Save" }) => {
  return (
    <button
      className={`favorite-btn ${isFavorite ? "is-favorite" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={isFavorite ? "Remove from saved words" : "Save word to favorites"}
      title={isFavorite ? "Saved to favorites" : "Save word"}
    >
      <Heart
        size={18}
        className={`heart-icon ${isFavorite ? "filled" : ""}`}
        fill={isFavorite ? "#E26D5C" : "none"}
        color={isFavorite ? "#E26D5C" : "currentColor"}
      />
      {label && <span className="fav-label">{isFavorite ? "Saved" : label}</span>}

      <style>{`
        .favorite-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-raised);
          box-shadow: var(--shadow-clay-sm);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 0.88rem;
          font-weight: 600;
          transition: all 0.18s ease;
          user-select: none;
        }

        .favorite-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-clay-md);
          color: var(--text-main);
        }

        .favorite-btn:active {
          transform: translateY(1px);
          box-shadow: var(--shadow-clay-pressed);
        }

        .favorite-btn.is-favorite {
          background-color: var(--surface-lavender);
          color: var(--accent-primary);
        }

        .heart-icon {
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .favorite-btn:hover .heart-icon {
          transform: scale(1.15);
        }

        .favorite-btn:active .heart-icon {
          transform: scale(0.9);
        }
      `}</style>
    </button>
  );
};
