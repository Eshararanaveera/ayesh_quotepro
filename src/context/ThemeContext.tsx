import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ResolvedTheme, type Theme, type ThemeContextValue } from './theme-context';
import { STORAGE_KEYS } from '../config/constants';
import { readStorageString, writeStorageString } from '../lib/storage';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function readSavedTheme(): Theme {
  const saved = readStorageString(STORAGE_KEYS.theme);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

/**
 * Handles Light, Dark and System themes.
 * The choice is saved in localStorage and applied as a `dark` class on <html>
 * (index.html applies it before React loads to avoid a white flash).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readSavedTheme);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  // Follow OS changes while the user is on 'system'.
  useEffect(() => {
    const media = window.matchMedia(MEDIA_QUERY);
    const onChange = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? system : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.theme) setThemeState(readSavedTheme());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeStorageString(STORAGE_KEYS.theme, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
