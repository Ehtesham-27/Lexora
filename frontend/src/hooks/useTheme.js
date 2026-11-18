import { useState, useEffect } from "react";
import { getStorageItem, setStorageItem } from "../utils/localStorage";

const THEME_STORAGE_KEY = "lexora_theme";

export const useTheme = () => {
  const [theme, setThemeState] = useState(() => {
    return getStorageItem(THEME_STORAGE_KEY, "light");
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    setStorageItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme) => {
    if (newTheme === "light" || newTheme === "dark") {
      setThemeState(newTheme);
    }
  };

  return { theme, toggleTheme, setTheme, isDark: theme === "dark" };
};
