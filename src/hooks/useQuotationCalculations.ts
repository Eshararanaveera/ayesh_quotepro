import { useMemo } from 'react';
import type { DiscountType, QuotationTotals, TaxConfig } from '../types/quotation';
import { calculateQuotationTotals, lineTotal, type PricedLine } from '../utils/calculations';
import { DEFAULT_SETTINGS } from '../config/constants';
import type { Numeric } from '../utils/formatters';

export interface QuotationCalculations extends QuotationTotals {
  /** Total for each line, in the same order as the items. */
  lineTotals: number[];
}

/**
 * Live quotation totals for Sri Lanka:
 * Subtotal → Discount → SSCL (2.5% of net) → VAT (18% of net + SSCL) → Grand Total.
 *
 * @param items     Line items. Quantity and price may be numbers or form strings.
 * @param discount  Discount value — a percentage by default, or LKR when `discountType` is 'fixed'.
 * @param tax       Which taxes apply. Defaults to VAT 18% and SSCL 2.5%.
 *
 * @example
 * const { subtotal, ssclAmount, vatAmount, grandTotal } =
 *   useQuotationCalculations(items, 5); // 5% discount
 */
export function useQuotationCalculations(
  items: readonly PricedLine[],
  discount: Numeric = 0,
  tax: TaxConfig = DEFAULT_SETTINGS.tax,
  discountType: DiscountType = 'percentage',
): QuotationCalculations {
  const { vatEnabled, vatRate, ssclEnabled, ssclRate } = tax;

  return useMemo(() => {
    const totals = calculateQuotationTotals(
      items,
      { type: discountType, value: discount },
      { vatEnabled, vatRate, ssclEnabled, ssclRate },
    );
    return { ...totals, lineTotals: items.map(lineTotal) };
  }, [items, discount, discountType, vatEnabled, vatRate, ssclEnabled, ssclRate]);
}
