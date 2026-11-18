import React, { useState } from "react";
import {
  Settings,
  User as UserIcon,
  Moon,
  Sun,
  Bell,
  Shield,
  Info,
  LogOut,
  Sparkles,
  Check,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export const SettingsPage = ({
  theme,
  onToggleTheme,
  onOpenAuth: _onOpenAuth,
  savedWordsCount = 0,
  historyCount = 0,
  user: userProp
}) => {
  const { user: authUser, logout } = useAuth();
  const currentUser = userProp || authUser;

  const [dailyReminders, setDailyReminders] = useState(true);
  const [quizReminders, setQuizReminders] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const triggerFeedback = (msg) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(""), 2200);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setLogoutError("");
      await logout();
      // On success, AuthContext sets user=null, App automatically routes to LoginPage
    } catch (err) {
      setLogoutError(err.message || "Failed to sign out. Please check your connection.");
      setIsLoggingOut(false);
    }
  };

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;

  return (
    <div className="settings-page-container">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-badge">
          <Settings size={14} />
          <span>Preferences & Profile</span>
        </div>
        <h1 className="settings-title font-serif">Settings</h1>
        <p className="settings-subtitle">
          Customize your visual experience, preferences, and account details.
        </p>
      </div>

      {savedFeedback && (
        <div className="toast-notification clay-card">
          <Check size={16} />
          <span>{savedFeedback}</span>
        </div>
      )}

      {logoutError && (
        <div className="toast-notification clay-card toast-error">
          <AlertCircle size={16} />
          <span>{logoutError}</span>
        </div>
      )}

      {/* Profile Section Card */}
      <div className="profile-section-card clay-card">
        <div className="profile-avatar-clay">
          {userInitials ? (
            <span className="profile-initials font-serif">{userInitials}</span>
          ) : (
            <UserIcon size={34} />
          )}
        </div>
        <div className="profile-info">
          <div className="profile-name-row">
            <h3 className="profile-name">{currentUser?.name || "Lexora Explorer"}</h3>
            <span className="profile-tier-badge">Active</span>
          </div>
          <span className="profile-email">{currentUser?.email || "—"}</span>
          <div className="profile-stats-row">
            <span><strong>{savedWordsCount}</strong> words saved</span>
            <span className="dot">•</span>
            <span><strong>{historyCount}</strong> words looked up</span>
          </div>
        </div>
        <button
          className="clay-btn edit-profile-btn"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sign out of your Lexora account"
        >
          <LogOut size={15} />
          <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
        </button>
      </div>

      {/* Appearance Settings */}
      <div className="settings-group clay-card">
        <h3 className="group-heading">Appearance</h3>
        
        <div className="setting-row">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <span className="setting-title">Interface Theme</span>
              <p className="setting-description">
                Switch between tactile Lavender light and deep purple dark clay.
              </p>
            </div>
          </div>

          <button
            className="theme-switch-pill"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            <div className={`switch-thumb ${theme === "dark" ? "dark-thumb" : ""}`}>
              {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            </div>
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="settings-group clay-card">
        <h3 className="group-heading">Notifications & Reminders</h3>

        <div className="setting-row">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="setting-title">Word of the Day Alert</span>
              <p className="setting-description">
                Receive a daily notification when a new word is featured.
              </p>
            </div>
          </div>

          <button
            className={`toggle-switch ${dailyReminders ? "is-on" : ""}`}
            onClick={() => {
              setDailyReminders(!dailyReminders);
              triggerFeedback(`Daily reminders ${!dailyReminders ? "enabled" : "disabled"}`);
            }}
          >
            <div className="toggle-thumb" />
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              <Bell size={18} />
            </div>
            <div>
              <span className="setting-title">Practice Quiz Reminder</span>
              <p className="setting-description">
                Gentle evening prompt to test your newly explored words.
              </p>
            </div>
          </div>

          <button
            className={`toggle-switch ${quizReminders ? "is-on" : ""}`}
            onClick={() => {
              setQuizReminders(!quizReminders);
              triggerFeedback(`Practice reminders ${!quizReminders ? "enabled" : "disabled"}`);
            }}
          >
            <div className="toggle-thumb" />
          </button>
        </div>
      </div>

      {/* Account & Data */}
      <div className="settings-group clay-card">
        <h3 className="group-heading">Account & Storage</h3>

        <div className="setting-row">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              <Shield size={18} />
            </div>
            <div>
              <span className="setting-title">Account Cloud Synchronization</span>
              <p className="setting-description">
                Your favorites and search history are securely synchronized with your Lexora account.
              </p>
            </div>
          </div>
          <span className="clay-badge clay-badge-mint">Synchronized</span>
        </div>

        <div className="setting-row">
          <button
            className="logout-action-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Sign out of your Lexora account"
          >
            <LogOut size={16} />
            <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>

      {/* About Lexora */}
      <div className="settings-group clay-card">
        <div className="about-header">
          <Info size={18} className="about-icon" />
          <h3 className="group-heading no-margin">About Lexora</h3>
        </div>
        <p className="about-text">
          <strong>Lexora</strong> is designed with care for students, English learners, and language enthusiasts. Built using the custom <strong>Lavender Claymorphism</strong> visual system for a calm, tactile, and focused learning experience.
        </p>
        <div className="version-pill">
          <span>Version 1.0.0 (Release v1)</span>
          <span className="dot">•</span>
          <span>Dictionary API v2</span>
        </div>
      </div>

      <style>{`
        .settings-page-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 10px;
        }

        .settings-badge {
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

        .settings-title {
          font-size: 2.6rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.02em;
        }

        .settings-subtitle {
          font-size: 1.05rem;
          color: var(--text-secondary);
        }

        .toast-notification {
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--pastel-mint-text);
          background-color: var(--pastel-mint);
          font-weight: 600;
          font-size: 0.92rem;
        }
        .toast-notification.toast-error {
          color: var(--pastel-peach-text);
          background-color: var(--pastel-peach);
        }

        /* Profile Card */
        .profile-section-card {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .profile-avatar-clay {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background-color: var(--surface-lavender);
          box-shadow: var(--shadow-clay-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .profile-initials {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--accent-primary);
          letter-spacing: 0.05em;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 200px;
        }

        .profile-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-name {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .profile-tier-badge {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-lavender-subtle);
          color: var(--accent-primary);
        }

        .profile-email {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .profile-stats-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .dot {
          opacity: 0.5;
        }

        .edit-profile-btn {
          padding: 8px 18px;
          font-size: 0.88rem;
          flex-shrink: 0;
        }

        /* Settings Group */
        .settings-group {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .group-heading {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .group-heading.no-margin {
          margin: 0;
        }

        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .setting-label-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .setting-icon-box {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .setting-title {
          font-size: 0.98rem;
          font-weight: 600;
          color: var(--text-main);
          display: block;
        }

        .setting-description {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        /* Theme Switch Pill */
        .theme-switch-pill {
          width: 60px;
          height: 32px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset);
          display: flex;
          align-items: center;
          padding: 3px;
          transition: background-color 0.2s ease;
        }

        .switch-thumb {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: var(--surface-raised);
          box-shadow: var(--shadow-clay-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .switch-thumb.dark-thumb {
          transform: translateX(28px);
          background-color: var(--surface-lavender);
        }

        /* Toggle Switch */
        .toggle-switch {
          width: 52px;
          height: 28px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset);
          display: flex;
          align-items: center;
          padding: 3px;
          transition: all 0.2s ease;
        }
        .toggle-switch.is-on {
          background-color: var(--surface-lavender);
        }

        .toggle-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background-color: var(--surface-raised);
          box-shadow: var(--shadow-clay-sm);
          transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .toggle-switch.is-on .toggle-thumb {
          transform: translateX(24px);
          background-color: var(--accent-primary);
        }

        .logout-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #E26D5C;
          font-weight: 600;
          font-size: 0.92rem;
          transition: opacity 0.15s ease;
        }
        .logout-action-btn:hover {
          opacity: 0.8;
        }

        .about-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .about-icon {
          color: var(--accent-primary);
        }

        .about-text {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        .version-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
