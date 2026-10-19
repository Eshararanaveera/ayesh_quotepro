/**
 * Quotation money maths — the same rules as the frontend
 * (frontend/src/utils/calculations.ts), but the server's result is the one saved.
 *
 *   1. Subtotal    = Σ (quantity × unit price)
 *   2. Net amount  = Subtotal − Discount
 *   3. SSCL        = Net amount × SSCL rate       (2.5%)
 *   4. VAT         = (Net amount + SSCL) × VAT rate (18%)
 *   5. Grand total = Net amount + SSCL + VAT
 *
 * Every step is rounded to cents so printed lines always add up.
 */

export type DiscountKind = 'percentage' | 'fixed';

export interface TaxInput {
  vatEnabled: boolean;
  vatRate: number;
  ssclEnabled: boolean;
  ssclRate: number;
}

export interface Totals {
  subtotal: number;
  discountAmount: number;
  netAmount: number;
  ssclAmount: number;
  vatAmount: number;
  grandTotal: number;
}

/** Rounds to 2 decimals, avoiding float errors such as 1.005 → 1.00. */
export function roundToCents(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

export function lineTotal(quantity: number, unitPrice: number): number {
  return roundToCents(Math.max(0, quantity) * Math.max(0, unitPrice));
}

export function discountAmount(subtotal: number, type: DiscountKind, value: number): number {
  const v = Math.max(0, value);
  const raw = type === 'percentage' ? (subtotal * Math.min(v, 100)) / 100 : v;
  return roundToCents(Math.min(raw, subtotal));
}

export function calculateTotals(
  items: readonly { quantity: number; unitPrice: number }[],
  discount: { type: DiscountKind; value: number },
  tax: TaxInput,
): Totals {
  const subtotal = roundToCents(items.reduce((sum, i) => sum + lineTotal(i.quantity, i.unitPrice), 0));
  const discountValue = discountAmount(subtotal, discount.type, discount.value);
  const netAmount = roundToCents(subtotal - discountValue);
  const ssclAmount = tax.ssclEnabled ? roundToCents((netAmount * tax.ssclRate) / 100) : 0;
  const vatAmount = tax.vatEnabled ? roundToCents(((netAmount + ssclAmount) * tax.vatRate) / 100) : 0;
  return {
    subtotal,
    discountAmount: discountValue,
    netAmount,
    ssclAmount,
    vatAmount,
    grandTotal: roundToCents(netAmount + ssclAmount + vatAmount),
  };
}
