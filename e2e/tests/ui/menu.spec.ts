import { expect, test } from '@playwright/test';
import { expectUrlParams, menuCardNames, parsePrice, skipWelcome } from '../../fixtures/ui';

test.describe('QR table flow', () => {
  test('welcome pop-up shows once per table per session', async ({ page }) => {
    await page.goto('/menu?table=4');
    const welcome = page.getByRole('dialog', { name: 'Table 4' });
    await expect(welcome).toBeVisible();
    await expect(welcome).toContainText('We bring your order to Table 4');
    await welcome.getByRole('button', { name: 'View menu' }).click();
    await expect(welcome).toBeHidden();

    await expect(page.getByRole('banner')).toContainText('Table 4');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'What would you like today?' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Table 4' })).toBeHidden();
  });

  test('root redirects to the menu', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/menu$/);
  });
});

test.describe('menu browsing', () => {
  test.beforeEach(async ({ page }) => {
    await skipWelcome(page, 2);
    await page.goto('/menu?table=2');
    await expect(menuCardNames(page).first()).toBeVisible();
  });

  test('search filters cards and is kept in the URL across reload', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search menu' }).fill('choc');
    await expectUrlParams(page, { q: 'choc', table: '2' });
    await expect(menuCardNames(page)).toHaveText(['Chocolate Brownie', 'Chocolate Shake']);

    await page.reload();
    await expect(page.getByRole('searchbox', { name: 'Search menu' })).toHaveValue('choc');
    await expect(menuCardNames(page)).toHaveCount(2);
  });

  test('category chip filters and persists in the URL', async ({ page }) => {
    await page.getByRole('tab', { name: 'tea' }).click();
    await expectUrlParams(page, { category: 'tea' });
    await expect(page.getByRole('tab', { name: 'tea' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/items? in tea/i)).toBeVisible();
    for (const name of await menuCardNames(page).allTextContents()) expect(['Masala Chai', 'Green Tea', 'Iced Lemon Tea']).toContain(name);

    await page.reload();
    await expect(page.getByRole('tab', { name: 'tea' })).toHaveAttribute('aria-selected', 'true');
  });

  test('sort by price high → low', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Sort by' }).selectOption('price_desc');
    await expectUrlParams(page, { sort: 'price_desc' });
    await expect(menuCardNames(page).first()).toHaveText('Margherita Pizza');
    const prices = (await page.locator('main article').allTextContents()).map((t) => parsePrice(t.match(/₹[\d,.]+/)![0]));
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('unavailable items are not shown', async ({ page }) => {
    await expect(menuCardNames(page)).not.toContainText(['Tiramisu']);
  });

  test('no results → empty state → clear filters keeps the table', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search menu' }).fill('zzzz-nothing');
    await expect(page.getByText('No items found')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expectUrlParams(page, { q: null, table: '2' });
    await expect(page.getByRole('searchbox', { name: 'Search menu' })).toHaveValue('');
    await expect(menuCardNames(page).first()).toBeVisible();
  });

  test('back/forward restores filters', async ({ page }) => {
    await page.getByRole('tab', { name: 'desserts' }).click();
    await expectUrlParams(page, { category: 'desserts' });
    await page.getByRole('link', { name: 'My orders' }).click();
    await expect(page).toHaveURL(/\/my-orders/);
    await page.goBack();
    await expect(page.getByRole('tab', { name: 'desserts' })).toHaveAttribute('aria-selected', 'true');
  });
});
