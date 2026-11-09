import cron from 'node-cron';

/**
 * Render's free tier spins the service down after ~15 min without inbound traffic.
 * This job pings our own public health URL every 10 minutes to keep it awake.
 * Render sets RENDER_EXTERNAL_URL automatically; KEEP_ALIVE_URL can override it.
 * (A GitHub Actions cron in .github/workflows/keep-alive.yml does the same from outside.)
 */
export function startKeepAliveJob(): void {
  const base = process.env.KEEP_ALIVE_URL ?? process.env.RENDER_EXTERNAL_URL;
  if (!base) {
    console.log('Keep-alive job disabled (no RENDER_EXTERNAL_URL / KEEP_ALIVE_URL)');
    return;
  }
  const url = `${base.replace(/\/+$/, '')}/api/health`;

  cron.schedule('*/10 * * * *', async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      console.log(`[keep-alive] ${url} -> ${res.status}`);
    } catch (err) {
      console.error(`[keep-alive] ping failed: ${(err as Error).message}`);
    }
  });
  console.log(`Keep-alive job scheduled every 10 minutes -> ${url}`);
}
