export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue';

export const INVOICE_STATUSES: readonly InvoiceStatus[] = ['paid', 'unpaid', 'overdue'] as const;

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
}
