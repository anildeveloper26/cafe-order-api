import { Router } from 'express';
import * as orders from '../controllers/order.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { optionalAdmin, requireAdmin } from '../middleware/auth';
import { orderLimiter } from '../middleware/rateLimit';
import { createOrderSchema, listOrdersSchema, orderIdSchema, updateStatusSchema } from '../validators/order.schema';

const router = Router();

router.post('/', orderLimiter, validate(createOrderSchema), asyncHandler(orders.createOrder));
router.get('/', optionalAdmin, validate(listOrdersSchema), asyncHandler(orders.listOrders));
router.get('/stats', requireAdmin, asyncHandler(orders.getOrderStats));
router.get('/:id', validate(orderIdSchema), asyncHandler(orders.getOrder));
router.patch('/:id/status', requireAdmin, validate(updateStatusSchema), asyncHandler(orders.updateOrderStatus));

export default router;
