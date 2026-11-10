import { chromium } from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base = process.argv[2] || 'http://127.0.0.1:8000/';
const label = process.argv[3] || 'local';
const out = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(60000);
const errors = [], bad = [], layouts = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) bad.push({ url: r.url(), status: r.status() }); });
try {
  await page.goto(base + '?v=20261110r1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#signatureProductScene')?.classList.contains('is-ready'));
  assert.equal(await page.locator('#signatureShutterWatch, #signatureShutterVideo, .signature-media-actions').count(), 0);
  const photo = page.locator('[data-shutter-photo="wire"] img');
  assert.equal(await photo.evaluate(el => el.complete && el.naturalWidth === 1400 && el.naturalHeight === 1050), true);
  const bytes = await (await page.request.get(new URL(await photo.getAttribute('src'), base).href)).body();
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, JSON.parse(await fs.readFile(out + 'backup.json')).source_sha256);
  for (const [width, height] of [[1366,768], [390,844], [320,640]]) {
    await page.setViewportSize({ width, height });
    for (const key of ['standard','large','steel','wire']) {
      await page.locator(`[data-shutter-select="${key}"]`).click();
      assert.equal(await page.locator(`[data-shutter-photo="${key}"]`).getAttribute('aria-hidden'), 'false');
      assert.equal(await page.locator(`[data-shutter-select="${key}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator(`[data-shutter-photo="${key}"] img`).evaluate(el => el.complete && el.naturalWidth > 0), true);
    }
    await page.evaluate(() => scrollTo(0,0));
    await page.screenshot({ path: out + `${label}-wire-${width}.png` });
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(layout.scrollWidth <= width); layouts.push(layout);
    for (const key of ['board','jacket','sealant','blanket','band']) {
      await page.locator(`[data-product-select="${key}"]`).click();
      assert.equal(await page.locator(`[data-product-select="${key}"]`).getAttribute('aria-pressed'), 'true');
    }
  }
  await page.setViewportSize({ width:1366, height:768 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('[data-shutter-select="wire"]').click();
  await page.waitForFunction(() => !document.querySelector('#signatureShutterScene').classList.contains('is-rolling'));
  assert.equal(await page.locator('[data-shutter-photo="wire"]').getAttribute('data-front'), 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-shutter-select="standard"]').focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('[data-shutter-select="large"]').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-shutter-select="large"]').getAttribute('aria-pressed'), 'true');
  await page.locator('.material-card[data-material="blanket"]').click();
  await page.locator('#materialDialog').waitFor({ state:'visible' });
  await page.keyboard.press('Escape');
  await page.locator('#materialDialog').waitFor({ state:'hidden' });
  await page.locator('.shutter-certificates summary').click();
  const links = await page.locator('.shutter-certificates a').evaluateAll(els => els.map(el => el.href));
  assert.equal(links.length,5);
  for (const href of links) { const r = await page.request.get(href); assert.equal(r.status(),200); assert.equal((await r.body()).subarray(0,4).toString(),'%PDF'); }
  assert.equal(await page.locator('#shutter video').count(),1);
  const videoUrl = await page.locator('#shutter video').evaluate(el => el.src);
  const videoResponse = await page.request.get(videoUrl);
  assert.equal(videoResponse.status(),200);
  assert.ok((await videoResponse.body()).includes(Buffer.from('ftyp')));
  console.log('Photo, menu, keyboard, details, five PDFs and video file checks passed');
  await page.locator('#technology').evaluate(el => el.scrollIntoView());
  await page.waitForFunction(() => !!window.systemExplorer);
  assert.equal(await page.locator('[data-certificate]').count(),60);
  await page.locator('[data-certificate="FS-MP26-0507-14"]').evaluate(el => el.click());
  const wrap = await page.evaluate(() => {
    window.systemExplorer.seek(999);
    return window.systemExplorer.getState().construction.duct.find(p => p.component === 'blanket-wrap');
  });
  const bands = await page.evaluate(() => window.systemExplorer.getState().openingBands);
  assert.equal(bands.photoLoaded,true);
  assert.ok(bands.assemblies.duct.every(b => b.wrapper === 'blue-printed-film'));
  assert.equal(wrap.throughSupport,true); assert.deepEqual(wrap.coverage,[-1.075,1.075]);
  await page.getByRole('button',{name:'건물 전체 보기'}).click();
  assert.equal(await page.evaluate(() => window.systemExplorer.getState().selected),null);
  console.log('3D initialization, through blanket and blue band checks passed');
  await page.goto(base + 'about.html', {waitUntil:'networkidle'});
  assert.ok(await page.locator('#history .tl-year').count() > 0);
  await page.goto(base + 'archive.html#shutter/recognition', {waitUntil:'networkidle'});
  assert.deepEqual(errors,[]); assert.deepEqual(bad,[]);
  await fs.writeFile(out + label + '-checks.json',JSON.stringify({passed:true,base,photoSha256:hash,layouts,shutterPhotos:4,productMenus:5,shutterCertificates:5,installationCertificates:60,throughBlanket:wrap,errors,bad},null,2)+'\n');
  console.log('PASS:', label, 'photo hash, responsive menus, keyboard, details, video, certificates, 3D and navigation');
} finally { await browser.close(); }
