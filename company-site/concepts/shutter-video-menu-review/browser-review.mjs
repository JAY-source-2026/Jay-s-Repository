import { chromium } from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:8000/';
const out = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(30000);
const errors = [], bad = [], clips = [], layouts = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) bad.push({ url: r.url(), status: r.status() }); });
const keys = ['standard', 'large', 'wire', 'steel', 'vision'];
const expected = ['FDS-OTS24-0807-1', 'FDS-OTS25-0721-1', 'FDS-OTS26-0630-2', 'FDS-NVS24-0611-1', 'FDS-NVS26-0309-1'];
const choose = key => page.locator(`[data-shutter-video="${key}"]`).click();
const waitPlaying = () => page.waitForFunction(() => {
  const video = document.getElementById('shutterVideo');
  return !video.paused && video.currentTime > .15 && video.readyState >= 2;
});

try {
  await page.goto(base + '?v=20261110r2#shutter', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#business, .business-section').count(), 0);
  assert.equal(await page.locator('#shutter').evaluate(el => el.nextElementSibling.id), 'contact');
  assert.equal(await page.locator('[data-shutter-video]').count(), 5);
  assert.equal(await page.locator('#shutterVideo').evaluate(el => el.paused && el.readyState === 0), true);
  assert.equal(await page.locator('.shutter-videos').evaluate(el => el.nextElementSibling.classList.contains('shutter-certificates')), true);

  const summary = page.locator('.shutter-videos summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.shutter-videos').getAttribute('open'), '');
  for (const key of ['standard', 'wire']) {
    await choose(key);
    await waitPlaying();
    const clip = await page.locator('#shutterVideo').evaluate(el => ({ src: el.currentSrc, duration: el.duration, width: el.videoWidth, height: el.videoHeight, fit: getComputedStyle(el).objectFit }));
    assert.equal(clip.fit, 'contain');
    assert.ok(Math.abs(clip.duration - (key === 'wire' ? 140.033 : 47.292)) < .2);
    assert.ok(key === 'wire' ? clip.height > clip.width : clip.width > clip.height);
    clips.push({ key, ...clip });
  }
  console.log('Both footage files play with the original aspect ratios and durations.');

  for (const key of ['large', 'steel', 'vision']) {
    await choose(key);
    assert.equal(await page.locator('#shutterVideoEmpty').isVisible(), true);
    assert.equal(await page.locator('#shutterVideo').getAttribute('src'), null);
    assert.equal(await page.locator('#shutterVideo').evaluate(el => el.paused), true);
    assert.equal(await page.locator('#shutterVideoCertificate').textContent(), expected[keys.indexOf(key)]);
  }
  await page.evaluate(() => ['wire', 'standard', 'wire'].forEach(key => document.querySelector(`[data-shutter-video="${key}"]`).click()));
  await waitPlaying();
  assert.equal(await page.locator('#shutterVideoNotice').isHidden(), true);
  assert.equal(await page.locator('[data-shutter-video][aria-pressed="true"]').count(), 1);

  // Selecting with the keyboard starts the correct file as well.
  await page.locator('[data-shutter-video="standard"]').focus();
  await page.keyboard.press('Enter');
  await waitPlaying();
  await page.locator('#shutterVideo').evaluate(el => el.pause());
  await page.locator('.shutter-certificates summary').click();
  assert.equal(await page.locator('.shutter-videos').getAttribute('open'), null);
  const certificates = await page.locator('.shutter-certificates a').evaluateAll(els => els.map(el => ({ href: el.href, target: el.target })));
  assert.equal(certificates.length, 5);
  for (const [i, link] of certificates.entries()) {
    assert.ok(link.href.includes(expected[i]));
    assert.equal(link.target, '_blank');
    const response = await page.request.get(link.href);
    assert.equal(response.status(), 200);
    assert.equal((await response.body()).subarray(0, 4).toString(), '%PDF');
  }

  for (const [width, height] of [[1366, 768], [1366, 650], [390, 844], [320, 640]]) {
    await page.setViewportSize({ width, height });
    if (await page.locator('.shutter-videos').getAttribute('open') === null) await summary.click();
    await choose('wire');
    await waitPlaying();
    await page.locator('#shutterVideo').evaluate(el => el.pause());
    await page.locator('#shutter').evaluate(el => el.scrollIntoView());
    await page.screenshot({ path: out + `menu-${width}x${height}.png` });
    if (width < 760) {
      await choose('wire');
      await waitPlaying();
      await page.locator('#shutterVideo').evaluate(el => el.pause());
      await page.screenshot({ path: out + `player-${width}.png` });
    }
    const layout = await page.evaluate(() => {
      const player = document.querySelector('#shutterPlayer').getBoundingClientRect();
      const menu = document.querySelector('.shutter-videos').getBoundingClientRect();
      return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, player: { x: player.x, right: player.right, bottom: player.bottom, width: player.width }, menu: { x: menu.x, right: menu.right, bottom: document.querySelector('.shutter-certificates').getBoundingClientRect().bottom } };
    });
    assert.ok(layout.scrollWidth <= width);
    assert.ok(layout.player.x >= 0 && layout.player.right <= width);
    assert.ok(layout.menu.x >= 0 && layout.menu.right <= width);
    if (width > 760) {
      assert.ok(layout.player.bottom <= height + 1, JSON.stringify(layout));
      assert.ok(layout.menu.bottom <= height + 1, JSON.stringify(layout));
    }
    layouts.push(layout);
    await choose('steel');
    assert.equal(await page.locator('#shutterVideoEmpty').isVisible(), true);
    if (width === 390) await page.screenshot({ path: out + 'pending-390.png' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  console.log('Responsive menus, keyboard, empty states and all five certificate PDFs passed.');

  // A failed request exposes recovery without relabeling another clip.
  await page.route('**/wire-shutter-operation.mp4', route => route.abort());
  await choose('wire');
  await page.locator('#shutterVideoRetry').waitFor({ state: 'visible' });
  await page.unroute('**/wire-shutter-operation.mp4');
  await page.locator('#shutterVideoRetry').click();
  await waitPlaying();
  assert.equal(await page.locator('#shutterVideoNotice').isHidden(), true);
  await page.locator('#shutterVideo').evaluate(el => el.pause());

  await page.setViewportSize({ width: 1366, height: 768 });
  assert.equal(await page.locator('[data-product-select]').count(), 5);
  assert.equal(await page.locator('[data-shutter-select]').count(), 4);
  await page.locator('#technology').evaluate(el => el.scrollIntoView());
  await page.waitForFunction(() => !!window.systemExplorer);
  assert.equal(await page.locator('[data-certificate]').count(), 60);
  for (const name of ['index.html', 'about.html', 'archive.html', 'support.html']) {
    await page.goto(base + name, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('a[href="index.html#business"], a[href="index.html#fireproof"], a[href="index.html#software"]').count(), 0);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(bad, []);
  await fs.writeFile(out + 'checks.json', JSON.stringify({ passed: true, clips, layouts, certificates, unavailable: ['large', 'steel', 'vision'], keyboard: true, rapidSwitch: true, networkRecovery: true, preserved: { productMenus: 5, shutterPhotos: 4, installationCertificates: 60 }, errors, bad }, null, 2) + '\n');
  console.log('PASS: playback, recovery, navigation and existing product/3D menus.');
} finally {
  await browser.close();
}
