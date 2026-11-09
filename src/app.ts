import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import routes from './routes';
import { swaggerSpec } from './docs/swagger';
import { errorHandler, notFound } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Render sits behind a proxy; needed for rate limiting by IP.
  app.use(helmet({ contentSecurityPolicy: false })); // CSP off so Swagger UI assets load.
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  if (env.nodeEnv !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/', (_req, res) => res.json({ success: true, message: 'Cafe API is running', docs: '/api/docs' }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Cafe API Docs' }));
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
