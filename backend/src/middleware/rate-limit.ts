import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';

/**
 * Small in-memory rate limiter (no extra package needed).
 * Good enough for a single server; use a shared store such as Redis if you run several.
 */
export function rateLimit({ windowMs, max, message }: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Clear old entries now and then so the map doesn't grow forever.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      throw new HttpError(429, message);
    }
    next();
  };

  /** Clears the counter for this visitor (e.g. after a successful sign-in). */
  middleware.reset = (req: Request) => hits.delete(req.ip ?? 'unknown');
  return middleware;
}
