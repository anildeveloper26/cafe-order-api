import type { CorsOptions } from 'cors';
import { env } from './env';

export const isAllowedOrigin = (origin?: string) =>
  !origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin);

export const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};
