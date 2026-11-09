import type { Request, Response } from 'express';
import * as menuService from '../services/menu.service';
import { sendCreated, sendOk, sendPaginated } from '../utils/apiResponse';
import type { MenuListQuery } from '../utils/queryBuilder';
import type { PageParams } from '../utils/pagination';

export async function listMenu(req: Request, res: Response) {
  const { items, pagination } = await menuService.listMenuItems(req.query as unknown as MenuListQuery & PageParams);
  sendPaginated(res, items, pagination);
}

export async function getMenuItem(req: Request, res: Response) {
  sendOk(res, await menuService.getMenuItem(req.params.id));
}

export async function getCategories(_req: Request, res: Response) {
  sendOk(res, await menuService.getCategoryCounts());
}

export async function createMenuItem(req: Request, res: Response) {
  sendCreated(res, await menuService.createMenuItem(req.body), 'Menu item created');
}

export async function updateMenuItem(req: Request, res: Response) {
  sendOk(res, await menuService.updateMenuItem(req.params.id, req.body), 'Menu item updated');
}

export async function deleteMenuItem(req: Request, res: Response) {
  sendOk(res, await menuService.deleteMenuItem(req.params.id), 'Menu item deleted');
}
