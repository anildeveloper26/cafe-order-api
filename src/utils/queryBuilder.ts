import type { FilterQuery, SortOrder } from 'mongoose';
import { MENU_SORTS, type Category, type MenuSort } from '../constants/menu';
import type { OrderStatus } from '../constants/orders';
import type { MenuItem } from '../models/MenuItem';
import type { Order } from '../models/Order';

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface MenuListQuery {
  search?: string;
  category?: Category;
  available?: 'true' | 'false' | 'all';
  sort?: MenuSort;
}

/** Builds the Mongo filter + sort for GET /menu from already-validated query params. */
export function buildMenuQuery({ search, category, available, sort }: MenuListQuery) {
  const filter: FilterQuery<MenuItem> = {};
  if (category) filter.category = category;
  if (available !== 'all') filter.isAvailable = available !== 'false';
  if (search) {
    // Regex keeps partial matches working ("cap" -> "Cappuccino").
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }
  const sortSpec = MENU_SORTS[sort ?? 'name'] as Record<string, SortOrder>;
  return { filter, sort: sortSpec };
}

export interface OrderListQuery {
  phone?: string;
  status?: OrderStatus;
}

export function buildOrderQuery({ phone, status }: OrderListQuery) {
  const filter: FilterQuery<Order> = {};
  if (phone) filter['customer.phone'] = phone;
  if (status) filter.status = status;
  return { filter, sort: { createdAt: -1 } as Record<string, SortOrder> };
}
