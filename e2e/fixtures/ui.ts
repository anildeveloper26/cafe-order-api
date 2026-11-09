import { expect, type Page } from '@playwright/test';
import { ADMIN } from './env';

/** Signs in by seeding the persisted auth store, skipping the login form. */
export async function signInAsAdmin(page: Page, token: string) {
  await page.addInitScript(
    ([t, email]) => localStorage.setItem('cafe-admin', JSON.stringify({ state: { token: t, email }, version: 0 })),
    [token, ADMIN.email],
  );
}

/** Marks a table's welcome pop-up as already seen for this session. */
export async function skipWelcome(page: Page, table: number) {
  await page.addInitScript((t) => sessionStorage.setItem(`cafe-welcome-${t}`, 'true'), table);
}

export const menuCardNames = (page: Page) => page.locator('main article h3');

export async function expectUrlParams(page: Page, expected: Record<string, string | null>) {
  await expect
    .poll(() => {
      const params = new URL(page.url()).searchParams;
      return Object.fromEntries(Object.keys(expected).map((k) => [k, params.get(k)]));
    })
    .toEqual(expected);
}

export const parsePrice = (text: string) => Number(text.replace(/[^\d.]/g, ''));
