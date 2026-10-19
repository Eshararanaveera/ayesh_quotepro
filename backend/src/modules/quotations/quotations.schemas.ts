import { z } from 'zod';
import { isISODate } from '../../lib/dates.js';

export const quotationStatus = z.enum(['draft', 'pending', 'approved', 'rejected', 'expired']);

/** http(s) links, or small embedded images (data:image/…), max ~300 KB. */
const imageUrl = z
  .string()
  .trim()
  .max(400_000, 'Image is too large')
  .refine((v) => {
    if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(v)) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Image must be a web link (https://…) or an uploaded picture');

const money = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} can't be negative`).max(999_999_999_999);

export const itemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(1000),
  quantity: z.coerce.number().positive('Quantity must be more than 0').max(1_000_000),
  unitPrice: money('Unit price'),
  imageUrl: z
    .union([imageUrl, z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
});

/**
 * Body for creating or updating a quotation.
 * The server looks up the client, works out "valid until" and calculates all
 * totals itself — any totals sent by the browser are ignored.
 */
const quotationBase = z.object({
  clientId: z.string().min(1, 'Select a client'),
    issueDate: z.string().refine(isISODate, 'Use the format YYYY-MM-DD'),
    validityDays: z.coerce.number().int().min(1, 'At least 1 day').max(365, 'At most 365 days'),
    items: z.array(itemSchema).min(1, 'Add at least one item').max(200, 'Too many items'),
    discountType: z.enum(['percentage', 'fixed']).default('percentage'),
    discountValue: money('Discount').default(0),
    tax: z.object({
      vatEnabled: z.boolean(),
      vatRate: z.coerce.number().min(0).max(100),
      ssclEnabled: z.boolean(),
      ssclRate: z.coerce.number().min(0).max(100),
    }),
    notes: z.string().max(5000).default(''),
});

/** A percentage discount can't be more than 100%. */
const discountWithinLimit = (q: { discountType: 'percentage' | 'fixed'; discountValue: number }) =>
  q.discountType !== 'percentage' || q.discountValue <= 100;
const discountMessage = { message: 'Maximum is 100%', path: ['discountValue'] };

/** New quotations start as a draft or are submitted (pending). */
export const quotationInputSchema = quotationBase
  .extend({ status: z.enum(['draft', 'pending']).default('draft') })
  .refine(discountWithinLimit, discountMessage);

/** Updates may keep any status (leave it out to keep the current one). */
export const quotationUpdateSchema = quotationBase
  .extend({ status: quotationStatus.optional() })
  .refine(discountWithinLimit, discountMessage);

export const statusSchema = z.object({ status: quotationStatus });

export const listQuerySchema = z.object({
  status: quotationStatus.optional(),
  search: z.string().trim().optional(),
  clientId: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  /** Days until payment is due. */
  dueInDays: z.coerce.number().int().min(0).max(365).default(14),
  /** Leave out to invoice the full remaining balance. */
  amount: z.coerce.number().positive('Amount must be more than 0').optional(),
});

export type QuotationInput = z.infer<typeof quotationInputSchema>;
export type QuotationUpdateInput = z.infer<typeof quotationUpdateSchema>;
/** The fields shared by create and update. */
export type QuotationFields = Omit<QuotationInput, 'status'>;
