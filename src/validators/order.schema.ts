import { z } from 'zod';
import { ORDER_STATUSES } from '../models/Order';
import { objectId } from './common';

export const phoneRegex = /^[6-9]\d{9}$/;

export const createOrderSchema = z.object({
  body: z.object({
    customer: z.object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
      phone: z.string().trim().regex(phoneRegex, 'Enter a valid 10-digit mobile number'),
      notes: z.string().trim().max(300).optional().default(''),
    }),
    tableNumber: z.coerce.number().int().min(1).max(500).optional(),
    items: z
      .array(
        z.object({
          menuItem: objectId,
          quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(50),
        }),
      )
      .min(1, 'Cart is empty'),
  }),
});

export const listOrdersSchema = z.object({
  query: z.object({
    phone: z.string().trim().regex(phoneRegex, 'Enter a valid 10-digit mobile number').optional(),
    status: z.enum(ORDER_STATUSES).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({ status: z.enum(ORDER_STATUSES) }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
