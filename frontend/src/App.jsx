import React, { useState } from "react";
import { Header } from "./components/Header";
import { FloatingNavigation } from "./components/FloatingNavigation";
import { PracticeModal } from "./components/PracticeModal";
import { HomePage } from "./pages/HomePage";
import { FeedPage } from "./pages/FeedPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { useTheme } from "./hooks/useTheme";
import { useFavorites } from "./hooks/useFavorites";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { useAuth } from "./context/AuthContext";

export function App() {
  const { theme, toggleTheme } = useTheme();
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Navigation tab: 'home' | 'feed' | 'search' | 'settings'
  const [activeTab, setActiveTab] = useState("home");

  // Auth view shown when user is NOT authenticated: 'login' | 'signup'
  const [authView, setAuthView] = useState("login");

  // Selected word to load into search view
  const [searchWordTarget, setSearchWordTarget] = useState("");

  // Practice quiz modal
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);

  // Handlers
  const handleExploreWord = (word) => {
    setSearchWordTarget(word);
    setActiveTab("search");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoHome = () => {
    setActiveTab("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToSettings = () => {
    setActiveTab("settings");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Loading Screen (session check in progress) ──────────────────────────
  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-inner">
          <div className="loading-logo-clay">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <p className="loading-label font-serif">Lexora</p>
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </div>
        <style>{`
          .app-loading-screen {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--bg-main);
          }
          .app-loading-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .loading-logo-clay {
            width: 64px;
            height: 64px;
            border-radius: var(--radius-lg);
            background-color: var(--surface-lavender);
            box-shadow: var(--shadow-clay-md);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-primary);
            animation: loadingPulse 1.6s ease-in-out infinite;
          }
          .loading-label {
            font-size: 1.6rem;
            font-weight: 700;
            color: var(--text-main);
            letter-spacing: -0.02em;
          }
          .loading-dots {
            display: flex;
            gap: 6px;
          }
          .loading-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--accent-primary);
            opacity: 0.3;
            animation: dotBounce 1.2s ease-in-out infinite;
          }
          .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
          .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes loadingPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.06); opacity: 0.85; }
          }
          @keyframes dotBounce {
            0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-4px); }
          }
        `}</style>
      </div>
    );
  }

  // ── Unauthenticated: show Login or Signup ────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        {authView === "login" && (
          <LoginPage
            onSwitchToSignup={() => setAuthView("signup")}
          />
        )}
        {authView === "signup" && (
          <SignupPage
            onSwitchToLogin={() => setAuthView("login")}
          />
        )}
      </div>
    );
  }

  // ── Authenticated: show full app ─────────────────────────────────────────
  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onGoHome={handleGoHome}
        onGoToSettings={handleGoToSettings}
        user={user}
      />

      {/* Main Page Area */}
      <main className="content-wrapper">
        {activeTab === "home" && (
          <HomePage
            onSearch={handleExploreWord}
            onExploreWord={handleExploreWord}
            favorites={favorites}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onRemoveFavorite={removeFavorite}
            history={history}
            onRemoveHistory={removeHistory}
            onClearHistory={clearHistory}
            onOpenPractice={() => setIsPracticeOpen(true)}
          />
        )}

        {activeTab === "feed" && (
          <FeedPage
            onExploreWord={handleExploreWord}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {activeTab === "search" && (
          <SearchPage
            initialWord={searchWordTarget}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            history={history}
            onAddHistory={addHistory}
            onRemoveHistory={removeHistory}
            onClearHistory={clearHistory}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPage
            theme={theme}
            onToggleTheme={toggleTheme}
            savedWordsCount={favorites.length}
            historyCount={history.length}
            user={user}
          />
        )}
      </main>

      {/* Floating Pill Navigation */}
      <FloatingNavigation
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* Interactive Practice Quiz Modal */}
      <PracticeModal
        isOpen={isPracticeOpen}
        onClose={() => setIsPracticeOpen(false)}
      />
    </div>
  );
}

export default App;
