import type { Request, Response } from 'express';
import type { FilterQuery, SortOrder } from 'mongoose';
import { MenuItemModel, type MenuItem } from '../models/MenuItem';
import { ApiError } from '../utils/ApiError';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS: Record<string, Record<string, SortOrder>> = {
  price_asc: { price: 1, name: 1 },
  price_desc: { price: -1, name: 1 },
  name: { name: 1 },
  newest: { createdAt: -1 },
};

export async function listMenu(req: Request, res: Response) {
  const { search, category, sort, available, page, limit } = req.query as unknown as {
    search?: string;
    category?: string;
    sort?: string;
    available?: 'true' | 'false' | 'all';
    page: number;
    limit: number;
  };

  const filter: FilterQuery<MenuItem> = {};
  if (category) filter.category = category;
  if (available !== 'all') filter.isAvailable = available === 'false' ? false : true;
  if (search) {
    // Regex keeps partial matches working ("cap" -> "Cappuccino"); text index backs full-word search.
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }

  const [items, total] = await Promise.all([
    MenuItemModel.find(filter)
      .sort(SORTS[sort ?? 'name'])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MenuItemModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
}

export async function getMenuItem(req: Request, res: Response) {
  const item = await MenuItemModel.findById(req.params.id).lean();
  if (!item) throw ApiError.notFound('Menu item not found');
  res.json({ success: true, data: item });
}

export async function getCategories(_req: Request, res: Response) {
  const data = await MenuItemModel.aggregate<{ category: string; count: number }>([
    { $match: { isAvailable: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $project: { _id: 0, category: '$_id', count: 1 } },
    { $sort: { category: 1 } },
  ]);
  res.json({ success: true, data });
}

export async function createMenuItem(req: Request, res: Response) {
  const item = await MenuItemModel.create(req.body);
  res.status(201).json({ success: true, message: 'Menu item created', data: item });
}

export async function updateMenuItem(req: Request, res: Response) {
  const item = await MenuItemModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!item) throw ApiError.notFound('Menu item not found');
  res.json({ success: true, message: 'Menu item updated', data: item });
}

export async function deleteMenuItem(req: Request, res: Response) {
  const item = await MenuItemModel.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound('Menu item not found');
  res.json({ success: true, message: 'Menu item deleted', data: { _id: item._id } });
}
