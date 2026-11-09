import type { Request, Response } from 'express';
import * as orderService from '../services/order.service';
import * as statsService from '../services/stats.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendOk, sendPaginated } from '../utils/apiResponse';
import type { OrderListQuery } from '../utils/queryBuilder';
import type { PageParams } from '../utils/pagination';
import type { AuthedRequest } from '../middleware/auth';

export async function createOrder(req: Request, res: Response) {
  sendCreated(res, await orderService.placeOrder(req.body), 'Order placed successfully');
}

export async function listOrders(req: Request, res: Response) {
  const query = req.query as unknown as OrderListQuery & PageParams;
  // Public callers may only look up their own orders by phone; admins can list everything.
  if (!(req as AuthedRequest).admin && !query.phone) throw ApiError.badRequest('phone query parameter is required');
  const { orders, pagination } = await orderService.listOrders(query);
  sendPaginated(res, orders, pagination);
}

export async function getOrder(req: Request, res: Response) {
  sendOk(res, await orderService.getOrder(req.params.id));
}

export async function updateOrderStatus(req: Request, res: Response) {
  sendOk(res, await orderService.updateOrderStatus(req.params.id, req.body.status), 'Order status updated');
}

export async function getOrderStats(_req: Request, res: Response) {
  sendOk(res, await statsService.getOrderStats());
}
