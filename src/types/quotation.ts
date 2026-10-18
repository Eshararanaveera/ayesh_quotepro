/**
 * Core domain types for quotations.
 *
 * Dates are stored as local calendar dates in `YYYY-MM-DD` form (see utils/date.ts),
 * and money as plain LKR numbers rounded to cents.
 */

export type QuotationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'expired';

export const QUOTATION_STATUSES: readonly QuotationStatus[] = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'expired',
] as const;

/** A customer / client company. */
export interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  /** Taxpayer Identification Number or VAT registration number, if the client has one. */
  taxId?: string;
  createdAt: string;
}

/** Fields a user fills in when adding or editing a client. */
export type ClientInput = Omit<Client, 'id' | 'createdAt'>;

/** A single line on a quotation. */
export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** Optional link to a product photo, shown as a small picture on the quotation. */
  imageUrl?: string;
}

export type DiscountType = 'percentage' | 'fixed';

/** Which taxes apply to a quotation and at what rate (percent). */
export interface TaxConfig {
  vatEnabled: boolean;
  vatRate: number;
  ssclEnabled: boolean;
  ssclRate: number;
}

/**
 * Calculated money values for a quotation, following the Sri Lankan order:
 *
 *   subtotal − discount = netAmount
 *   SSCL  = netAmount × SSCL rate
 *   VAT   = (netAmount + SSCL) × VAT rate
 *   grandTotal = netAmount + SSCL + VAT
 */
export interface QuotationTotals {
  subtotal: number;
  discountAmount: number;
  netAmount: number;
  ssclAmount: number;
  vatAmount: number;
  grandTotal: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  status: QuotationStatus;
  clientId: string;
  /** Copy of the client's details when the quote was saved, so later edits to the client don't change issued documents. */
  client: ClientInput;
  issueDate: string;
  validUntil: string;
  validityDays: number;
  items: QuotationItem[];
  discountType: DiscountType;
  discountValue: number;
  tax: TaxConfig;
  totals: QuotationTotals;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** What the create / edit form submits. Totals are recalculated when it's saved. */
export type QuotationInput = Omit<Quotation, 'id' | 'quoteNumber' | 'totals' | 'createdAt' | 'updatedAt'>;
