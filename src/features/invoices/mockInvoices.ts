import type { Invoice } from '../../types/invoice';
import { MOCK_QUOTATIONS } from '../quotations/mockQuotations';

/** Sample invoices raised from approved quotations. */
const SEEDS: { n: number; quoteNumber: string; status: Invoice['status']; issueDate: string; dueDate: string; share: number }[] = [
  { n: 1, quoteNumber: 'QT-2026-0001', status: 'paid', issueDate: '2026-09-05', dueDate: '2026-09-19', share: 0.5 },
  { n: 2, quoteNumber: 'QT-2026-0001', status: 'unpaid', issueDate: '2026-10-05', dueDate: '2026-10-19', share: 0.5 },
  { n: 3, quoteNumber: 'QT-2026-0002', status: 'overdue', issueDate: '2026-09-14', dueDate: '2026-09-28', share: 1 },
];

export const MOCK_INVOICES: Invoice[] = SEEDS.map((seed) => {
  const quote = MOCK_QUOTATIONS.find((q) => q.quoteNumber === seed.quoteNumber);
  if (!quote) throw new Error(`Unknown mock quotation ${seed.quoteNumber}`);
  return {
    id: `inv-${seed.n}`,
    invoiceNumber: `INV-2026-${String(seed.n).padStart(4, '0')}`,
    quotationId: quote.id,
    clientId: quote.clientId,
    clientName: quote.client.companyName,
    amount: Math.round(quote.totals.grandTotal * seed.share * 100) / 100,
    status: seed.status,
    issueDate: seed.issueDate,
    dueDate: seed.dueDate,
  };
});
