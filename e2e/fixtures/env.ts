/** Ports chosen to avoid the dev servers (5001/5173) and macOS AirPlay (5000). */
export const API_PORT = 5055;
export const WEB_PORT = 5175;
export const API_ORIGIN = `http://localhost:${API_PORT}`;
export const API_URL = `${API_ORIGIN}/api`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

/** Overridable so the same helpers work against a deployed environment (see playwright.prod.config.ts). */
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.test',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'e2e-admin-pass',
};
