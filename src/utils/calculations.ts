import type { DiscountType, QuotationTotals, TaxConfig } from '../types/quotation';
import { roundToCents, toNumber, type Numeric } from './formatters';

/** Anything with a quantity and unit price — saved items or form rows holding strings. */
export interface PricedLine {
  quantity: Numeric;
  unitPrice: Numeric;
}

export interface DiscountInput {
  type: DiscountType;
  value: Numeric;
}

export const NO_TAX: TaxConfig = { vatEnabled: false, vatRate: 0, ssclEnabled: false, ssclRate: 0 };

/** Quantity × unit price, rounded to cents. Negative inputs count as zero. */
export function lineTotal(line: PricedLine): number {
  const qty = Math.max(0, toNumber(line.quantity));
  const price = Math.max(0, toNumber(line.unitPrice));
  return roundToCents(qty * price);
}

/** Discount in LKR, clamped so it never exceeds the subtotal. */
export function discountAmount(subtotal: number, discount: DiscountInput): number {
  const value = Math.max(0, toNumber(discount.value));
  const raw = discount.type === 'percentage' ? (subtotal * Math.min(value, 100)) / 100 : value;
  return roundToCents(Math.min(raw, subtotal));
}

/**
 * Calculates quotation totals using the Sri Lankan order of taxes:
 *
 *   1. Subtotal   = Σ line totals
 *   2. Net amount = Subtotal − Discount
 *   3. SSCL       = Net amount × SSCL rate (2.5%)
 *   4. VAT        = (Net amount + SSCL) × VAT rate (18%)
 *   5. Grand total = Net amount + SSCL + VAT
 *
 * Each step is rounded to cents so the printed lines always add up.
 */
export function calculateQuotationTotals(
  items: readonly PricedLine[],
  discount: DiscountInput,
  tax: TaxConfig,
): QuotationTotals {
  const subtotal = roundToCents(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const discountValue = discountAmount(subtotal, discount);
  const netAmount = roundToCents(subtotal - discountValue);

  const ssclAmount = tax.ssclEnabled ? roundToCents((netAmount * toNumber(tax.ssclRate)) / 100) : 0;
  const vatAmount = tax.vatEnabled
    ? roundToCents(((netAmount + ssclAmount) * toNumber(tax.vatRate)) / 100)
    : 0;

  return {
    subtotal,
    discountAmount: discountValue,
    netAmount,
    ssclAmount,
    vatAmount,
    grandTotal: roundToCents(netAmount + ssclAmount + vatAmount),
  };
}
