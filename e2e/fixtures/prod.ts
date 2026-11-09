import { expect, type APIRequestContext, type Page } from '@playwright/test';

const trimSlash = (s: string) => s.replace(/\/+$/, '');

/** Target environment. Defaults are the live deployment; override via env or e2e/.env.prod. */
export const PROD = {
  webUrl: trimSlash(process.env.PROD_WEB_URL || 'https://cafe-order-web.vercel.app'),
  apiUrl: trimSlash(process.env.PROD_API_URL || 'https://cafe-order-api-xxed.onrender.com/api'),
  adminEmail: process.env.PROD_ADMIN_EMAIL ?? '',
  adminPassword: process.env.PROD_ADMIN_PASSWORD ?? '',
  readOnly: process.env.E2E_READ_ONLY === '1',
};
export const API_ORIGIN = PROD.apiUrl.replace(/\/api$/, '');
export const WEB_ORIGIN = new URL(PROD.webUrl).origin;

/** Markers that identify data created by this suite (and only this suite) so it can be cleaned up. */
export const TEST_DATA = {
  customerName: 'E2E Smoke Test',
  phone: '9000000000',
  itemPrefix: '[E2E]',
};

export const itemName = (label: string) => `${TEST_DATA.itemPrefix} ${label} ${Date.now().toString(36)}`;

export const hasAdminCreds = () => Boolean(PROD.adminEmail && PROD.adminPassword);

const api = (p: string) => `${PROD.apiUrl}${p}`;

/**
 * Admin token. Global setup logs in once and shares the token through E2E_ADMIN_TOKEN, so a run makes
 * very few login requests (the API rate-limits logins to 10 per 15 minutes per IP).
 */
export async function loginToken(request: APIRequestContext): Promise<string> {
  if (process.env.E2E_ADMIN_TOKEN) return process.env.E2E_ADMIN_TOKEN;
  const res = await request.post(api('/auth/login'), { data: { email: PROD.adminEmail, password: PROD.adminPassword } });
  expect(res.status(), 'admin login with PROD_ADMIN_EMAIL / PROD_ADMIN_PASSWORD').toBe(200);
  const token: string = (await res.json()).data.token;
  process.env.E2E_ADMIN_TOKEN = token;
  return token;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Polls /api/health until the (possibly sleeping) Render instance answers. */
export async function warmUp(request: APIRequestContext, timeoutMs = 120_000) {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request.get(api('/health'), { timeout: 30_000 });
      if (res.ok() && (await res.json()).db === 'connected') return Date.now() - start;
      last = `status ${res.status()}`;
    } catch (e) {
      last = (e as Error).message;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`API at ${PROD.apiUrl} did not become healthy within ${timeoutMs / 1000}s (${last})`);
}

/** Cancels every non-cancelled order placed with the test phone and deletes every [E2E] menu item. */
export async function sweepTestData(request: APIRequestContext, token: string) {
  const summary = { ordersCancelled: 0, itemsDeleted: 0 };

  const orders = await request.get(api('/orders'), { params: { phone: TEST_DATA.phone, limit: 100 } });
  for (const o of (await orders.json()).data ?? []) {
    if (o.status !== 'cancelled' && o.customer?.phone === TEST_DATA.phone) {
      const r = await request.patch(api(`/orders/${o._id}/status`), { headers: bearer(token), data: { status: 'cancelled' } });
      if (r.ok()) summary.ordersCancelled++;
    }
  }

  const items = await request.get(api('/menu'), { params: { search: TEST_DATA.itemPrefix, available: 'all', limit: 100 } });
  for (const i of (await items.json()).data ?? []) {
    if (typeof i.name === 'string' && i.name.startsWith(TEST_DATA.itemPrefix)) {
      const r = await request.delete(api(`/menu/${i._id}`), { headers: bearer(token) });
      if (r.ok()) summary.itemsDeleted++;
    }
  }
  return summary;
}

/** Real login through the admin form (no token injection on production). */
export async function loginViaForm(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(PROD.adminEmail);
  await page.getByLabel('Password').fill(PROD.adminPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/);
}
