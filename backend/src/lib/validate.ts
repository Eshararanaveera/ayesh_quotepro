import type { ZodTypeAny, z } from 'zod';
import { badRequest } from './http-error.js';

/**
 * Validates input with a Zod schema and returns the cleaned value.
 * On failure throws a 400 with one message per field, e.g.
 * { "error": "Please check the highlighted fields", "details": { "email": "Invalid email" } }
 */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const details: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    details[key] ??= issue.message;
  }
  throw badRequest('Please check the highlighted fields', details);
}
