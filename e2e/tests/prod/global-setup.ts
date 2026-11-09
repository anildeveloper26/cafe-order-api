import { request } from '@playwright/test';
import { hasAdminCreds, loginToken, PROD, sweepTestData, warmUp } from '../../fixtures/prod';

export default async function globalSetup() {
  console.log(`\nTarget web: ${PROD.webUrl}\nTarget API: ${PROD.apiUrl}\nMode: ${PROD.readOnly ? 'read-only' : 'full flow (@write tests create and clean up test data)'}`);
  if (!PROD.readOnly && !hasAdminCreds()) {
    throw new Error('PROD_ADMIN_EMAIL and PROD_ADMIN_PASSWORD are required for the full flow. Set them (or e2e/.env.prod), or run with --read-only.');
  }
  const ctx = await request.newContext();
  try {
    const ms = await warmUp(ctx);
    console.log(`API healthy after ${(ms / 1000).toFixed(1)}s`);
    if (!PROD.readOnly) {
      const token = await loginToken(ctx);
      const swept = await sweepTestData(ctx, token); // leftovers from an interrupted earlier run
      if (swept.ordersCancelled || swept.itemsDeleted) console.log('Cleaned leftovers:', swept);
    }
  } finally {
    await ctx.dispose();
  }
}
