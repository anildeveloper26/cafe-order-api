import { expect, test, type Page } from '@playwright/test';
import { expectUrlParams, menuCardNames, parsePrice, signInAsAdmin, skipWelcome } from '../../fixtures/ui';
import { bearer, itemName, loginToken, loginViaForm, PROD, sweepTestData, TEST_DATA } from '../../fixtures/prod';

const api = (p: string) => `${PROD.apiUrl}${p}`;
const cartButton = (page: Page, count: number) => page.getByRole('button', { name: `Open cart, ${count} items` });

test.describe('live site — read-only', () => {
  test('root redirects to the menu and the menu loads from the API without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    await expect(page).toHaveURL(/\/menu$/);
    await expect(menuCardNames(page).first()).toBeVisible();
    expect(await menuCardNames(page).count()).toBeGreaterThan(5);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('frontend build points at the expected API', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (r) => r.url().includes('/api/') && apiCalls.push(r.url()));
    await page.goto('/menu');
    await expect(menuCardNames(page).first()).toBeVisible();
    expect(apiCalls.some((u) => u.startsWith(`${PROD.apiUrl}/menu`)), apiCalls.join('\n')).toBe(true);
  });

  test('QR welcome pop-up shows once per table per session', async ({ page }) => {
    await page.goto('/menu?table=12');
    const welcome = page.getByRole('dialog', { name: 'Table 12' });
    await expect(welcome).toBeVisible();
    await welcome.getByRole('button', { name: 'View menu' }).click();
    await expect(page.getByRole('banner')).toContainText('Table 12');
    await page.reload();
    await expect(menuCardNames(page).first()).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Table 12' })).toBeHidden();
  });

  test('search, category and sort are kept in the URL across reload', async ({ page }) => {
    await skipWelcome(page, 3);
    await page.goto('/menu?table=3');
    await page.getByRole('searchbox', { name: 'Search menu' }).fill('choc');
    await expectUrlParams(page, { q: 'choc' });
    for (const name of await menuCardNames(page).allTextContents()) expect(name.toLowerCase()).toContain('choc');

    await page.getByRole('searchbox', { name: 'Search menu' }).fill('');
    await expectUrlParams(page, { q: null });
    await page.getByRole('tab', { name: 'coffee' }).click();
    await page.getByRole('combobox', { name: 'Sort by' }).selectOption('price_desc');
    await expectUrlParams(page, { category: 'coffee', sort: 'price_desc' });
    await page.reload();
    await expect(page.getByRole('tab', { name: 'coffee' })).toHaveAttribute('aria-selected', 'true');
    const prices = (await page.locator('main article').allTextContents()).map((t) => parsePrice(t.match(/₹[\d,.]+/)![0]));
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('deep links work on refresh (SPA rewrites) and unknown routes show 404', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await page.goto('/my-orders');
    await expect(page.getByRole('heading', { name: 'My orders' })).toBeVisible();
    await page.goto('/order/000000000000000000000000');
    await expect(page.getByRole('alert')).toContainText('Order not found');
    await page.goto('/this/route/does/not/exist');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('admin pages require login', async ({ page }) => {
    await page.goto('/admin/orders?status=pending');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('cart totals and checkout validation (nothing is submitted)', async ({ page }) => {
    await skipWelcome(page, 4);
    await page.goto('/menu?table=4');
    const firstAdd = page.getByRole('button', { name: /^Add .* to cart$/ }).first();
    await firstAdd.click();
    await page.getByRole('main').getByRole('button', { name: /^Increase .* quantity$/ }).first().click();
    await cartButton(page, 2).click();
    const cart = page.getByRole('dialog', { name: 'Your cart' });
    const unit = parsePrice((await cart.getByText(/each$/).first().textContent())!);
    await expect(cart.getByTestId('cart-total')).toHaveText(new RegExp(`₹${(unit * 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`));

    await cart.getByRole('button', { name: /^Checkout/ }).click();
    const checkout = page.getByRole('dialog', { name: 'Checkout' });
    // Fresh browser context → no saved customer, so this submit is blocked client-side.
    await expect(checkout.getByLabel('Your name')).toHaveValue('');
    await checkout.getByRole('button', { name: /Place order/ }).click();
    await expect(checkout.getByText('Please enter your name')).toBeVisible();
    await expect(checkout.getByText('Enter a valid 10-digit mobile number')).toBeVisible();
    await expect(page).toHaveURL(/\/menu/); // still on the menu, no order placed
  });
});

test.describe('live site — full flow @write', () => {
  let token: string;
  test.beforeAll(async ({ request }) => {
    token = await loginToken(request);
  });
  test.afterAll(async ({ request }) => {
    await sweepTestData(request, token);
  });

  test('customer orders, sees live status updates, and finds it in My orders @write', async ({ page, request }) => {
    await skipWelcome(page, 9);
    await page.goto('/menu?table=9');
    await page.getByRole('button', { name: /^Add .* to cart$/ }).nth(0).click();
    await page.getByRole('button', { name: /^Add .* to cart$/ }).nth(0).click(); // next card (first now shows a stepper)
    await cartButton(page, 2).click();
    await page.getByRole('dialog', { name: 'Your cart' }).getByRole('button', { name: /^Checkout/ }).click();

    const checkout = page.getByRole('dialog', { name: 'Checkout' });
    await checkout.getByLabel('Your name').fill(TEST_DATA.customerName);
    await checkout.getByLabel('Mobile number').fill(TEST_DATA.phone);
    await checkout.getByLabel(/Notes for the kitchen/).fill('Automated E2E test order — please ignore');
    await checkout.getByRole('button', { name: /Place order/ }).click();

    await expect(page).toHaveURL(/\/order\/[a-f0-9]{24}$/);
    const orderId = page.url().split('/').pop()!;
    const orderNumber = (await page.getByTestId('order-number').textContent())!;
    expect(orderNumber).toMatch(/^ORD-[A-Z2-9]{6}$/);
    await expect(cartButton(page, 0)).toBeVisible();

    // Live updates over Socket.io (no reload).
    const step = page.getByRole('list', { name: 'Order progress' }).locator('[aria-current="step"]');
    await expect(step).toContainText('Received');
    for (const [status, label] of [
      ['preparing', 'Preparing'],
      ['ready', 'Ready'],
    ] as const) {
      const r = await request.patch(api(`/orders/${orderId}/status`), { headers: bearer(token), data: { status } });
      expect(r.ok()).toBe(true);
      await expect(step).toContainText(label);
    }
    await request.patch(api(`/orders/${orderId}/status`), { headers: bearer(token), data: { status: 'cancelled' } });
    await expect(page.getByText('This order was cancelled')).toBeVisible();

    // My orders by phone (prefilled from this device).
    await page.getByRole('link', { name: 'My orders' }).first().click();
    await expect(page.getByLabel('Mobile number')).toHaveValue(TEST_DATA.phone);
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByRole('link', { name: new RegExp(orderNumber) })).toBeVisible();
  });

  test('admin: login, dashboard, orders board status change @write', async ({ page, request }) => {
    const latte = (await (await request.get(api('/menu'), { params: { limit: 1 } })).json()).data[0];
    const placed = await request.post(api('/orders'), {
      data: { customer: { name: TEST_DATA.customerName, phone: TEST_DATA.phone, notes: 'Automated E2E test order' }, items: [{ menuItem: latte._id, quantity: 1 }] },
    });
    expect(placed.status()).toBe(201);
    const order = (await placed.json()).data;

    await loginViaForm(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Revenue', { exact: true }).first()).toBeVisible();

    await page.goto('/admin/orders?status=pending');
    const card = page.getByRole('article', { name: `Order ${order.orderNumber}` });
    await expect(card).toBeVisible();
    await card.getByRole('combobox', { name: `Status of ${order.orderNumber}` }).selectOption('cancelled');
    await expect.poll(async () => (await (await request.get(api(`/orders/${order._id}`))).json()).data.status).toBe('cancelled');
  });

  test('admin: menu item create → visible to customers → hide → delete @write', async ({ page, browser }) => {
    const name = itemName('UI Tart');
    await signInAsAdmin(page, token); // reuse the run's token; the form login is covered by the test above
    await page.goto('/admin/menu');
    await page.getByRole('button', { name: 'Add item' }).click();
    const form = page.getByRole('dialog', { name: 'New menu item' });
    await form.getByLabel('Name').fill(name);
    await form.getByLabel('Category').selectOption('desserts');
    await form.getByLabel('Price (₹)').fill('123');
    await form.getByRole('button', { name: 'Create item' }).click();
    await expect(form).toBeHidden();

    await page.getByRole('searchbox', { name: 'Search items' }).fill(name);
    const row = page.getByRole('row', { name: new RegExp(name.replace(/[[\]]/g, '\\$&')) });
    await expect(row).toContainText('₹123.00');

    const customerCtx = await browser.newContext();
    const customer = await customerCtx.newPage();
    await customer.goto(`${PROD.webUrl}/menu?q=${encodeURIComponent(name)}`);
    await expect(menuCardNames(customer)).toHaveText([name]);

    await row.getByRole('switch', { name: `Toggle availability of ${name}` }).click();
    await expect(row.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    await expect.poll(async () => {
      await customer.reload();
      return customer.getByText('No items found').isVisible();
    }).toBe(true);
    await customerCtx.close();

    await row.getByRole('button', { name: `Delete ${name}` }).click();
    await page.getByRole('dialog', { name: 'Delete item?' }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('No menu items')).toBeVisible();
  });

  test('no test data is left behind @write', async ({ request }) => {
    await sweepTestData(request, token);
    const items = (await (await request.get(api('/menu'), { params: { search: TEST_DATA.itemPrefix, available: 'all' } })).json()).data;
    expect(items.filter((i: { name: string }) => i.name.startsWith(TEST_DATA.itemPrefix))).toHaveLength(0);
    const orders = (await (await request.get(api('/orders'), { params: { phone: TEST_DATA.phone, limit: 100 } })).json()).data;
    expect(orders.filter((o: { status: string }) => o.status !== 'cancelled')).toHaveLength(0);
  });
});
