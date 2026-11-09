import { expect, test } from '@playwright/test';
import { adminToken, auth, createMenuItem, findItem, placeOrder, setOrderStatus, uniqueName, uniquePhone } from '../../fixtures/api';

test.describe('POST /orders', () => {
  test('prices and total come from the server; duplicate lines merge', async ({ request }) => {
    const espresso = await findItem(request, 'espresso', 'true');
    const brownie = await findItem(request, 'brownie', 'true');
    const res = await request.post('orders', {
      data: {
        customer: { name: 'Tamper', phone: uniquePhone() },
        tableNumber: 3,
        totalAmount: 1, // ignored
        items: [
          { menuItem: espresso._id, quantity: 2, price: 1 }, // client price ignored
          { menuItem: brownie._id, quantity: 1 },
          { menuItem: espresso._id, quantity: 1 },
        ],
      },
    });
    expect(res.status()).toBe(201);
    const order = (await res.json()).data;
    expect(order.orderNumber).toMatch(/^ORD-[A-Z2-9]{6}$/);
    expect(order.status).toBe('pending');
    expect(order.items).toHaveLength(2);
    expect(order.items.find((i: { name: string }) => i.name === 'Espresso')).toMatchObject({ quantity: 3, price: espresso.price, subtotal: espresso.price * 3 });
    expect(order.totalAmount).toBe(espresso.price * 3 + brownie.price);
  });

  test('validates customer, phone and cart', async ({ request }) => {
    const res = await request.post('orders', { data: { customer: { name: 'A', phone: '12345' }, items: [] } });
    expect(res.status()).toBe(400);
    const fields = (await res.json()).errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['customer.name', 'customer.phone', 'items']));
  });

  test('rejects unavailable and non-existent items', async ({ request }) => {
    const tiramisu = await findItem(request, 'tiramisu');
    const unavailable = await request.post('orders', { data: { customer: { name: 'Test', phone: uniquePhone() }, items: [{ menuItem: tiramisu._id, quantity: 1 }] } });
    expect(unavailable.status()).toBe(400);
    expect((await unavailable.json()).message).toContain('unavailable');

    const missing = await request.post('orders', {
      data: { customer: { name: 'Test', phone: uniquePhone() }, items: [{ menuItem: '000000000000000000000000', quantity: 1 }] },
    });
    expect(missing.status()).toBe(400);
    expect((await missing.json()).message).toContain('no longer exist');
  });

  test('rejects zero/negative quantities', async ({ request }) => {
    const latte = await findItem(request, 'latte', 'true');
    const res = await request.post('orders', { data: { customer: { name: 'Test', phone: uniquePhone() }, items: [{ menuItem: latte._id, quantity: 0 }] } });
    expect(res.status()).toBe(400);
  });
});

test.describe('reading orders', () => {
  test('GET /orders/:id returns the order', async ({ request }) => {
    const latte = await findItem(request, 'latte', 'true');
    const order = await placeOrder(request, [{ menuItem: latte._id, quantity: 1 }]);
    const res = await request.get(`orders/${order._id}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).data.orderNumber).toBe(order.orderNumber);
    expect((await request.get('orders/000000000000000000000000')).status()).toBe(404);
  });

  test('public listing requires a phone and returns only that phone', async ({ request }) => {
    expect((await request.get('orders')).status()).toBe(400);
    const latte = await findItem(request, 'latte', 'true');
    const phone = uniquePhone();
    await placeOrder(request, [{ menuItem: latte._id, quantity: 1 }], phone);
    await placeOrder(request, [{ menuItem: latte._id, quantity: 2 }], phone);
    await placeOrder(request, [{ menuItem: latte._id, quantity: 1 }]); // someone else

    const body = await (await request.get('orders', { params: { phone } })).json();
    expect(body.data).toHaveLength(2);
    expect(body.data.every((o: { customer: { phone: string } }) => o.customer.phone === phone)).toBe(true);
    // newest first
    expect(new Date(body.data[0].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(body.data[1].createdAt).getTime());
  });

  test('admins can list all orders and filter by status', async ({ request }) => {
    const token = await adminToken(request);
    const all = await (await request.get('orders', { headers: auth(token) })).json();
    expect(all.pagination.total).toBeGreaterThan(0);
    const pending = await (await request.get('orders', { headers: auth(token), params: { status: 'pending' } })).json();
    expect(pending.data.every((o: { status: string }) => o.status === 'pending')).toBe(true);
  });
});

test.describe('order status & stats (admin)', () => {
  test('status updates need a token and a valid status', async ({ request }) => {
    const latte = await findItem(request, 'latte', 'true');
    const order = await placeOrder(request, [{ menuItem: latte._id, quantity: 1 }]);
    expect((await request.patch(`orders/${order._id}/status`, { data: { status: 'ready' } })).status()).toBe(401);

    const token = await adminToken(request);
    expect((await request.patch(`orders/${order._id}/status`, { headers: auth(token), data: { status: 'lost' } })).status()).toBe(400);
    const updated = await setOrderStatus(request, token, order._id, 'preparing');
    expect(updated.status).toBe('preparing');
  });

  test('stats aggregate revenue, statuses and top items', async ({ request }) => {
    const token = await adminToken(request);
    expect((await request.get('orders/stats')).status()).toBe(401);

    const before = (await (await request.get('orders/stats', { headers: auth(token) })).json()).data;
    const item = await createMenuItem(request, token, { name: uniqueName('E2E Bestseller'), price: 50 });
    await placeOrder(request, [{ menuItem: item._id, quantity: 40 }]);
    const after = (await (await request.get('orders/stats', { headers: auth(token) })).json()).data;

    expect(Object.keys(after)).toEqual(expect.arrayContaining(['totals', 'byStatus', 'revenueByDay', 'topItems']));
    expect(after.totals.orders).toBe(before.totals.orders + 1);
    expect(after.totals.revenue).toBe(before.totals.revenue + 2000);
    expect(after.topItems[0]).toMatchObject({ name: item.name, quantity: 40, revenue: 2000 });
    expect(after.revenueByDay.length).toBeGreaterThan(0);
    await request.delete(`menu/${item._id}`, { headers: auth(token) });
  });

  test('cancelled orders are excluded from revenue', async ({ request }) => {
    const token = await adminToken(request);
    const latte = await findItem(request, 'latte', 'true');
    const before = (await (await request.get('orders/stats', { headers: auth(token) })).json()).data.totals;
    const order = await placeOrder(request, [{ menuItem: latte._id, quantity: 1 }]);
    await setOrderStatus(request, token, order._id, 'cancelled');
    const after = (await (await request.get('orders/stats', { headers: auth(token) })).json()).data.totals;
    expect(after.revenue).toBe(before.revenue);
    expect(after.orders).toBe(before.orders);
  });
});
