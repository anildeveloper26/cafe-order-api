import { customAlphabet } from 'nanoid';
import { OrderModel } from '../models/Order';
import {
  ORDER_NUMBER_ALPHABET,
  ORDER_NUMBER_LENGTH,
  ORDER_NUMBER_PREFIX,
  type OrderStatus,
} from '../constants/orders';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, toSkip, type PageParams } from '../utils/pagination';
import { buildOrderQuery, type OrderListQuery } from '../utils/queryBuilder';
import type { CreateOrderInput } from '../validators/order.schema';
import { emit, rooms } from '../socket';
import { findMenuItemsByIds } from './menu.service';

const genOrderNumber = customAlphabet(ORDER_NUMBER_ALPHABET, ORDER_NUMBER_LENGTH);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Merges duplicate lines for the same menu item into one quantity. */
function mergeLines(items: CreateOrderInput['items']) {
  const qtyById = new Map<string, number>();
  for (const line of items) qtyById.set(line.menuItem, (qtyById.get(line.menuItem) ?? 0) + line.quantity);
  return qtyById;
}

/**
 * Places an order. Prices and totals always come from the database, never from the client.
 */
export async function placeOrder({ customer, tableNumber, items }: CreateOrderInput) {
  const qtyById = mergeLines(items);
  const menuItems = await findMenuItemsByIds([...qtyById.keys()]);
  const byId = new Map(menuItems.map((m) => [String(m._id), m]));

  const missing = [...qtyById.keys()].filter((id) => !byId.has(id));
  if (missing.length) {
    throw ApiError.badRequest(
      'Some items no longer exist',
      missing.map((id) => ({ field: 'items', message: `Item ${id} not found` })),
    );
  }

  const unavailable = menuItems.filter((m) => !m.isAvailable);
  if (unavailable.length) {
    throw ApiError.badRequest(
      'Some items are currently unavailable',
      unavailable.map((m) => ({ field: 'items', message: `${m.name} is unavailable` })),
    );
  }

  const orderItems = [...qtyById.entries()].map(([id, quantity]) => {
    const m = byId.get(id)!;
    return { menuItem: m._id, name: m.name, price: m.price, quantity, subtotal: round2(m.price * quantity) };
  });
  const totalAmount = round2(orderItems.reduce((sum, i) => sum + i.subtotal, 0));

  const order = await OrderModel.create({
    orderNumber: `${ORDER_NUMBER_PREFIX}${genOrderNumber()}`,
    customer,
    tableNumber,
    items: orderItems,
    totalAmount,
  });

  emit(rooms.admin, 'order:new', order);
  return order;
}

export async function listOrders(query: OrderListQuery & PageParams) {
  const { filter, sort } = buildOrderQuery(query);
  const [orders, total] = await Promise.all([
    OrderModel.find(filter, '-__v').sort(sort).skip(toSkip(query)).limit(query.limit).lean(),
    OrderModel.countDocuments(filter),
  ]);
  return { orders, pagination: buildPaginationMeta(query, total) };
}

export async function getOrder(id: string) {
  const order = await OrderModel.findById(id, '-__v').lean();
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  if (!order) throw ApiError.notFound('Order not found');

  const payload = { _id: order._id, orderNumber: order.orderNumber, status: order.status, updatedAt: order.updatedAt };
  emit(rooms.order(String(order._id)), 'order:status', payload);
  emit(rooms.admin, 'order:status', payload);
  return order;
}
