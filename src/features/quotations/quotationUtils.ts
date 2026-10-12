import type { Quotation, QuotationInput } from '../../types/quotation';
import { calculateQuotationTotals } from '../../utils/calculations';

/** Builds a full Quotation from form input, recalculating totals so they can't drift from the items. */
export function buildQuotation(
  input: QuotationInput,
  meta: { id: string; quoteNumber: string; createdAt: string; updatedAt: string },
): Quotation {
  return {
    ...input,
    ...meta,
    totals: calculateQuotationTotals(
      input.items,
      { type: input.discountType, value: input.discountValue },
      input.tax,
    ),
  };
}

/** Next number in the series, e.g. QT-2026-0007. Numbers restart each year. */
export function nextQuoteNumber(existing: readonly Pick<Quotation, 'quoteNumber'>[], prefix: string, year: number): string {
  const head = `${prefix}-${year}-`;
  const highest = existing.reduce((max, q) => {
    if (!q.quoteNumber.startsWith(head)) return max;
    const n = Number(q.quoteNumber.slice(head.length));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `${head}${String(highest + 1).padStart(4, '0')}`;
}
