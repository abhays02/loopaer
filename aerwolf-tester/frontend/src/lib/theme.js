import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem("aerwolf_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("aerwolf_theme", theme);
  }, [theme]);

  const setTheme = useCallback(async (t) => {
    setThemeState(t);
    // best-effort persist to backend if authed
    try { await api.put("/settings", { theme: t }); } catch { /* not authed */ }
  }, []);

  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
