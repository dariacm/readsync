import { useEffect, useState } from "react";
import { readPreference, writePreference, type KeyValueStorage } from "./storage";

export type Theme = "light" | "dark";

/** Also read by the inline script in index.html, which applies the theme before the first paint. */
const STORAGE_KEY = "readsync:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The theme picked with the toggle, or null to follow the system. */
export function loadTheme(storage?: KeyValueStorage): Theme | null {
  const saved = readPreference(STORAGE_KEY, storage);
  return saved === "light" || saved === "dark" ? saved : null;
}

export function saveTheme(theme: Theme, storage?: KeyValueStorage) {
  writePreference(STORAGE_KEY, theme, storage);
}

function systemTheme(): Theme {
  return globalThis.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

/** Follows the system appearance until the reader picks a theme, then remembers the choice. */
export function useTheme() {
  const [chosen, setChosen] = useState(loadTheme);
  const [system, setSystem] = useState(systemTheme);
  const theme = chosen ?? system;

  useEffect(() => {
    const query = globalThis.matchMedia?.(DARK_QUERY);
    if (!query) return;
    const onChange = (e: MediaQueryListEvent) => setSystem(e.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setChosen(next);
    saveTheme(next);
  };

  return { theme, toggleTheme };
}
