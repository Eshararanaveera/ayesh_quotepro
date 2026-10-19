import { Router } from 'express';
import { env } from '../../config/env.js';
import { parse } from '../../lib/validate.js';
import { todayISO } from '../../lib/dates.js';
import { serializeInvoice, serializeQuotation } from '../../lib/serialize.js';
import {
  createInvoiceSchema,
  listQuerySchema,
  quotationInputSchema,
  quotationUpdateSchema,
  statusSchema,
} from './quotations.schemas.js';
import * as service from './quotations.service.js';

export const quotationsRouter = Router();

/** GET /api/quotations?status=pending&search=lotus&clientId=… */
quotationsRouter.get('/', async (req, res) => {
  const filter = parse(listQuerySchema, req.query);
  const quotations = await service.listQuotations(filter);
  res.json(quotations.map(serializeQuotation));
});

/** GET /api/quotations/:id */
quotationsRouter.get('/:id', async (req, res) => {
  res.json(serializeQuotation(await service.getQuotation(req.params.id)));
});

/** POST /api/quotations — number and totals are assigned by the server */
quotationsRouter.post('/', async (req, res) => {
  const input = parse(quotationInputSchema, req.body);
  const quotation = await service.createQuotation(input, req.user!.id);
  res.status(201).json(serializeQuotation(quotation));
});

/** PUT /api/quotations/:id */
quotationsRouter.put('/:id', async (req, res) => {
  const input = parse(quotationUpdateSchema, req.body);
  const quotation = await service.updateQuotation(req.params.id, input);
  res.json(serializeQuotation(quotation));
});

/** PATCH /api/quotations/:id/status  { "status": "approved" } */
quotationsRouter.patch('/:id/status', async (req, res) => {
  const { status } = parse(statusSchema, req.body);
  res.json(serializeQuotation(await service.setQuotationStatus(req.params.id, status)));
});

/** DELETE /api/quotations/:id */
quotationsRouter.delete('/:id', async (req, res) => {
  await service.deleteQuotation(req.params.id);
  res.status(204).end();
});

/** POST /api/quotations/:id/invoices  { "dueInDays": 14, "amount"?: 50000 } */
quotationsRouter.post('/:id/invoices', async (req, res) => {
  const opts = parse(createInvoiceSchema, req.body ?? {});
  const invoice = await service.createInvoiceFromQuotation(req.params.id, opts);
  res.status(201).json(serializeInvoice(invoice, todayISO(env.APP_TIMEZONE)));
});
