import React from "react";
import { BookOpen, Moon, Sun, User } from "lucide-react";

export const Header = ({
  theme,
  onToggleTheme,
  onOpenAuth,
  onGoHome,
  onGoToSettings,
  user
}) => {
  const handleAccountClick = () => {
    if (user && onGoToSettings) {
      onGoToSettings();
    } else if (onOpenAuth) {
      onOpenAuth();
    }
  };

  const displayName = user?.name ? user.name.split(" ")[0] : "Sign In";

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Brand Logo */}
        <button className="brand-button" onClick={onGoHome} title="Go to Home">
          <div className="brand-icon-clay">
            <BookOpen size={20} className="brand-book-icon" />
          </div>
          <div className="brand-text-group">
            <span className="brand-title font-serif">Lexora</span>
            <span className="brand-badge">Vocabulary</span>
          </div>
        </button>

        {/* Right Actions */}
        <div className="header-actions">
          {/* Theme Toggle */}
          <button
            className="clay-icon-btn"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Account / Auth Button */}
          <button
            className="clay-auth-btn"
            onClick={handleAccountClick}
            aria-label={user ? `Signed in as ${user.name}` : "Account & Sign In"}
            title={user ? `Signed in as ${user.name} (Settings)` : "Account & Sign In"}
          >
            <User size={17} />
            <span className="auth-btn-label">{displayName}</span>
          </button>
        </div>
      </div>

      <style>{`
        .app-header {
          width: 100%;
          padding: 18px 20px 0 20px;
          display: flex;
          justify-content: center;
        }

        .header-inner {
          width: 100%;
          max-width: var(--content-max-width);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand-button {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
        }

        .brand-icon-clay {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background-color: var(--surface-lavender);
          box-shadow: var(--shadow-clay-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          transition: transform 0.2s ease;
        }
        .brand-button:hover .brand-icon-clay {
          transform: rotate(-4deg) scale(1.05);
        }

        .brand-text-group {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .brand-title {
          font-size: 1.55rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.02em;
        }

        .brand-badge {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-lavender-subtle);
          color: var(--accent-primary);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .clay-icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--surface-raised);
          box-shadow: var(--shadow-clay-sm);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }
        .clay-icon-btn:hover {
          color: var(--accent-primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-clay-md);
        }
        .clay-icon-btn:active {
          transform: translateY(1px);
          box-shadow: var(--shadow-clay-pressed);
        }

        .clay-auth-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-raised);
          box-shadow: var(--shadow-clay-sm);
          border: 1px solid var(--border-subtle);
          color: var(--text-main);
          font-size: 0.88rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .clay-auth-btn:hover {
          color: var(--accent-primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-clay-md);
        }
        .clay-auth-btn:active {
          transform: translateY(1px);
          box-shadow: var(--shadow-clay-pressed);
        }

        .auth-btn-label {
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 520px) {
          .auth-btn-label {
            display: none;
          }
          .clay-auth-btn {
            width: 40px;
            height: 40px;
            padding: 0;
            justify-content: center;
            border-radius: 50%;
          }
          .brand-badge {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
