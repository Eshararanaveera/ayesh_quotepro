import { createContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** The user's choice, including 'system'. */
  theme: Theme;
  /** What's actually on screen after resolving 'system'. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** Flips between light and dark (leaves 'system'). */
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
