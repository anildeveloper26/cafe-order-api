import dotenv from 'dotenv';

dotenv.config({ quiet: true } as dotenv.DotenvConfigOptions);

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/cafe'),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@cafe.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
  orderRateLimit: Number(process.env.ORDER_RATE_LIMIT ?? 20),
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT ?? 10),
  isProd: process.env.NODE_ENV === 'production',
};
