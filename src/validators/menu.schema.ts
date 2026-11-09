import { z } from 'zod';
import { idParams } from './common';
import { CATEGORIES, MENU_DEFAULT_LIMIT, MENU_MAX_LIMIT, MENU_SORT_KEYS } from '../constants/menu';

const menuBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().default(''),
  category: z.enum(CATEGORIES),
  price: z.coerce.number().positive('Price must be greater than 0').max(100000),
  imageUrl: z.string().trim().url('Image URL must be a valid URL').or(z.literal('')).optional().default(''),
  isAvailable: z.boolean().optional().default(true),
  isVeg: z.boolean().optional().default(true),
});

export const createMenuSchema = z.object({ body: menuBody });
export const updateMenuSchema = z.object({
  params: idParams,
  body: menuBody.partial().refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' }),
});

export const listMenuSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    category: z.enum(CATEGORIES).optional(),
    sort: z.enum(MENU_SORT_KEYS).optional(),
    available: z.enum(['true', 'false', 'all']).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(MENU_MAX_LIMIT).optional().default(MENU_DEFAULT_LIMIT),
  }),
});

export type CreateMenuInput = z.infer<typeof menuBody>;

export const menuIdSchema = z.object({ params: idParams });
