import { useContext } from 'react';
import { SettingsContext, type SettingsContextValue } from '../context/settings-context';

/** Access company and tax settings. Must be used inside <SettingsProvider>. */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
