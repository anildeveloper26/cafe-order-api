import { Schema, model, type InferSchemaType } from 'mongoose';

import { ORDER_STATUSES } from '../constants/orders';

export { ORDER_STATUSES, type OrderStatus } from '../constants/orders';

const orderItemSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      notes: { type: String, trim: true, default: '' },
    },
    tableNumber: { type: Number, min: 1 },
    items: {
      type: [orderItemSchema],
      validate: [(v: unknown[]) => v.length > 0, 'Order must contain at least one item'],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
  },
  { timestamps: true },
);

orderSchema.index({ 'customer.phone': 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export type Order = InferSchemaType<typeof orderSchema>;
export const OrderModel = model('Order', orderSchema);
