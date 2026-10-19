import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { parse } from '../../lib/validate.js';
import { conflict, notFound } from '../../lib/http-error.js';
import { toDbDate, todayISO } from '../../lib/dates.js';
import { serializeInvoice } from '../../lib/serialize.js';

export const invoicesRouter = Router();

const listQuery = z.object({
  status: z.enum(['paid', 'unpaid', 'overdue']).optional(),
  search: z.string().trim().optional(),
});

/** GET /api/invoices?status=overdue&search=lotus */
invoicesRouter.get('/', async (req, res) => {
  const { status, search } = parse(listQuery, req.query);
  const today = todayISO(env.APP_TIMEZONE);
  const todayDate = toDbDate(today);

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status === 'paid' ? { status: 'paid' } : {}),
      ...(status === 'unpaid' ? { status: 'unpaid', dueDate: { gte: todayDate } } : {}),
      ...(status === 'overdue' ? { status: 'unpaid', dueDate: { lt: todayDate } } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search } },
              { clientName: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ issueDate: 'desc' }, { invoiceNumber: 'desc' }],
  });
  res.json(invoices.map((inv) => serializeInvoice(inv, today)));
});

/** GET /api/invoices/:id */
invoicesRouter.get('/:id', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw notFound('Invoice');
  res.json(serializeInvoice(invoice, todayISO(env.APP_TIMEZONE)));
});

/** PATCH /api/invoices/:id/status  { "status": "paid" | "unpaid" } */
invoicesRouter.patch('/:id/status', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['paid', 'unpaid']) }), req.body);
  const exists = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) throw notFound('Invoice');
  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { status, paidAt: status === 'paid' ? new Date() : null },
  });
  res.json(serializeInvoice(invoice, todayISO(env.APP_TIMEZONE)));
});

/** DELETE /api/invoices/:id — only unpaid invoices can be deleted */
invoicesRouter.delete('/:id', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw notFound('Invoice');
  if (invoice.status === 'paid') throw conflict('Paid invoices cannot be deleted. Mark it unpaid first.');
  await prisma.invoice.delete({ where: { id: invoice.id } });
  res.status(204).end();
});
