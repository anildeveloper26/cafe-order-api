import { OrderModel } from '../models/Order';
import { STATS_DAYS, STATS_TIMEZONE, STATS_TOP_ITEMS } from '../constants/orders';

const notCancelled = { status: { $ne: 'cancelled' } };

function statsWindowStart() {
  const since = new Date();
  since.setDate(since.getDate() - (STATS_DAYS - 1));
  since.setHours(0, 0, 0, 0);
  return since;
}

/** Dashboard stats in a single aggregation round trip using $facet. */
export async function getOrderStats() {
  const [result] = await OrderModel.aggregate([
    {
      $facet: {
        totals: [
          { $match: notCancelled },
          { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 }, avgOrder: { $avg: '$totalAmount' } } },
          { $project: { _id: 0 } },
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $project: { _id: 0, status: '$_id', count: 1 } },
        ],
        revenueByDay: [
          { $match: { ...notCancelled, createdAt: { $gte: statsWindowStart() } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: STATS_TIMEZONE } },
              revenue: { $sum: '$totalAmount' },
              orders: { $sum: 1 },
            },
          },
          { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
          { $sort: { date: 1 } },
        ],
        topItems: [
          { $match: notCancelled },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.menuItem',
              name: { $first: '$items.name' },
              quantity: { $sum: '$items.quantity' },
              revenue: { $sum: '$items.subtotal' },
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: STATS_TOP_ITEMS },
          { $project: { _id: 0, menuItem: '$_id', name: 1, quantity: 1, revenue: 1 } },
        ],
      },
    },
  ]);

  return {
    totals: result.totals[0] ?? { revenue: 0, orders: 0, avgOrder: 0 },
    byStatus: result.byStatus,
    revenueByDay: result.revenueByDay,
    topItems: result.topItems,
  };
}
