import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { parse } from '../../lib/validate.js';
import { notFound } from '../../lib/http-error.js';
import { serializeClient } from '../../lib/serialize.js';

export const clientsRouter = Router();

const clientSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(200),
  contactName: z.string().trim().min(1, 'Contact person is required').max(200),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === '' || /^\+?[\d\s()-]{9,}$/.test(v), 'Enter a valid phone number, e.g. +94 77 123 4567')
    .default(''),
  address: z.string().trim().max(500).default(''),
  city: z.string().trim().max(100).default(''),
  taxId: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v ? v : null)),
});

const listQuery = z.object({ search: z.string().trim().optional() });

/** GET /api/clients?search=lotus */
clientsRouter.get('/', async (req, res) => {
  const { search } = parse(listQuery, req.query);
  const clients = await prisma.client.findMany({
    where: search
      ? {
          OR: ['companyName', 'contactName', 'email', 'phone', 'city'].map((field) => ({
            [field]: { contains: search },
          })),
        }
      : undefined,
    orderBy: { companyName: 'asc' },
  });
  res.json(clients.map(serializeClient));
});

/** GET /api/clients/:id */
clientsRouter.get('/:id', async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client) throw notFound('Client');
  res.json(serializeClient(client));
});

/** POST /api/clients */
clientsRouter.post('/', async (req, res) => {
  const data = parse(clientSchema, req.body);
  const client = await prisma.client.create({ data });
  res.status(201).json(serializeClient(client));
});

/** PUT /api/clients/:id */
clientsRouter.put('/:id', async (req, res) => {
  const data = parse(clientSchema, req.body);
  const exists = await prisma.client.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) throw notFound('Client');
  const client = await prisma.client.update({ where: { id: req.params.id }, data });
  res.json(serializeClient(client));
});

/**
 * DELETE /api/clients/:id
 * Quotations and invoices keep their copy of the client's details
 * (their clientId becomes null), so issued documents are never lost.
 */
clientsRouter.delete('/:id', async (req, res) => {
  const exists = await prisma.client.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) throw notFound('Client');
  await prisma.client.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
