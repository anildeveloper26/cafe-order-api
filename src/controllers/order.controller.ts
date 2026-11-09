import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { customAlphabet } from 'nanoid';
import { MenuItemModel } from '../models/MenuItem';
import { OrderModel, type Order, type OrderStatus } from '../models/Order';
import type { CreateOrderInput } from '../validators/order.schema';
import { ApiError } from '../utils/ApiError';
import { emit, rooms } from '../socket';

const genOrderNumber = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function createOrder(req: Request, res: Response) {
  const { customer, tableNumber, items } = req.body as CreateOrderInput;

  // Merge duplicate lines for the same item.
  const qtyById = new Map<string, number>();
  for (const line of items) qtyById.set(line.menuItem, (qtyById.get(line.menuItem) ?? 0) + line.quantity);

  const menuItems = await MenuItemModel.find({ _id: { $in: [...qtyById.keys()] } }).lean();
  const byId = new Map(menuItems.map((m) => [String(m._id), m]));

  const missing = [...qtyById.keys()].filter((id) => !byId.has(id));
  if (missing.length) throw ApiError.badRequest('Some items no longer exist', missing.map((id) => ({ field: 'items', message: `Item ${id} not found` })));

  const unavailable = menuItems.filter((m) => !m.isAvailable);
  if (unavailable.length) {
    throw ApiError.badRequest(
      'Some items are currently unavailable',
      unavailable.map((m) => ({ field: 'items', message: `${m.name} is unavailable` })),
    );
  }

  // Prices always come from the database, never from the client.
  const orderItems = [...qtyById.entries()].map(([id, quantity]) => {
    const m = byId.get(id)!;
    return { menuItem: m._id, name: m.name, price: m.price, quantity, subtotal: round2(m.price * quantity) };
  });
  const totalAmount = round2(orderItems.reduce((sum, i) => sum + i.subtotal, 0));

  const order = await OrderModel.create({
    orderNumber: `ORD-${genOrderNumber()}`,
    customer,
    tableNumber,
    items: orderItems,
    totalAmount,
  });

  emit(rooms.admin, 'order:new', order);
  res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
}

export async function listOrders(req: Request, res: Response) {
  const { phone, status, page, limit } = req.query as unknown as {
    phone?: string;
    status?: OrderStatus;
    page: number;
    limit: number;
  };
  const isAdmin = Boolean((req as Request & { admin?: unknown }).admin);

  // Public callers may only look up their own orders by phone.
  if (!isAdmin && !phone) throw ApiError.badRequest('phone query parameter is required');

  const filter: FilterQuery<Order> = {};
  if (phone) filter['customer.phone'] = phone;
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    OrderModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    OrderModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
}

export async function getOrder(req: Request, res: Response) {
  const order = await OrderModel.findById(req.params.id).lean();
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, data: order });
}

export async function updateOrderStatus(req: Request, res: Response) {
  const order = await OrderModel.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true },
  );
  if (!order) throw ApiError.notFound('Order not found');

  const payload = { _id: order._id, orderNumber: order.orderNumber, status: order.status, updatedAt: order.updatedAt };
  emit(rooms.order(String(order._id)), 'order:status', payload);
  emit(rooms.admin, 'order:status', payload);
  res.json({ success: true, message: 'Order status updated', data: order });
}

export async function getOrderStats(_req: Request, res: Response) {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [result] = await OrderModel.aggregate([
    {
      $facet: {
        totals: [
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 }, avgOrder: { $avg: '$totalAmount' } } },
          { $project: { _id: 0 } },
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $project: { _id: 0, status: '$_id', count: 1 } },
        ],
        revenueByDay: [
          { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
              revenue: { $sum: '$totalAmount' },
              orders: { $sum: 1 },
            },
          },
          { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
          { $sort: { date: 1 } },
        ],
        topItems: [
          { $match: { status: { $ne: 'cancelled' } } },
          { $unwind: '$items' },
          { $group: { _id: '$items.menuItem', name: { $first: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.subtotal' } } },
          { $sort: { quantity: -1 } },
          { $limit: 5 },
          { $project: { _id: 0, menuItem: '$_id', name: 1, quantity: 1, revenue: 1 } },
        ],
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      totals: result.totals[0] ?? { revenue: 0, orders: 0, avgOrder: 0 },
      byStatus: result.byStatus,
      revenueByDay: result.revenueByDay,
      topItems: result.topItems,
    },
  });
}
