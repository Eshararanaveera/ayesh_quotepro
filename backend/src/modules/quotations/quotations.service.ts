import type { Prisma, QuotationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest, conflict, notFound } from '../../lib/http-error.js';
import { calculateTotals, lineTotal, roundToCents } from '../../lib/calculations.js';
import { addDays, toDbDate, todayISO } from '../../lib/dates.js';
import { nextDocumentNumber } from '../../lib/numbering.js';
import type { QuotationFields, QuotationInput, QuotationUpdateInput } from './quotations.schemas.js';

const withItems = { items: { orderBy: { position: 'asc' as const } } };

/** Pending quotations past their "valid until" date become expired. */
export async function expireOverdueQuotations(): Promise<void> {
  await prisma.quotation.updateMany({
    where: { status: 'pending', validUntil: { lt: toDbDate(todayISO(env.APP_TIMEZONE)) } },
    data: { status: 'expired' },
  });
}

/** Everything that is calculated from the input: client snapshot, dates, items and totals. */
async function buildQuotationData(input: QuotationFields, tx: Prisma.TransactionClient) {
  const client = await tx.client.findUnique({ where: { id: input.clientId } });
  if (!client) throw badRequest('Selected client was not found', { clientId: 'Selected client was not found' });

  const totals = calculateTotals(input.items, { type: input.discountType, value: input.discountValue }, input.tax);

  return {
    fields: {
      clientId: client.id,
      clientCompanyName: client.companyName,
      clientContactName: client.contactName,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: client.address,
      clientCity: client.city,
      clientTaxId: client.taxId,
      issueDate: toDbDate(input.issueDate),
      validUntil: toDbDate(addDays(input.issueDate, input.validityDays)),
      validityDays: input.validityDays,
      discountType: input.discountType,
      discountValue: input.discountValue,
      vatEnabled: input.tax.vatEnabled,
      vatRate: input.tax.vatRate,
      ssclEnabled: input.tax.ssclEnabled,
      ssclRate: input.tax.ssclRate,
      notes: input.notes,
      ...totals,
    },
    items: input.items.map((item, position) => ({
      position,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: lineTotal(item.quantity, item.unitPrice),
      imageUrl: item.imageUrl,
    })),
  };
}

export async function listQuotations(filter: { status?: QuotationStatus; search?: string; clientId?: string }) {
  await expireOverdueQuotations();
  return prisma.quotation.findMany({
    where: {
      status: filter.status,
      clientId: filter.clientId,
      ...(filter.search
        ? {
            OR: [
              { quoteNumber: { contains: filter.search } },
              { clientCompanyName: { contains: filter.search } },
              { clientContactName: { contains: filter.search } },
            ],
          }
        : {}),
    },
    include: withItems,
    orderBy: [{ issueDate: 'desc' }, { quoteNumber: 'desc' }],
  });
}

export async function getQuotation(id: string) {
  await expireOverdueQuotations();
  const quotation = await prisma.quotation.findUnique({ where: { id }, include: withItems });
  if (!quotation) throw notFound('Quotation');
  return quotation;
}

export async function createQuotation(input: QuotationInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const { fields, items } = await buildQuotationData(input, tx);
    const settings = await tx.settings.findUnique({ where: { id: 1 } });
    const prefix = settings?.quotePrefix || 'QT';
    const quoteNumber = await nextDocumentNumber(tx, prefix, Number(input.issueDate.slice(0, 4)));

    return tx.quotation.create({
      data: {
        ...fields,
        quoteNumber,
        status: input.status,
        createdById: userId,
        items: { create: items },
      },
      include: withItems,
    });
  });
}

export async function updateQuotation(id: string, input: QuotationUpdateInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.quotation.findUnique({ where: { id }, include: { _count: { select: { invoices: true } } } });
    if (!existing) throw notFound('Quotation');
    if (existing._count.invoices > 0) {
      throw conflict('This quotation already has invoices, so it can no longer be edited.');
    }

    const { fields, items } = await buildQuotationData(input, tx);
    // Replace all items: simpler and safe inside the transaction.
    await tx.quotationItem.deleteMany({ where: { quotationId: id } });
    return tx.quotation.update({
      where: { id },
      data: {
        ...fields,
        status: input.status ?? existing.status,
        items: { create: items },
      },
      include: withItems,
    });
  });
}

export async function setQuotationStatus(id: string, status: QuotationStatus) {
  const exists = await prisma.quotation.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Quotation');
  return prisma.quotation.update({ where: { id }, data: { status }, include: withItems });
}

export async function deleteQuotation(id: string) {
  const existing = await prisma.quotation.findUnique({ where: { id }, include: { _count: { select: { invoices: true } } } });
  if (!existing) throw notFound('Quotation');
  if (existing._count.invoices > 0) {
    throw conflict('This quotation has invoices. Delete its invoices first.');
  }
  await prisma.quotation.delete({ where: { id } }); // items are removed by ON DELETE CASCADE
}

/** Raises an invoice for an approved quotation (full remaining balance by default). */
export async function createInvoiceFromQuotation(id: string, opts: { dueInDays: number; amount?: number }) {
  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({ where: { id }, include: { invoices: true } });
    if (!quotation) throw notFound('Quotation');
    if (quotation.status !== 'approved') throw conflict('Only approved quotations can be invoiced.');

    const invoiced = quotation.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const remaining = roundToCents(Number(quotation.grandTotal) - invoiced);
    if (remaining <= 0) throw conflict('This quotation has already been fully invoiced.');

    const amount = roundToCents(opts.amount ?? remaining);
    if (amount > remaining) {
      throw badRequest(`Amount is more than the remaining balance (LKR ${remaining.toFixed(2)}).`, {
        amount: 'More than the remaining balance',
      });
    }

    const today = todayISO(env.APP_TIMEZONE);
    const invoiceNumber = await nextDocumentNumber(tx, 'INV', Number(today.slice(0, 4)));

    return tx.invoice.create({
      data: {
        invoiceNumber,
        quotationId: quotation.id,
        clientId: quotation.clientId,
        clientName: quotation.clientCompanyName,
        amount,
        issueDate: toDbDate(today),
        dueDate: toDbDate(addDays(today, opts.dueInDays)),
      },
    });
  });
}
