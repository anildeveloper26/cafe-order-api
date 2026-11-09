import type { CorsOptions } from 'cors';
import { env } from './env';
import { ApiError } from '../utils/ApiError';

export const isAllowedOrigin = (origin?: string) =>
  !origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin);

export const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    // 403 instead of falling through to the generic 500 handler.
    cb(ApiError.forbidden(`Origin ${origin} is not allowed`));
  },
  credentials: true,
};
