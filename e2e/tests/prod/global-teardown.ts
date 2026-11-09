import { request } from '@playwright/test';
import { hasAdminCreds, loginToken, PROD, sweepTestData } from '../../fixtures/prod';

/** Safety net: whatever happened in the run, leave no active test orders or [E2E] menu items behind. */
export default async function globalTeardown() {
  if (PROD.readOnly || !hasAdminCreds()) return;
  const ctx = await request.newContext();
  try {
    const summary = await sweepTestData(ctx, await loginToken(ctx));
    console.log('Test data cleanup:', summary);
  } finally {
    await ctx.dispose();
  }
}
