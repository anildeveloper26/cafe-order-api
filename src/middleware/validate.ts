import type { RequestHandler } from 'express';
import { ZodError, type AnyZodObject } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validates req.body / req.query / req.params against a zod schema shaped
 * like { body?, query?, params? } and replaces them with the parsed values
 * (coerced numbers, defaults applied, unknown keys stripped).
 */
export const validate =
  (schema: AnyZodObject): RequestHandler =>
  (req, _res, next) => {
    try {
      const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
      if ('body' in parsed) req.body = parsed.body;
      if ('query' in parsed) req.query = parsed.query;
      if ('params' in parsed) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((issue) => ({
          field: issue.path.slice(1).join('.'),
          message: issue.message,
        }));
        return next(ApiError.badRequest('Validation failed', errors));
      }
      next(err);
    }
  };
