import { expect, test } from '@playwright/test';
import { API_ORIGIN } from '../../fixtures/env';

test.describe('health & docs', () => {
  test('health reports a connected database', async ({ request }) => {
    const res = await request.get('health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, status: 'ok', db: 'connected' });
  });

  test('Swagger UI is served at /api/docs', async ({ request }) => {
    const res = await request.get(`${API_ORIGIN}/api/docs/`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('swagger-ui');
  });

  test('OpenAPI spec documents every endpoint', async ({ request }) => {
    const spec = await (await request.get(`${API_ORIGIN}/api/docs.json`)).json();
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        '/health',
        '/menu',
        '/menu/categories',
        '/menu/{id}',
        '/orders',
        '/orders/stats',
        '/orders/{id}',
        '/orders/{id}/status',
        '/auth/login',
      ]),
    );
  });

  test('unknown routes return a JSON 404', async ({ request }) => {
    const res = await request.get('does-not-exist');
    expect(res.status()).toBe(404);
    expect(await res.json()).toMatchObject({ success: false, message: expect.stringContaining('Route not found') });
  });

  test('malformed JSON body returns 400', async ({ request }) => {
    const res = await request.post('orders', { headers: { 'content-type': 'application/json' }, data: '{"bad json' });
    expect(res.status()).toBe(400);
  });
});
