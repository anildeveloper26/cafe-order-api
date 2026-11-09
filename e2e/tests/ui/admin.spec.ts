import { expect, test } from '@playwright/test';
import { adminToken, auth, createMenuItem, findItem, placeOrder, uniqueName } from '../../fixtures/api';
import { ADMIN, API_URL } from '../../fixtures/env';
import { menuCardNames, signInAsAdmin, skipWelcome } from '../../fixtures/ui';

test.describe('admin auth', () => {
  test('guest is sent to login and returned to the requested URL', async ({ page }) => {
    await page.goto('/admin/orders?status=pending');
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');

    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin\/orders\?status=pending$/);
    await expect(page.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('pending');
  });

  test('logout ends the session', async ({ page, request }) => {
    await signInAsAdmin(page, await adminToken(request));
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('expired/invalid token is cleared on the first 401', async ({ page }) => {
    await signInAsAdmin(page, 'invalid.token.value');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe('admin pages', () => {
  let token: string;
  test.beforeEach(async ({ page, request }) => {
    token = await adminToken(request);
    await signInAsAdmin(page, token);
  });

  test('dashboard shows stats', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    for (const label of ['Revenue', 'Orders', 'Avg. order']) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top selling items' })).toBeVisible();
  });

  test('create → edit → toggle → delete a menu item, reflected on the customer menu', async ({ page, request, context }) => {
    const name = uniqueName('PW Mocha');
    await page.goto('/admin/menu');
    await page.getByRole('button', { name: 'Add item' }).click();
    const form = page.getByRole('dialog', { name: 'New menu item' });
    await form.getByRole('button', { name: 'Create item' }).click();
    await expect(form.getByText(/Name must be at least/)).toBeVisible();
    await form.getByLabel('Name').fill(name);
    await form.getByLabel('Category').selectOption('coffee');
    await form.getByLabel('Price (₹)').fill('199');
    await form.getByRole('button', { name: 'Create item' }).click();
    await expect(form).toBeHidden();

    await page.getByRole('searchbox', { name: 'Search items' }).fill(name);
    await expect(page).toHaveURL(/q=/);
    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row).toContainText('₹199.00');

    // Edit price
    await row.getByRole('button', { name: `Edit ${name}` }).click();
    const edit = page.getByRole('dialog', { name: 'Edit menu item' });
    await edit.getByLabel('Price (₹)').fill('209');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(row).toContainText('₹209.00');

    // Customer sees it with the new price
    const customer = await context.newPage();
    await skipWelcome(customer, 1);
    await customer.goto(`/menu?q=${encodeURIComponent(name)}`);
    await expect(menuCardNames(customer)).toHaveText([name]);
    await expect(customer.getByRole('main')).toContainText('₹209.00');

    // Toggle unavailable (optimistic) → persisted → hidden from customers
    await row.getByRole('switch', { name: `Toggle availability of ${name}` }).click();
    await expect(row.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    await expect.poll(async () => (await findItem(request, name)).isAvailable).toBe(false);
    await customer.reload();
    await expect(customer.getByText('No items found')).toBeVisible();

    // Delete with confirmation
    await row.getByRole('button', { name: `Delete ${name}` }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete item?' });
    await confirm.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('No menu items')).toBeVisible();
    const res = await request.get(`${API_URL}/menu`, { params: { search: name, available: 'all' } });
    expect((await res.json()).data).toHaveLength(0);
  });

  test('admin menu filters persist in the URL', async ({ page }) => {
    await page.goto('/admin/menu?category=desserts');
    await expect(page.getByRole('combobox', { name: 'Filter by category' })).toHaveValue('desserts');
    await expect(page.getByRole('row', { name: /Tiramisu/ })).toBeVisible(); // admins see unavailable items
  });

  test('orders board receives new orders live and updates status', async ({ page, request }) => {
    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();

    const item = await createMenuItem(request, token, { name: uniqueName('PW Live'), price: 60 });
    const order = await placeOrder(request, [{ menuItem: item._id, quantity: 1 }]);

    await expect(page.getByText(`New order ${order.orderNumber}`)).toBeVisible(); // toast via socket
    const card = page.getByRole('article', { name: `Order ${order.orderNumber}` });
    await expect(card).toBeVisible();

    await card.getByRole('combobox', { name: `Status of ${order.orderNumber}` }).selectOption('ready');
    await expect(card.locator('span', { hasText: /^ready$/ })).toBeVisible();
    await expect
      .poll(async () => (await (await request.get(`${API_URL}/orders/${order._id}`)).json()).data.status)
      .toBe('ready');

    // Status filter is reflected in the URL and survives reload
    await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('ready');
    await expect(page).toHaveURL(/status=ready/);
    await page.reload();
    await expect(page.getByRole('article', { name: `Order ${order.orderNumber}` })).toBeVisible();

    await request.delete(`${API_URL}/menu/${item._id}`, { headers: auth(token) });
  });
});
