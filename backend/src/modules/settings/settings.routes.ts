import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { parse } from '../../lib/validate.js';
import { serializeSettings } from '../../lib/serialize.js';
import { requireAdmin } from '../../middleware/auth.js';

export const settingsRouter = Router();

/** Logo as a data URL (PNG/JPG/SVG/WebP), up to ~500 KB file size. */
const logoSchema = z
  .string()
  .max(700_000, 'Logo must be smaller than 500 KB')
  .regex(/^data:image\/(png|jpe?g|svg\+xml|webp);base64,/, 'Logo must be a PNG, JPG, SVG or WebP image')
  .nullable();

const updateSchema = z.object({
  company: z
    .object({
      name: z.string().trim().min(1, 'Company name is required').max(200),
      logo: logoSchema,
      address: z.string().max(500),
      phone: z.string().max(40),
      email: z.union([z.string().trim().email('Enter a valid email address'), z.literal('')]),
      website: z.string().max(200),
      tin: z.string().max(50),
      vatRegNo: z.string().max(50),
    })
    .partial()
    .optional(),
  tax: z
    .object({
      vatEnabled: z.boolean(),
      vatRate: z.coerce.number().min(0).max(100),
      ssclEnabled: z.boolean(),
      ssclRate: z.coerce.number().min(0).max(100),
    })
    .partial()
    .optional(),
  quotation: z
    .object({
      prefix: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{1,6}$/, '1–6 letters or numbers'),
      validityDays: z.coerce.number().int().min(1).max(365),
      notes: z.string().max(5000),
    })
    .partial()
    .optional(),
});

/** Default terms for a new install (MySQL TEXT columns can't have a default value). */
export const DEFAULT_QUOTE_NOTES =
  '1. All prices are in Sri Lankan Rupees (LKR).\n' +
  '2. 50% advance payment is required to confirm the order.\n' +
  '3. This quotation is valid until the date stated above.';

/** Returns the single settings row, creating it with defaults on first use. */
async function getOrCreateSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, quoteNotes: DEFAULT_QUOTE_NOTES }, update: {} });
}

/** GET /api/settings */
settingsRouter.get('/', async (_req, res) => {
  res.json(serializeSettings(await getOrCreateSettings()));
});

/** PUT /api/settings — send only the sections you're changing. Admins only. */
settingsRouter.put('/', requireAdmin, async (req, res) => {
  const { company, tax, quotation } = parse(updateSchema, req.body);
  const data = {
    ...(company && {
      companyName: company.name,
      companyLogo: company.logo,
      companyAddress: company.address,
      companyPhone: company.phone,
      companyEmail: company.email,
      companyWebsite: company.website,
      companyTin: company.tin,
      companyVatRegNo: company.vatRegNo,
    }),
    ...(tax && {
      vatEnabled: tax.vatEnabled,
      vatRate: tax.vatRate,
      ssclEnabled: tax.ssclEnabled,
      ssclRate: tax.ssclRate,
    }),
    ...(quotation && {
      quotePrefix: quotation.prefix,
      quoteValidityDays: quotation.validityDays,
      quoteNotes: quotation.notes,
    }),
  };
  // Prisma ignores keys that are `undefined`, so missing fields stay unchanged.
  const settings = await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, quoteNotes: DEFAULT_QUOTE_NOTES, ...data }, update: data });
  res.json(serializeSettings(settings));
});
