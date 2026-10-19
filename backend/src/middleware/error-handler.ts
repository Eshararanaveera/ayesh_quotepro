import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';

/** 404 for unknown /api routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

/**
 * Turns every thrown error into a consistent JSON response:
 *   { "error": "Message for the user", "details": { field: message } }
 * Express 5 forwards errors from async handlers here automatically.
 */
// Express recognises error handlers by their 4 arguments, so `_next` must stay.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }

  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) details[issue.path.join('.') || '_'] ??= issue.message;
    res.status(400).json({ error: 'Please check the highlighted fields', details });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A record with these details already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ error: 'This record is used by other records and cannot be changed or deleted' });
      return;
    }
  }

  // Body-parser errors: bad JSON or body too large.
  const typed = err as { type?: string; status?: number };
  if (typed?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body is not valid JSON' });
    return;
  }
  if (typed?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request is too large. Try a smaller image.' });
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}
