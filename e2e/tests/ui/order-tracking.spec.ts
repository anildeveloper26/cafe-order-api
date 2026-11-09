import { expect, test } from '@playwright/test';
import { adminToken, findItem, placeOrder, setOrderStatus } from '../../fixtures/api';
import { API_URL } from '../../fixtures/env';

test('order page updates live when the kitchen changes the status', async ({ page, request }) => {
  const latte = await findItem(request, 'Cafe Latte', 'true');
  const order = await placeOrder(request, [{ menuItem: latte._id, quantity: 2 }]);
  const token = await adminToken(request);

  await page.goto(`/order/${order._id}`);
  await expect(page.getByTestId('order-number')).toHaveText(order.orderNumber);
  const progress = page.getByRole('list', { name: 'Order progress' });
  await expect(progress.locator('[aria-current="step"]')).toContainText('Received');

  for (const [status, label] of [
    ['preparing', 'Preparing'],
    ['ready', 'Ready'],
    ['completed', 'Served'],
  ] as const) {
    await setOrderStatus(request, token, order._id, status);
    await expect(progress.locator('[aria-current="step"]')).toContainText(label); // no reload
  }

  await setOrderStatus(request, token, order._id, 'cancelled');
  await expect(page.getByText('This order was cancelled')).toBeVisible();
});

test('unknown order shows an error with retry', async ({ page }) => {
  await page.goto('/order/000000000000000000000000');
  await expect(page.getByRole('alert')).toContainText('Order not found');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(API_URL).toContain('/api');
});
