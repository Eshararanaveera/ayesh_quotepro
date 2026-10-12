/**
 * Formatting helpers for QuotePro (Sri Lanka).
 *
 * Sri Lanka uses Western digit grouping (1,500,000.00), unlike India's lakh
 * grouping, so the numeric formatting below uses en-US grouping.
 */

export type Numeric = number | string | null | undefined;

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

/** Coerces form values ('1,500.50', '', null, NaN) to a finite number, defaulting to 0. */
export function toNumber(value: Numeric): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'string' ? Number(value.replace(/[,\s]/g, '')) : value;
  return Number.isFinite(n) ? n : 0;
}

/** Rounds to 2 decimal places, avoiding float errors such as 1.005 → 1.00. */
export function roundToCents(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

const twoDecimalFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface CurrencyFormatOptions {
  /** Prefix shown before the amount. Default: 'LKR'. */
  symbol?: 'LKR' | 'Rs.' | '';
  /** Show negatives as (LKR 1,500.00) instead of -LKR 1,500.00. Default: false. */
  accounting?: boolean;
}

/**
 * Formats an amount as Sri Lankan Rupees.
 *
 * @example
 * formatCurrency(1500)                    // 'LKR 1,500.00'
 * formatCurrency(1250.5)                  // 'LKR 1,250.50'
 * formatCurrency(-320, { accounting: true }) // '(LKR 320.00)'
 * formatCurrency(1500, { symbol: 'Rs.' }) // 'Rs. 1,500.00'
 * formatCurrency(1500, { symbol: '' })    // '1,500.00'
 */
export function formatCurrency(value: Numeric, options: CurrencyFormatOptions = {}): string {
  const { symbol = 'LKR', accounting = false } = options;
  const amount = roundToCents(toNumber(value));
  const digits = twoDecimalFormat.format(Math.abs(amount));
  const text = symbol ? `${symbol} ${digits}` : digits;

  if (amount < 0) return accounting ? `(${text})` : `-${text}`;
  return text;
}

/** Alias kept for readability at call sites. */
export const formatLKR = formatCurrency;

/** Formats a plain number with grouping, e.g. quantities: 1250 → '1,250'. */
export function formatNumber(value: Numeric, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(toNumber(value));
}

// ---------------------------------------------------------------------------
// Number to words
// ---------------------------------------------------------------------------

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const INTERNATIONAL_SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion'];

/**
 * 'international' → One Million Two Hundred Thousand  (default; standard on SL business documents)
 * 'south-asian'   → Twelve Lakh                       (lakh / crore)
 */
export type NumberSystem = 'international' | 'south-asian';

export interface NumberToWordsOptions {
  system?: NumberSystem;
}

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(belowHundred(rest));
  return parts.join(' ');
}

function internationalWords(n: number): string {
  const parts: string[] = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) {
      const label = INTERNATIONAL_SCALES[scale];
      parts.unshift(label ? `${belowThousand(chunk)} ${label}` : belowThousand(chunk));
    }
    n = Math.floor(n / 1000);
    scale++;
  }
  return parts.join(' ');
}

function southAsianWords(n: number): string {
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${southAsianWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ');
}

/**
 * Converts the whole-number part of a value to English words.
 *
 * @example
 * numberToWords(1500)                               // 'One Thousand Five Hundred'
 * numberToWords(1_250_000)                          // 'One Million Two Hundred Fifty Thousand'
 * numberToWords(1_250_000, { system: 'south-asian' }) // 'Twelve Lakh Fifty Thousand'
 * numberToWords(0)                                  // 'Zero'
 */
export function numberToWords(value: Numeric, options: NumberToWordsOptions = {}): string {
  const { system = 'international' } = options;
  const n = toNumber(value);
  const whole = Math.floor(Math.abs(n));

  if (whole > MAX_SAFE) {
    throw new RangeError(`numberToWords: ${n} is too large to convert accurately`);
  }
  if (whole === 0) return 'Zero';

  const words = system === 'south-asian' ? southAsianWords(whole) : internationalWords(whole);
  return n < 0 ? `Minus ${words}` : words;
}

export interface AmountToWordsOptions extends NumberToWordsOptions {
  /** Default: 'Rupees'. */
  currency?: string;
  /** Default: 'Cents'. */
  subunit?: string;
  /** Appended at the end. Default: 'Only'. Pass '' to omit. */
  suffix?: string;
}

/**
 * Amount in words for quotations, invoices and receipts.
 *
 * @example
 * amountToWords(1500)     // 'Rupees One Thousand Five Hundred Only'
 * amountToWords(1500.5)   // 'Rupees One Thousand Five Hundred and Cents Fifty Only'
 * amountToWords(0.75)     // 'Cents Seventy Five Only'
 */
export function amountToWords(value: Numeric, options: AmountToWordsOptions = {}): string {
  const { currency = 'Rupees', subunit = 'Cents', suffix = 'Only', system } = options;
  const n = toNumber(value);

  const totalCents = Math.round((Math.abs(n) + Number.EPSILON) * 100);
  const rupees = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  const parts: string[] = [];
  if (rupees) parts.push(`${currency} ${numberToWords(rupees, { system })}`);
  if (cents) parts.push(`${subunit} ${numberToWords(cents)}`);

  let words = parts.length ? parts.join(' and ') : `${currency} Zero`;
  if (n < 0 && totalCents > 0) words = `Minus ${words}`;
  return suffix ? `${words} ${suffix}` : words;
}
