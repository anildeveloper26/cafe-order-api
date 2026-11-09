/**
 * Starts an isolated backend for the E2E run:
 *   1. in-memory MongoDB (never touches Atlas or a local DB)
 *   2. seeds menu + admin via the real seed script
 *   3. runs the API with test env vars
 * Playwright's webServer launches this and kills it when the run ends.
 */
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '../..'); // repo root of cafe-order-api
const tsx = path.join(backendDir, 'node_modules/.bin/tsx');

const mongod = await MongoMemoryServer.create();
const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: '5055',
  MONGODB_URI: mongod.getUri('cafe_e2e'),
  CORS_ORIGIN: 'http://localhost:5175',
  JWT_SECRET: 'e2e-jwt-secret',
  JWT_EXPIRES_IN: '1h',
  ADMIN_EMAIL: 'admin@e2e.test',
  ADMIN_PASSWORD: 'e2e-admin-pass',
  ORDER_RATE_LIMIT: '100000',
  LOGIN_RATE_LIMIT: '100000',
};
delete env.KEEP_ALIVE_URL;
delete env.RENDER_EXTERNAL_URL;

const seed = spawnSync(tsx, ['src/seed/seed.ts', '--reset'], { cwd: backendDir, env, stdio: 'inherit' });
if (seed.status !== 0) {
  await mongod.stop();
  process.exit(seed.status ?? 1);
}

const api = spawn(tsx, ['src/server.ts'], { cwd: backendDir, env, stdio: 'inherit' });

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill('SIGTERM');
  await mongod.stop();
  process.exit(code);
}
api.on('exit', (code) => shutdown(code ?? 1));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
