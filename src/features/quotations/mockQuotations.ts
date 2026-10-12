import type { Client, Quotation, QuotationStatus } from '../../types/quotation';
import { DEFAULT_SETTINGS } from '../../config/constants';
import { MOCK_CLIENTS } from '../customers/mockClients';
import { addDays } from '../../utils/date';
import { buildQuotation } from './quotationUtils';

interface Seed {
  n: number;
  clientId: string;
  status: QuotationStatus;
  issueDate: string;
  discount?: number;
  items: [description: string, quantity: number, unitPrice: number][];
}

const SEEDS: Seed[] = [
  {
    n: 1, clientId: 'cl-1004', status: 'approved', issueDate: '2026-09-02', discount: 5,
    items: [
      ['Annual cloud hosting — high-availability cluster', 1, 450000],
      ['Security audit & compliance report', 1, 250000],
      ['Tier 3 support (monthly)', 12, 12500],
    ],
  },
  {
    n: 2, clientId: 'cl-1002', status: 'approved', issueDate: '2026-09-10',
    items: [
      ['Hotel booking website redesign', 1, 385000],
      ['Online payment gateway integration', 1, 95000],
    ],
  },
  {
    n: 3, clientId: 'cl-1001', status: 'expired', issueDate: '2026-09-12',
    items: [['Fleet tracking devices', 25, 18500], ['Installation per vehicle', 25, 3500]],
  },
  {
    n: 4, clientId: 'cl-1003', status: 'rejected', issueDate: '2026-09-18', discount: 10,
    items: [['Export documentation system', 1, 620000]],
  },
  {
    n: 5, clientId: 'cl-1005', status: 'pending', issueDate: '2026-10-01',
    items: [
      ['Site office network cabling', 1, 175000],
      ['Wi-Fi access points', 6, 32500],
      ['CCTV cameras (4MP)', 12, 21000],
    ],
  },
  {
    n: 6, clientId: 'cl-1006', status: 'pending', issueDate: '2026-10-05',
    items: [['Cold-room temperature monitoring kit', 4, 68000], ['Monitoring subscription (annual)', 1, 54000]],
  },
  {
    n: 7, clientId: 'cl-1002', status: 'draft', issueDate: '2026-10-08',
    items: [['Staff POS training (per day)', 3, 45000]],
  },
  {
    n: 8, clientId: 'cl-1004', status: 'draft', issueDate: '2026-10-09', discount: 2.5,
    items: [['Mobile app — phase 2 development', 1, 1250000], ['UI/UX design sprint', 2, 150000]],
  },
];

const clientById = (id: string): Client => {
  const client = MOCK_CLIENTS.find((c) => c.id === id);
  if (!client) throw new Error(`Unknown mock client ${id}`);
  return client;
};

export const MOCK_QUOTATIONS: Quotation[] = SEEDS.map((seed) => {
  const { id: _id, createdAt: _createdAt, ...client } = clientById(seed.clientId);
  const validityDays = DEFAULT_SETTINGS.quotation.validityDays;
  return buildQuotation(
    {
      status: seed.status,
      clientId: seed.clientId,
      client,
      issueDate: seed.issueDate,
      validityDays,
      validUntil: addDays(seed.issueDate, validityDays),
      items: seed.items.map(([description, quantity, unitPrice], i) => ({
        id: `qi-${seed.n}-${i + 1}`,
        description,
        quantity,
        unitPrice,
      })),
      discountType: 'percentage',
      discountValue: seed.discount ?? 0,
      tax: { ...DEFAULT_SETTINGS.tax },
      notes: DEFAULT_SETTINGS.quotation.notes,
    },
    {
      id: `q-${seed.n}`,
      quoteNumber: `QT-2026-${String(seed.n).padStart(4, '0')}`,
      createdAt: seed.issueDate,
      updatedAt: seed.issueDate,
    },
  );
});
