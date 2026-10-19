import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { toDbDate, todayISO } from '../../lib/dates.js';
import { expireOverdueQuotations } from '../quotations/quotations.service.js';

export const dashboardRouter = Router();

/** GET /api/dashboard/summary — totals for the dashboard cards, worked out in SQL */
dashboardRouter.get('/summary', async (_req, res) => {
  await expireOverdueQuotations();
  const today = toDbDate(todayISO(env.APP_TIMEZONE));

  const [byStatus, clients, invoicesByStatus, overdue] = await Promise.all([
    prisma.quotation.groupBy({ by: ['status'], _count: { _all: true }, _sum: { grandTotal: true } }),
    prisma.client.count(),
    prisma.invoice.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { status: 'unpaid', dueDate: { lt: today } }, _count: { _all: true }, _sum: { amount: true } }),
  ]);

  const statuses = ['draft', 'pending', 'approved', 'rejected', 'expired'] as const;
  const pipeline = statuses.map((status) => {
    const row = byStatus.find((r) => r.status === status);
    return { status, count: row?._count._all ?? 0, value: Number(row?._sum.grandTotal ?? 0) };
  });
  const get = (s: (typeof statuses)[number]) => pipeline.find((p) => p.status === s)!;
  const inv = (s: 'paid' | 'unpaid') => invoicesByStatus.find((r) => r.status === s);

  res.json({
    revenue: get('approved').value,
    approvedCount: get('approved').count,
    activeCount: get('draft').count + get('pending').count,
    activeValue: get('draft').value + get('pending').value,
    pendingCount: get('pending').count,
    pendingValue: get('pending').value,
    totalClients: clients,
    pipeline,
    invoices: {
      paid: Number(inv('paid')?._sum.amount ?? 0),
      unpaid: Number(inv('unpaid')?._sum.amount ?? 0) - Number(overdue._sum.amount ?? 0),
      overdue: Number(overdue._sum.amount ?? 0),
      overdueCount: overdue._count._all,
    },
  });
});
