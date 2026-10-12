import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DataContext, type AppData, type DataContextValue } from './data-context';
import { STORAGE_KEYS } from '../config/constants';
import { readStorage, writeStorage } from '../lib/storage';
import { createId } from '../lib/id';
import { useSettings } from '../hooks/useSettings';
import { MOCK_CLIENTS } from '../features/customers/mockClients';
import { MOCK_QUOTATIONS } from '../features/quotations/mockQuotations';
import { MOCK_INVOICES } from '../features/invoices/mockInvoices';
import { buildQuotation, nextQuoteNumber } from '../features/quotations/quotationUtils';
import { todayISO } from '../utils/date';
import type { ClientInput, Quotation, QuotationInput, QuotationStatus } from '../types/quotation';

const SEED: AppData = { clients: MOCK_CLIENTS, quotations: MOCK_QUOTATIONS, invoices: MOCK_INVOICES };

/** Pending quotes past their validity date become expired. */
function expireOldQuotes(data: AppData): AppData {
  const today = todayISO();
  let changed = false;
  const quotations = data.quotations.map((q) => {
    if (q.status === 'pending' && q.validUntil < today) {
      changed = true;
      return { ...q, status: 'expired' as const };
    }
    return q;
  });
  return changed ? { ...data, quotations } : data;
}

function loadData(): AppData {
  const saved = readStorage<AppData | null>(STORAGE_KEYS.data, null);
  const data =
    saved && Array.isArray(saved.clients) && Array.isArray(saved.quotations) && Array.isArray(saved.invoices)
      ? saved
      : SEED;
  return expireOldQuotes(data);
}

/**
 * In-browser data store for clients, quotations and invoices.
 *
 * It persists to localStorage so the app is fully usable before a backend
 * exists. When you add an API, replace the bodies of these functions with API
 * calls — pages only talk to this context through useAppData().
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [data, setData] = useState<AppData>(loadData);

  // Lets callbacks read the latest data without being recreated on every change.
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    writeStorage(STORAGE_KEYS.data, data);
  }, [data]);

  const prefix = settings.quotation.prefix || 'QT';

  const addClient = useCallback((input: ClientInput) => {
    const client = { ...input, id: createId(), createdAt: todayISO() };
    setData((prev) => ({ ...prev, clients: [client, ...prev.clients] }));
    return client;
  }, []);

  const updateClient = useCallback((id: string, input: ClientInput) => {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === id ? { ...c, ...input } : c)),
    }));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setData((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== id) }));
  }, []);

  const createQuotation = useCallback(
    (input: QuotationInput) => {
      const now = new Date().toISOString();
      const year = Number(input.issueDate.slice(0, 4)) || new Date().getFullYear();
      const quotation = buildQuotation(input, {
        id: createId(),
        quoteNumber: nextQuoteNumber(dataRef.current.quotations, prefix, year),
        createdAt: now,
        updatedAt: now,
      });
      setData((prev) => ({ ...prev, quotations: [quotation, ...prev.quotations] }));
      return quotation;
    },
    [prefix],
  );

  const updateQuotation = useCallback((id: string, input: QuotationInput) => {
    const existing = dataRef.current.quotations.find((q) => q.id === id);
    if (!existing) return undefined;
    const updated: Quotation = buildQuotation(input, {
      id,
      quoteNumber: existing.quoteNumber,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });
    setData((prev) => ({
      ...prev,
      quotations: prev.quotations.map((q) => (q.id === id ? updated : q)),
    }));
    return updated;
  }, []);

  const setQuotationStatus = useCallback((id: string, status: QuotationStatus) => {
    setData((prev) => ({
      ...prev,
      quotations: prev.quotations.map((q) =>
        q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q,
      ),
    }));
  }, []);

  const deleteQuotation = useCallback((id: string) => {
    setData((prev) => ({ ...prev, quotations: prev.quotations.filter((q) => q.id !== id) }));
  }, []);

  const resetData = useCallback(() => setData(expireOldQuotes(SEED)), []);

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      addClient,
      updateClient,
      deleteClient,
      createQuotation,
      updateQuotation,
      setQuotationStatus,
      deleteQuotation,
      resetData,
    }),
    [data, addClient, updateClient, deleteClient, createQuotation, updateQuotation, setQuotationStatus, deleteQuotation, resetData],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
