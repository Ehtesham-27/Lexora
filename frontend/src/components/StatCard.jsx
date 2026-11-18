import React from "react";

export const StatCard = ({ icon: Icon, value, label, subtitle, colorVariant = "lavender", onClick }) => {
  return (
    <div
      className={`stat-card clay-card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`stat-icon-clay bg-${colorVariant}`}>
        <Icon size={22} className={`icon-${colorVariant}`} />
      </div>
      <div className="stat-content">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>

      <style>{`
        .stat-card {
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 200px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card.clickable {
          cursor: pointer;
        }
        .stat-card.clickable:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-clay-lg);
        }

        .stat-icon-clay {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-clay-sm);
          flex-shrink: 0;
        }

        .bg-lavender {
          background-color: var(--surface-lavender);
        }
        .icon-lavender {
          color: var(--accent-primary);
        }

        .bg-blue {
          background-color: var(--pastel-blue);
        }
        .icon-blue {
          color: var(--pastel-blue-text);
        }

        .bg-peach {
          background-color: var(--pastel-peach);
        }
        .icon-peach {
          color: var(--pastel-peach-text);
        }

        .bg-mint {
          background-color: var(--pastel-mint);
        }
        .icon-mint {
          color: var(--pastel-mint-text);
        }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.1;
        }

        .stat-label {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .stat-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};
