import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: 'admin';
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(ApiError.unauthorized('Missing bearer token'));
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as AdminTokenPayload;
    if (payload.role !== 'admin') return next(ApiError.unauthorized('Not an admin'));
    (req as typeof req & { admin?: AdminTokenPayload }).admin = payload;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
};

/** Attaches req.admin when a valid admin token is present; never rejects. */
export const optionalAdmin: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.jwtSecret) as AdminTokenPayload;
      if (payload.role === 'admin') (req as typeof req & { admin?: AdminTokenPayload }).admin = payload;
    } catch {
      /* ignore invalid token on optional routes */
    }
  }
  next();
};
