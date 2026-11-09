import { expect, test } from '@playwright/test';
import { adminToken, auth, createMenuItem, uniqueName } from '../../fixtures/api';

test.describe('GET /menu', () => {
  test('lists available items with pagination meta', async ({ request }) => {
    const body = await (await request.get('menu')).json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(20);
    expect(body.data.every((i: { isAvailable: boolean }) => i.isAvailable)).toBe(true);
    expect(body.pagination).toMatchObject({ page: 1, total: body.data.length });
  });

  test('available=all also returns unavailable items', async ({ request }) => {
    const all = await (await request.get('menu', { params: { available: 'all' } })).json();
    const visible = await (await request.get('menu')).json();
    expect(all.pagination.total).toBeGreaterThan(visible.pagination.total);
    expect(all.data.some((i: { name: string; isAvailable: boolean }) => i.name === 'Tiramisu' && !i.isAvailable)).toBe(true);
  });

  test('search matches partial, case-insensitive names', async ({ request }) => {
    const body = await (await request.get('menu', { params: { search: 'CAPP' } })).json();
    expect(body.data.map((i: { name: string }) => i.name)).toEqual(['Cappuccino']);
  });

  test('category filter returns only that category', async ({ request }) => {
    const body = await (await request.get('menu', { params: { category: 'tea' } })).json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((i: { category: string }) => i.category === 'tea')).toBe(true);
  });

  for (const [sort, dir] of [
    ['price_asc', 1],
    ['price_desc', -1],
  ] as const) {
    test(`sort=${sort} orders by price`, async ({ request }) => {
      const prices: number[] = (await (await request.get('menu', { params: { sort } })).json()).data.map((i: { price: number }) => i.price);
      expect(prices).toEqual([...prices].sort((a, b) => (a - b) * dir));
    });
  }

  test('pagination splits results', async ({ request }) => {
    const p1 = await (await request.get('menu', { params: { limit: 5, page: 1 } })).json();
    const p2 = await (await request.get('menu', { params: { limit: 5, page: 2 } })).json();
    expect(p1.data).toHaveLength(5);
    expect(p2.pagination.page).toBe(2);
    expect(p1.data[0]._id).not.toBe(p2.data[0]._id);
  });

  test('categories endpoint aggregates counts', async ({ request }) => {
    const body = await (await request.get('menu/categories')).json();
    expect(body.data.length).toBeGreaterThanOrEqual(5);
    expect(body.data[0]).toEqual({ category: expect.any(String), count: expect.any(Number) });
  });

  test('rejects invalid query params', async ({ request }) => {
    const res = await request.get('menu', { params: { category: 'pizza', sort: 'cheapest' } });
    expect(res.status()).toBe(400);
    const fields = (await res.json()).errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['category', 'sort']));
  });
});

test.describe('GET /menu/:id', () => {
  test('returns one item', async ({ request }) => {
    const first = (await (await request.get('menu')).json()).data[0];
    const res = await request.get(`menu/${first._id}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).data.name).toBe(first.name);
  });

  test('400 for malformed id, 404 for unknown id', async ({ request }) => {
    expect((await request.get('menu/not-an-id')).status()).toBe(400);
    expect((await request.get('menu/000000000000000000000000')).status()).toBe(404);
  });
});

test.describe('menu CRUD (admin)', () => {
  test('write endpoints require a token', async ({ request }) => {
    expect((await request.post('menu', { data: { name: 'x', category: 'tea', price: 1 } })).status()).toBe(401);
    expect((await request.put('menu/000000000000000000000000', { data: { price: 1 } })).status()).toBe(401);
    expect((await request.delete('menu/000000000000000000000000')).status()).toBe(401);
  });

  test('create → update → delete lifecycle', async ({ request }) => {
    const token = await adminToken(request);
    const name = uniqueName('E2E Latte');
    const created = await createMenuItem(request, token, { name, category: 'coffee', price: 175 });
    expect(created).toMatchObject({ name, price: 175, isAvailable: true });

    const updated = await request.put(`menu/${created._id}`, { headers: auth(token), data: { price: 185, isAvailable: false } });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).data).toMatchObject({ price: 185, isAvailable: false });

    // Unavailable items are hidden from the public list.
    const publicList = await (await request.get('menu', { params: { search: name } })).json();
    expect(publicList.data).toHaveLength(0);

    expect((await request.delete(`menu/${created._id}`, { headers: auth(token) })).status()).toBe(200);
    expect((await request.get(`menu/${created._id}`)).status()).toBe(404);
    expect((await request.delete(`menu/${created._id}`, { headers: auth(token) })).status()).toBe(404);
  });

  test('create validates the body', async ({ request }) => {
    const token = await adminToken(request);
    const res = await request.post('menu', { headers: auth(token), data: { name: 'x', category: 'soup', price: -5, imageUrl: 'nope' } });
    expect(res.status()).toBe(400);
    const fields = (await res.json()).errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'category', 'price', 'imageUrl']));
  });

  test('update with an empty body is rejected', async ({ request }) => {
    const token = await adminToken(request);
    const item = await createMenuItem(request, token, { name: uniqueName('E2E Empty') });
    const res = await request.put(`menu/${item._id}`, { headers: auth(token), data: {} });
    expect(res.status()).toBe(400);
    await request.delete(`menu/${item._id}`, { headers: auth(token) });
  });
});
