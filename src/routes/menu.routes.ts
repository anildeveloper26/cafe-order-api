import { Router } from 'express';
import * as menu from '../controllers/menu.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';
import { createMenuSchema, listMenuSchema, menuIdSchema, updateMenuSchema } from '../validators/menu.schema';

const router = Router();

router.get('/', validate(listMenuSchema), asyncHandler(menu.listMenu));
router.get('/categories', asyncHandler(menu.getCategories));
router.get('/:id', validate(menuIdSchema), asyncHandler(menu.getMenuItem));
router.post('/', requireAdmin, validate(createMenuSchema), asyncHandler(menu.createMenuItem));
router.put('/:id', requireAdmin, validate(updateMenuSchema), asyncHandler(menu.updateMenuItem));
router.delete('/:id', requireAdmin, validate(menuIdSchema), asyncHandler(menu.deleteMenuItem));

export default router;
