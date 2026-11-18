import React from "react";
import { Home, Compass, Search, Settings } from "lucide-react";

export const FloatingNavigation = ({ activeTab, onSelectTab }) => {
  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "feed", label: "Feed", icon: Compass },
    { id: "search", label: "Search", icon: Search },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="floating-nav-container" aria-label="Main Navigation">
      <div className="floating-nav-pill">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`floating-nav-item ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
            >
              <div className="nav-icon-wrapper">
                <Icon size={21} strokeWidth={isActive ? 2.4 : 1.9} />
              </div>
              <span className="nav-label">{item.label}</span>
              {isActive && <div className="nav-active-pip" />}
            </button>
          );
        })}
      </div>

      <style>{`
        .floating-nav-container {
          position: fixed;
          bottom: 24px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          pointer-events: none;
          padding: 0 16px;
        }

        .floating-nav-pill {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--surface-card);
          padding: 8px 10px;
          border-radius: var(--radius-pill);
          box-shadow: var(--shadow-clay-pill);
          border: 1px solid var(--border-subtle);
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .floating-nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-pill);
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
          user-select: none;
        }

        .floating-nav-item:hover {
          color: var(--accent-primary);
          transform: translateY(-1px);
        }

        .floating-nav-item:active {
          transform: translateY(1px);
        }

        /* Active Pill Item: tactile raised clay effect with accent glow */
        .floating-nav-item.active {
          background-color: var(--surface-raised);
          color: var(--accent-primary);
          box-shadow: var(--shadow-clay-sm);
        }

        .nav-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .floating-nav-item.active .nav-icon-wrapper {
          transform: scale(1.08);
        }

        .nav-label {
          display: inline-block;
          font-weight: 600;
        }

        .nav-active-pip {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: var(--accent-primary);
        }

        @media (max-width: 520px) {
          .floating-nav-container {
            bottom: 16px;
          }
          .floating-nav-pill {
            gap: 4px;
            padding: 6px 8px;
            width: 100%;
            max-width: 380px;
            justify-content: space-around;
          }
          .floating-nav-item {
            padding: 8px 12px;
            flex-direction: column;
            gap: 3px;
            font-size: 0.72rem;
          }
          .nav-active-pip {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};
