import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: 'admin';
}

export type AuthedRequest = Request & { admin?: AdminTokenPayload };

function readAdminToken(req: Request): AdminTokenPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const payload = jwt.verify(header.slice(7), env.jwtSecret) as AdminTokenPayload;
  return payload.role === 'admin' ? payload : null;
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.headers.authorization?.startsWith('Bearer ')) return next(ApiError.unauthorized('Missing bearer token'));
  try {
    const admin = readAdminToken(req);
    if (!admin) return next(ApiError.unauthorized('Not an admin'));
    (req as AuthedRequest).admin = admin;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
};

/** Attaches req.admin when a valid admin token is present; never rejects. */
export const optionalAdmin: RequestHandler = (req, _res, next) => {
  try {
    const admin = readAdminToken(req);
    if (admin) (req as AuthedRequest).admin = admin;
  } catch {
    /* invalid token on an optional route is treated as anonymous */
  }
  next();
};
