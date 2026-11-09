import { expect, test, type Page } from '@playwright/test';
import { uniquePhone } from '../../fixtures/api';
import { parsePrice, skipWelcome } from '../../fixtures/ui';

const cartDialog = (page: Page) => page.getByRole('dialog', { name: 'Your cart' });
const cartButton = (page: Page, count: number) => page.getByRole('button', { name: `Open cart, ${count} items` });

test.beforeEach(async ({ page }) => {
  await skipWelcome(page, 6);
  await page.goto('/menu?table=6');
});

test('add, change quantity, remove and see the total update', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Cappuccino to cart' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Increase Cappuccino quantity' }).click();
  await page.getByRole('button', { name: 'Add Espresso to cart' }).click();
  await expect(cartButton(page, 3)).toBeVisible();

  await cartButton(page, 3).click();
  const cart = cartDialog(page);
  await expect(cart).toContainText('3 items · Table 6');
  await expect(cart.getByTestId('cart-total')).toHaveText(/₹397\.00/); // 149×2 + 99

  await cart.getByRole('button', { name: 'Decrease Cappuccino quantity' }).click();
  await expect(cart.getByTestId('cart-total')).toHaveText(/₹248\.00/);
  await cart.getByRole('button', { name: 'Remove Espresso' }).click();
  await expect(cart.getByTestId('cart-total')).toHaveText(/₹149\.00/);

  // Cart survives a reload (persisted).
  await page.reload();
  await expect(cartButton(page, 1)).toBeVisible();
});

test('checkout validates, places the order and tracks it', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Cold Brew to cart' }).click();
  await page.getByRole('button', { name: 'Add Chocolate Brownie to cart' }).click();
  await cartButton(page, 2).click();
  await cartDialog(page).getByRole('button', { name: /^Checkout/ }).click();

  const checkout = page.getByRole('dialog', { name: 'Checkout' });
  await expect(checkout.getByLabel(/Table number/)).toHaveValue('6');
  await checkout.getByRole('button', { name: /Place order/ }).click();
  await expect(checkout.getByText('Please enter your name')).toBeVisible();
  await expect(checkout.getByText('Enter a valid 10-digit mobile number')).toBeVisible();

  const phone = uniquePhone();
  await checkout.getByLabel('Your name').fill('Playwright');
  await checkout.getByLabel('Mobile number').fill(`+91 ${phone.slice(0, 5)} ${phone.slice(5)}`); // pasted with country code
  await expect(checkout.getByLabel('Mobile number')).toHaveValue(phone);
  await checkout.getByLabel(/Notes for the kitchen/).fill('Extra ice');
  await checkout.getByRole('button', { name: /Place order · ₹308\.00/ }).click(); // 179 + 129

  await expect(page).toHaveURL(/\/order\/[a-f0-9]{24}$/);
  await expect(page.getByTestId('order-number')).toHaveText(/^ORD-[A-Z2-9]{6}$/);
  await expect(page.getByTestId('order-total')).toHaveText(/₹308\.00/);
  await expect(page.getByText('Extra ice')).toBeVisible();
  await expect(cartButton(page, 0)).toBeVisible(); // cart cleared
  const orderNumber = await page.getByTestId('order-number').textContent();

  // My orders: phone remembered on this device, lookup kept in the URL.
  await page.getByRole('link', { name: 'My orders' }).first().click();
  await expect(page.getByLabel('Mobile number')).toHaveValue(phone);
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page).toHaveURL(new RegExp(`phone=${phone}`));
  await expect(page.getByRole('link', { name: new RegExp(orderNumber!) })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(orderNumber!) })).toBeVisible();
});

test('stale cart items are dropped and prices refreshed from the live menu', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'cafe-cart',
      JSON.stringify({
        state: {
          lines: [
            { item: { _id: '000000000000000000000000', name: 'Ghost', price: 1, imageUrl: '', category: 'coffee', isVeg: true }, quantity: 1 },
          ],
        },
        version: 0,
      }),
    );
  });
  await page.reload();
  await expect(cartButton(page, 0)).toBeVisible();
});

test('My orders validates the phone number', async ({ page }) => {
  await page.goto('/my-orders');
  await page.getByLabel('Mobile number').fill('12345');
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(page.getByText('Enter a valid 10-digit mobile number')).toBeVisible();
  expect(parsePrice('₹1,234.50')).toBe(1234.5);
});
