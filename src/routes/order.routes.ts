import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import * as orders from '../controllers/order.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { optionalAdmin, requireAdmin } from '../middleware/auth';
import { createOrderSchema, listOrdersSchema, updateStatusSchema } from '../validators/order.schema';
import { idParams } from '../validators/common';

const router = Router();

// Ordering is public (no login), so throttle it per IP.
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many orders from this device, please try again later' },
});

router.post('/', orderLimiter, validate(createOrderSchema), asyncHandler(orders.createOrder));
router.get('/', optionalAdmin, validate(listOrdersSchema), asyncHandler(orders.listOrders));
router.get('/stats', requireAdmin, asyncHandler(orders.getOrderStats));
router.get('/:id', validate(z.object({ params: idParams })), asyncHandler(orders.getOrder));
router.patch(
  '/:id/status',
  requireAdmin,
  validate(updateStatusSchema.extend({ params: idParams })),
  asyncHandler(orders.updateOrderStatus),
);

export default router;
