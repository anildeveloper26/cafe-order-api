import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { API_ORIGIN, API_URL, WEB_PORT, WEB_URL } from './fixtures/env';

const isCI = Boolean(process.env.CI);
// The frontend lives in its own repo; clone it next to this one or set WEB_DIR.
const WEB_DIR = process.env.WEB_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../cafe-order-web');

export default defineConfig({
  testDir: './tests',
  // Tests share one in-memory database; run serially for predictable state.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api', use: { baseURL: `${API_URL}/` } },
    { name: 'ui', testDir: './tests/ui', use: { ...devices['Desktop Chrome'], baseURL: WEB_URL } },
  ],
  webServer: [
    {
      command: 'node scripts/start-backend.mjs',
      url: `${API_ORIGIN}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      cwd: WEB_DIR,
      url: WEB_URL,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: API_URL, VITE_SOCKET_URL: API_ORIGIN, VITE_PUBLIC_URL: WEB_URL },
    },
  ],
});
