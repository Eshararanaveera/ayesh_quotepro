import express, { Router } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientsRouter } from './modules/clients/clients.routes.js';
import { quotationsRouter } from './modules/quotations/quotations.routes.js';
import { invoicesRouter } from './modules/invoices/invoices.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';

export function createApp() {
  const app = express();

  // Needed behind Render / Railway / Nginx so req.ip is the real visitor (for rate limiting).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Basic security headers (an API returns JSON only, so these are safe defaults).
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use(
    cors({
      origin(origin, callback) {
        // Allow tools like curl/Postman (no Origin header) and the configured frontends.
        if (!origin || env.corsOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
        callback(null, false);
      },
    }),
  );

  // 5 MB allows a company logo and a few small item photos in one request.
  app.use(express.json({ limit: '5mb' }));

  // Health check for hosting platforms and uptime monitors.
  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  const api = Router();
  api.use('/auth', authRouter);

  // Everything below needs a signed-in user.
  api.use(requireAuth);
  api.use('/clients', clientsRouter);
  api.use('/quotations', quotationsRouter);
  api.use('/invoices', invoicesRouter);
  api.use('/settings', settingsRouter);
  api.use('/dashboard', dashboardRouter);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
