import { Router } from 'express';
import mongoose from 'mongoose';
import menuRoutes from './menu.routes';
import orderRoutes from './order.routes';
import authRoutes from './auth.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/auth', authRoutes);

export default router;
