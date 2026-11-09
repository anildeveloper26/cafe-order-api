import { defineConfig, devices } from '@playwright/test';
import { PROD } from './fixtures/prod';

/**
 * End-to-end tests against a DEPLOYED environment (default: the live Vercel + Render app).
 * Run via ../run-prod-e2e.sh. Tests tagged @write create data and clean it up afterwards.
 */

// Let the shared helpers in fixtures/api.ts talk to the deployed API with the deployed admin.
process.env.E2E_API_URL = PROD.apiUrl;
if (PROD.adminEmail) process.env.E2E_ADMIN_EMAIL = PROD.adminEmail;
if (PROD.adminPassword) process.env.E2E_ADMIN_PASSWORD = PROD.adminPassword;

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/prod',
  globalSetup: './tests/prod/global-setup.ts',
  globalTeardown: './tests/prod/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results-prod',
  reporter: isCI ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-prod' }]] : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-prod' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'prod-api', testMatch: /api\.prod\.spec\.ts/, use: { baseURL: `${PROD.apiUrl}/` } },
    { name: 'prod-ui', testMatch: /ui\.prod\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: PROD.webUrl } },
  ],
});
