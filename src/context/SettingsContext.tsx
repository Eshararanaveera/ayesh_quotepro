import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SettingsContext, type SettingsContextValue } from './settings-context';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../config/constants';
import { readStorage, writeStorage } from '../lib/storage';
import type { AppSettings } from '../types/settings';

/** Merges saved settings over the defaults so new fields added later still get values. */
function loadSettings(): AppSettings {
  const saved = readStorage<Partial<AppSettings>>(STORAGE_KEYS.settings, {});
  return {
    company: { ...DEFAULT_SETTINGS.company, ...saved.company },
    tax: { ...DEFAULT_SETTINGS.tax, ...saved.tax },
    quotation: { ...DEFAULT_SETTINGS.quotation, ...saved.quotation },
  };
}

/** Company profile, default taxes and quotation defaults, saved in localStorage. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.settings, settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
