/** Capture the current product explorer for visual review.
 * Install playwright-core in a temporary directory and set CHROME to its browser.
 * Start a static server with company-site as the document root, then run this script.
 * This writes review images to OUT_DIR (default: /tmp/doenc-review), not old film posters.
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const url = process.env.URL || 'http://127.0.0.1:8000/';
const out = process.env.OUT_DIR || '/tmp/doenc-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route(/googletagmanager|clarity\.ms/, route => route.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.systemExplorer, null, { timeout: 60000 });
  await page.locator('#heroMedia').screenshot({ animations: 'disabled', path: join(out, 'overview.png') });
  for (const [id, time] of [['metal', 12.5], ['polymer', 9], ['duct', 14.8], ['shutter', 9]]) {
    await page.locator(`[data-system="${id}"]`).click();
    await page.evaluate(t => window.systemExplorer.seek(t), time);
    await page.locator('#heroMedia').screenshot({ animations: 'disabled', path: join(out, `${id}.png`) });
  }
  console.log(`Explorer captures saved to ${out}`);
} finally {
  await browser.close();
}
