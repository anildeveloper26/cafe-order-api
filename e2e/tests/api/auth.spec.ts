import { expect, test } from '@playwright/test';
import { ADMIN } from '../../fixtures/env';

test.describe('POST /auth/login', () => {
  test('returns a JWT for valid credentials', async ({ request }) => {
    const res = await request.post('auth/login', { data: ADMIN });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.admin.email).toBe(ADMIN.email);
    expect(data.token.split('.')).toHaveLength(3);
  });

  test('email is case-insensitive', async ({ request }) => {
    const res = await request.post('auth/login', { data: { ...ADMIN, email: ADMIN.email.toUpperCase() } });
    expect(res.status()).toBe(200);
  });

  test('wrong password → 401 without revealing which field was wrong', async ({ request }) => {
    const res = await request.post('auth/login', { data: { ...ADMIN, password: 'wrong' } });
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe('Invalid email or password');
  });

  test('malformed body → 400', async ({ request }) => {
    const res = await request.post('auth/login', { data: { email: 'not-an-email' } });
    expect(res.status()).toBe(400);
  });

  test('garbage or missing token → 401 on admin routes', async ({ request }) => {
    expect((await request.get('orders/stats')).status()).toBe(401);
    expect((await request.get('orders/stats', { headers: { Authorization: 'Bearer garbage.token.value' } })).status()).toBe(401);
  });
});
