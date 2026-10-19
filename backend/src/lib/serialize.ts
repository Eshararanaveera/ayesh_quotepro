import type { Client, Invoice, Prisma, Quotation, QuotationItem, Settings } from '@prisma/client';
import { toISODate } from './dates.js';

/**
 * Turns database rows into the JSON shapes the frontend uses
 * (see frontend/src/types). Money comes out of Prisma as Decimal objects,
 * so it's converted to plain numbers here.
 */

const num = (value: Prisma.Decimal | number): number => Number(value);

export function serializeClient(c: Client) {
  return {
    id: c.id,
    companyName: c.companyName,
    contactName: c.contactName,
    email: c.email,
    phone: c.phone,
    address: c.address,
    city: c.city,
    taxId: c.taxId ?? undefined,
    createdAt: toISODate(c.createdAt),
  };
}

export type QuotationWithItems = Quotation & { items: QuotationItem[] };

export function serializeQuotation(q: QuotationWithItems) {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    status: q.status,
    clientId: q.clientId,
    client: {
      companyName: q.clientCompanyName,
      contactName: q.clientContactName,
      email: q.clientEmail,
      phone: q.clientPhone,
      address: q.clientAddress,
      city: q.clientCity,
      taxId: q.clientTaxId ?? undefined,
    },
    issueDate: toISODate(q.issueDate),
    validUntil: toISODate(q.validUntil),
    validityDays: q.validityDays,
    items: [...q.items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        description: i.description,
        quantity: num(i.quantity),
        unitPrice: num(i.unitPrice),
        ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}),
      })),
    discountType: q.discountType,
    discountValue: num(q.discountValue),
    tax: {
      vatEnabled: q.vatEnabled,
      vatRate: num(q.vatRate),
      ssclEnabled: q.ssclEnabled,
      ssclRate: num(q.ssclRate),
    },
    totals: {
      subtotal: num(q.subtotal),
      discountAmount: num(q.discountAmount),
      netAmount: num(q.netAmount),
      ssclAmount: num(q.ssclAmount),
      vatAmount: num(q.vatAmount),
      grandTotal: num(q.grandTotal),
    },
    notes: q.notes,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

/** Unpaid invoices past their due date are reported as "overdue". */
export function serializeInvoice(inv: Invoice, today: string) {
  const dueDate = toISODate(inv.dueDate);
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    quotationId: inv.quotationId,
    clientId: inv.clientId,
    clientName: inv.clientName,
    amount: num(inv.amount),
    status: inv.status === 'unpaid' && dueDate < today ? ('overdue' as const) : inv.status,
    issueDate: toISODate(inv.issueDate),
    dueDate,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
  };
}

export function serializeSettings(s: Settings) {
  return {
    company: {
      name: s.companyName,
      logo: s.companyLogo,
      address: s.companyAddress,
      phone: s.companyPhone,
      email: s.companyEmail,
      website: s.companyWebsite,
      tin: s.companyTin,
      vatRegNo: s.companyVatRegNo,
    },
    tax: {
      vatEnabled: s.vatEnabled,
      vatRate: num(s.vatRate),
      ssclEnabled: s.ssclEnabled,
      ssclRate: num(s.ssclRate),
    },
    quotation: {
      prefix: s.quotePrefix,
      validityDays: s.quoteValidityDays,
      notes: s.quoteNotes,
    },
  };
}
