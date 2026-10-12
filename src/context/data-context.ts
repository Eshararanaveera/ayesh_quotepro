import { createContext } from 'react';
import type { Client, ClientInput, Quotation, QuotationInput, QuotationStatus } from '../types/quotation';
import type { Invoice } from '../types/invoice';

export interface AppData {
  clients: Client[];
  quotations: Quotation[];
  invoices: Invoice[];
}

export interface DataContextValue extends AppData {
  addClient: (input: ClientInput) => Client;
  updateClient: (id: string, input: ClientInput) => void;
  deleteClient: (id: string) => void;

  createQuotation: (input: QuotationInput) => Quotation;
  updateQuotation: (id: string, input: QuotationInput) => Quotation | undefined;
  setQuotationStatus: (id: string, status: QuotationStatus) => void;
  deleteQuotation: (id: string) => void;

  /** Clears local changes and reloads the sample data. */
  resetData: () => void;
}

export const DataContext = createContext<DataContextValue | null>(null);
