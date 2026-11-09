import { expect, test } from '@playwright/test';
import { adminToken } from '../../fixtures/api';
import { WEB_URL } from '../../fixtures/env';
import { signInAsAdmin } from '../../fixtures/ui';

test('table QR page renders one code per table linking to the menu', async ({ page, request }) => {
  await signInAsAdmin(page, await adminToken(request));
  await page.goto('/admin/qr?tables=3');
  const links = page.getByRole('link', { name: /Open menu for table \d+/ });
  await expect(links).toHaveCount(3);
  for (let t = 1; t <= 3; t++) {
    await expect(page.getByRole('link', { name: `Open menu for table ${t}` })).toHaveAttribute('href', `${WEB_URL}/menu?table=${t}`);
  }
});

test('legacy /qr redirects to the admin QR page', async ({ page }) => {
  await page.goto('/qr');
  await expect(page).toHaveURL(/\/admin\/(qr|login)/);
});

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/this/does/not/exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
