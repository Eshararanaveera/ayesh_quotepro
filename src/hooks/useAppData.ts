import { useContext } from 'react';
import { DataContext, type DataContextValue } from '../context/data-context';

/** Clients, quotations and invoices plus the actions that change them. */
export function useAppData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useAppData must be used within a DataProvider');
  }
  return context;
}
