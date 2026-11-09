import { expect, test } from '@playwright/test';
import { API_ORIGIN, bearer, itemName, loginToken, PROD, sweepTestData, TEST_DATA, WEB_ORIGIN } from '../../fixtures/prod';

test.describe('live API — read-only', () => {
  test('health reports a connected database', async ({ request }) => {
    const res = await request.get('health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, db: 'connected' });
  });

  test('Swagger docs and OpenAPI spec are published', async ({ request }) => {
    expect((await request.get(`${API_ORIGIN}/api/docs/`)).status()).toBe(200);
    const spec = await (await request.get(`${API_ORIGIN}/api/docs.json`)).json();
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining(['/health', '/menu', '/menu/categories', '/menu/{id}', '/orders', '/orders/stats', '/orders/{id}', '/orders/{id}/status', '/auth/login']),
    );
  });

  test('menu: list, search, category, sort, categories', async ({ request }) => {
    const list = await (await request.get('menu')).json();
    expect(list.data.length).toBeGreaterThan(0);
    expect(list.data.every((i: { isAvailable: boolean }) => i.isAvailable)).toBe(true);

    const search = await (await request.get('menu', { params: { search: 'capp' } })).json();
    expect(search.data.every((i: { name: string; description: string }) => /capp/i.test(i.name + i.description))).toBe(true);

    const tea = await (await request.get('menu', { params: { category: 'tea' } })).json();
    expect(tea.data.every((i: { category: string }) => i.category === 'tea')).toBe(true);

    const prices: number[] = (await (await request.get('menu', { params: { sort: 'price_desc' } })).json()).data.map((i: { price: number }) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));

    const cats = await (await request.get('menu/categories')).json();
    expect(cats.data.length).toBeGreaterThan(0);
  });

  test('validation, auth and not-found errors are JSON', async ({ request }) => {
    const bad = await request.post('orders', { data: { customer: { name: 'A', phone: '1' }, items: [] } });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).errors.length).toBeGreaterThan(0);

    expect((await request.get('orders/stats')).status()).toBe(401);
    expect((await request.get('orders')).status()).toBe(400);
    expect((await request.get('menu/not-an-id')).status()).toBe(400);
    const missing = await request.get('nope');
    expect(missing.status()).toBe(404);
    expect((await missing.json()).success).toBe(false);
  });

  test('CORS allows the frontend origin and blocks others', async ({ request }) => {
    const ok = await request.get('health', { headers: { Origin: WEB_ORIGIN } });
    expect(ok.status()).toBe(200);
    expect(ok.headers()['access-control-allow-origin']).toBe(WEB_ORIGIN);

    const blocked = await request.get('health', { headers: { Origin: 'https://not-allowed.example' } });
    expect(blocked.status()).toBe(403);
  });

  test('Socket.io handshake succeeds', async ({ request }) => {
    const res = await request.get(`${API_ORIGIN}/socket.io/`, { params: { EIO: '4', transport: 'polling' }, headers: { Origin: WEB_ORIGIN } });
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/^0\{"sid":/);
  });

  test('security headers are set', async ({ request }) => {
    const h = (await request.get('health')).headers();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['strict-transport-security']).toBeTruthy();
    expect(h['x-powered-by']).toBeUndefined();
  });
});

test.describe('live API — full flow @write', () => {
  let token: string;
  test.beforeAll(async ({ request }) => {
    token = await loginToken(request);
  });
  test.afterAll(async ({ request }) => {
    await sweepTestData(request, token);
  });

  test('admin login returns a JWT @write', async () => {
    expect(token.split('.')).toHaveLength(3);
  });

  test('menu item lifecycle and order lifecycle with server-side pricing @write', async ({ request }) => {
    const name = itemName('API Latte');
    const created = await request.post('menu', { headers: bearer(token), data: { name, category: 'coffee', price: 111, description: 'Created by the live E2E suite' } });
    expect(created.status()).toBe(201);
    const item = (await created.json()).data;

    const order = await request.post('orders', {
      data: {
        customer: { name: TEST_DATA.customerName, phone: TEST_DATA.phone },
        tableNumber: 99,
        totalAmount: 1, // must be ignored
        items: [
          { menuItem: item._id, quantity: 2 },
          { menuItem: item._id, quantity: 1 },
        ],
      },
    });
    expect(order.status()).toBe(201);
    const o = (await order.json()).data;
    expect(o.totalAmount).toBe(333);
    expect(o.items).toHaveLength(1);
    expect(o.status).toBe('pending');

    for (const status of ['preparing', 'ready', 'cancelled']) {
      const r = await request.patch(`orders/${o._id}/status`, { headers: bearer(token), data: { status } });
      expect(r.status()).toBe(200);
      expect((await r.json()).data.status).toBe(status);
    }
    expect((await (await request.get(`orders/${o._id}`)).json()).data.status).toBe('cancelled');

    // Unavailable items can't be ordered.
    await request.put(`menu/${item._id}`, { headers: bearer(token), data: { isAvailable: false } });
    const rejected = await request.post('orders', { data: { customer: { name: TEST_DATA.customerName, phone: TEST_DATA.phone }, items: [{ menuItem: item._id, quantity: 1 }] } });
    expect(rejected.status()).toBe(400);

    expect((await request.delete(`menu/${item._id}`, { headers: bearer(token) })).status()).toBe(200);
    expect((await request.get(`menu/${item._id}`)).status()).toBe(404);
  });

  test('stats endpoint returns dashboard data @write', async ({ request }) => {
    const stats = await (await request.get('orders/stats', { headers: bearer(token) })).json();
    expect(Object.keys(stats.data)).toEqual(expect.arrayContaining(['totals', 'byStatus', 'revenueByDay', 'topItems']));
    expect(typeof stats.data.totals.revenue).toBe('number');
  });

  test('wrong admin password is rejected @write', async ({ request }) => {
    const res = await request.post('auth/login', { data: { email: PROD.adminEmail, password: `${PROD.adminPassword}-wrong` } });
    expect(res.status()).toBe(401);
  });
});
