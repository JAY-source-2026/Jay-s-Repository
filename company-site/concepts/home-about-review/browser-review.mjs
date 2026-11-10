import { chromium } from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:8000/';
const out = new URL('./', import.meta.url).pathname;
const source = JSON.parse(await fs.readFile(out + 'sources/history.json', 'utf8'));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(25000);
const errors = [], failedResponses = [], layouts = [], jumps = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) failedResponses.push({ url: r.url(), status: r.status() }); });

async function layout(label) {
  const item = await page.evaluate(label => ({ label, width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth }), label);
  assert.ok(item.scrollWidth <= item.width, JSON.stringify(item));
  layouts.push(item);
}
async function jump(selector, id) {
  await page.locator(selector).click();
  await page.waitForFunction(id => location.hash === '#' + id, id);
  await page.waitForFunction(id => {
    const target = document.getElementById(id).getBoundingClientRect();
    return target.top >= 0 && target.top < innerHeight / 2;
  }, id);
  jumps.push({ width: await page.evaluate(() => innerWidth), target: id });
}
try {
  await page.goto(base + '?v=20261109r4', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#signatureProductScene')?.classList.contains('is-ready'));
  assert.equal((await page.locator('.signature-primary').innerText()).replace(/\s+/g, ' '), '인정서별 시공방법 보기 ↓');
  assert.equal(await page.locator('#technical').count(), 0);
  assert.equal(await page.getByText('도면으로 확인하는 기술.', { exact: true }).count(), 0);
  for (const [width, height] of [[1920, 1080], [1366, 768], [1180, 768], [900, 700], [390, 844], [320, 640]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await layout('home');
    for (const selector of ['.signature-primary', '.signature-category-link[href="#firestop"]', '.signature-category-link[href="#shutter"]']) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
      assert.equal(await page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth), true);
    }
    if ([1366, 390].includes(width)) await page.screenshot({ path: out + `home-${width}.png`, fullPage: false });
    await jump('.signature-category-link[href="#firestop"]', 'firestop');
    await page.locator('.material-card[data-material="board"]').click();
    await page.locator('#materialDialog').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.locator('#materialDialog').waitFor({ state: 'hidden' });
    await jump('.signature-category-link[href="#shutter"]', 'shutter');
    assert.equal(await page.locator('#shutter video').count(), 1);
    await jump('.signature-primary', 'technology');
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('#signatureShutterHeading').click();
  await page.waitForFunction(() => document.querySelector('#signatureShutter').classList.contains('is-active'));
  await page.locator('[data-shutter-select="wire"]').click();
  await page.locator('#signatureShutterWatch').click();
  await page.waitForFunction(() => document.querySelector('#signatureVideo').currentSrc.includes('wire-shutter-operation.mp4'));
  await page.locator('#signatureShutterBack').click();
  assert.equal(await page.locator('#signatureVideo').evaluate(el => el.paused), true);

  await page.goto(base + 'about.html?v=20261109r4', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.page-head').count(), 0);
  assert.equal(await page.getByText('화재로부터 보다 안전한', { exact: false }).count(), 0);
  const history = await page.locator('#history .tl-year').evaluateAll(rows => rows.map(row => ({ year: Number(row.querySelector('h3').textContent), events: [...row.querySelectorAll('.tl-list span')].map(el => el.textContent) })));
  assert.deepEqual(history, source.history);
  assert.equal(await page.locator('#history .tl-list em').count(), 0);
  for (const [width, height] of [[1920, 1080], [1366, 768], [900, 700], [390, 844], [320, 640]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await layout('about');
    const widths = await page.locator('#main .sec > .wrap').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { width: r.width, left: r.left, right: r.right }; }));
    assert.ok(widths.every(r => r.width === widths[0].width && r.left === widths[0].left));
    assert.ok(widths.every(r => r.width <= 1120 && Math.abs(r.left - (width - r.right)) < 1));
    assert.ok((await page.locator('.ceo-section-head').boundingBox()).y >= (await page.locator('#siteHeader').boundingBox()).height);
    if ([1366, 390].includes(width)) await page.screenshot({ path: out + `about-ceo-${width}.png` });
    for (const id of ['history', 'certs', 'org', 'location']) {
      await page.locator('#' + id).evaluate(el => el.scrollIntoView());
      await page.waitForTimeout(200);
      await layout('about-' + id);
      if (['history', 'org', 'location'].includes(id) && [1366, 390].includes(width)) await page.screenshot({ path: out + `about-${id}-${width}.png` });
    }
    assert.equal(await page.locator('.org').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failedResponses, []);
  await fs.writeFile(out + 'checks.json', JSON.stringify({ passed: true, historyYears: history.length, events: history.reduce((n, y) => n + y.events.length, 0), jumps, layouts, errors, failedResponses }, null, 2) + '\n');
  console.log('Passed: anchor navigation, product detail, shutter media, catalog history, centered layouts, responsive overflow checks.');
} finally { await browser.close(); }
