import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const json = (message: string) => ({ success: false, message });

/** Ordering is public (no login), so throttle it per IP. */
export const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.orderRateLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many orders from this device, please try again later'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.loginRateLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many login attempts, please try again later'),
});
