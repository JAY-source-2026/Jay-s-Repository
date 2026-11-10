import { chromium } from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = 'https://jay-source-2026.github.io/Jay-s-Repository/company-site/';
const out = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 650 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(45000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(base + '?v=20261110r2#shutter', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#business').count(), 0);
  await page.locator('.shutter-videos summary').click();
  for (const key of ['standard', 'wire']) {
    await page.locator(`[data-shutter-video="${key}"]`).click();
    await page.waitForFunction(() => {
      const v = document.getElementById('shutterVideo');
      return !v.paused && v.currentTime > .2;
    });
    await page.locator('#shutterVideo').evaluate(el => el.pause());
  }
  await page.locator('#shutter').evaluate(el => el.scrollIntoView());
  await page.screenshot({ path: out + 'live-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-shutter-video="steel"]').click();
  assert.equal(await page.locator('#shutterVideoEmpty').isVisible(), true);
  assert.equal(await page.locator('#shutterVideo').getAttribute('src'), null);
  await page.locator('#shutter').evaluate(el => el.scrollIntoView());
  await page.screenshot({ path: out + 'live-mobile.png' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  await fs.writeFile(out + 'live-checks.json', JSON.stringify({ passed: true, base, playback: ['standard', 'wire'], pendingSelection: 'steel', deletedSection: true, mobileOverflow: false, errors }, null, 2) + '\n');
  console.log('Public menu, both videos, pending state and responsive display passed.');
} finally { await browser.close(); }
