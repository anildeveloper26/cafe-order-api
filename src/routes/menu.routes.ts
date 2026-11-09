import { Router } from 'express';
import * as menu from '../controllers/menu.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';
import { createMenuSchema, listMenuSchema, updateMenuSchema } from '../validators/menu.schema';
import { idParams } from '../validators/common';
import { z } from 'zod';

const router = Router();
const withId = (schema: z.AnyZodObject = z.object({})) => schema.extend({ params: idParams });

router.get('/', validate(listMenuSchema), asyncHandler(menu.listMenu));
router.get('/categories', asyncHandler(menu.getCategories));
router.get('/:id', validate(withId()), asyncHandler(menu.getMenuItem));
router.post('/', requireAdmin, validate(createMenuSchema), asyncHandler(menu.createMenuItem));
router.put('/:id', requireAdmin, validate(withId(updateMenuSchema)), asyncHandler(menu.updateMenuItem));
router.delete('/:id', requireAdmin, validate(withId()), asyncHandler(menu.deleteMenuItem));

export default router;
