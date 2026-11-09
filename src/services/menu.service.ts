import { MenuItemModel } from '../models/MenuItem';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, toSkip, type PageParams } from '../utils/pagination';
import { buildMenuQuery, type MenuListQuery } from '../utils/queryBuilder';
import type { CreateMenuInput } from '../validators/menu.schema';

const LIST_PROJECTION = '-__v';

export async function listMenuItems(query: MenuListQuery & PageParams) {
  const { filter, sort } = buildMenuQuery(query);
  const [items, total] = await Promise.all([
    MenuItemModel.find(filter, LIST_PROJECTION).sort(sort).skip(toSkip(query)).limit(query.limit).lean(),
    MenuItemModel.countDocuments(filter),
  ]);
  return { items, pagination: buildPaginationMeta(query, total) };
}

export async function getMenuItem(id: string) {
  const item = await MenuItemModel.findById(id, LIST_PROJECTION).lean();
  if (!item) throw ApiError.notFound('Menu item not found');
  return item;
}

export function getCategoryCounts() {
  return MenuItemModel.aggregate<{ category: string; count: number }>([
    { $match: { isAvailable: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $project: { _id: 0, category: '$_id', count: 1 } },
    { $sort: { category: 1 } },
  ]);
}

export function createMenuItem(input: CreateMenuInput) {
  return MenuItemModel.create(input);
}

export async function updateMenuItem(id: string, input: Partial<CreateMenuInput>) {
  const item = await MenuItemModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  if (!item) throw ApiError.notFound('Menu item not found');
  return item;
}

export async function deleteMenuItem(id: string) {
  const item = await MenuItemModel.findByIdAndDelete(id);
  if (!item) throw ApiError.notFound('Menu item not found');
  return { _id: item._id };
}

/** Fetches the given items by id for pricing an order. */
export function findMenuItemsByIds(ids: string[]) {
  return MenuItemModel.find({ _id: { $in: ids } }, 'name price isAvailable').lean();
}
