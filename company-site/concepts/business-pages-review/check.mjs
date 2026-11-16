// 사업영역 4개 페이지 검수. 사용: node check.mjs <playwright index.mjs 경로> <출력 폴더> [base]
const {chromium} = await import(process.argv[2]);
const out = process.argv[3], base = process.argv[4] || 'http://127.0.0.1:8000/';
const pages = ['business-firestop', 'business-fireproof', 'business-shutter', 'business-software'];
const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
const result = {};
for (const [name, w, h] of [['pc', 1366, 768], ['mobile', 390, 844], ['small', 320, 700]]) {
  const context = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1});
  await context.route(/google|clarity|bing/, r => r.abort());
  const page = await context.newPage();
  for (const pg of pages) {
    const errors = [];
    const onErr = e => errors.push(e.message);
    const onRes = r => { if (!/google|clarity|bing/.test(r.url()) && r.status() >= 400) errors.push(r.status() + ' ' + r.url()); };
    page.on('pageerror', onErr); page.on('response', onRes);
    await page.goto(base + pg + '.html', {waitUntil: 'networkidle'});
    await page.evaluate(async () => { for (const i of document.images) { i.loading = 'eager'; } await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); });
    await page.waitForTimeout(500);
    const r = {};
    r.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    r.wide = await page.evaluate(() => [...document.querySelectorAll('#main *')].filter(e => !e.closest('.biz-tabs-list') && !e.closest('.biz-field-media') && e.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map(e => e.className || e.tagName));
    r.brokenImages = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src')));
    r.h1 = await page.evaluate(() => document.querySelector('h1').textContent);
    r.dashes = await page.evaluate(() => (document.querySelector('#main').innerText.match(/[—–]/g) || []).length);
    r.current = await page.evaluate(() => document.querySelector('.biz-tabs a[aria-current]')?.textContent);
    r.links = await page.evaluate(() => [...new Set([...document.querySelectorAll('#main a')].map(a => a.getAttribute('href')))]);
    r.errors = errors;
    await page.screenshot({path: `${out}/${name}-${pg}.png`, fullPage: true});
    result[name + ' ' + pg] = r;
    page.off('pageerror', onErr); page.off('response', onRes);
  }
  if (name === 'pc') {
    result.menus = {};
    for (const p of ['index.html?intro=off', 'about.html', 'archive.html', 'support.html', 'regulation.html', 'business-firestop.html']) {
      await page.goto(base + p, {waitUntil: 'domcontentloaded'});
      result.menus[p] = await page.evaluate(() => [...document.querySelectorAll('.nav-item[data-nav="business"] a, .mnav-group:nth-child(2) a')].map(a => a.getAttribute('href')).join(' '));
    }
    await page.hover('.nav-item[data-nav="business"] .nav-top'); await page.waitForTimeout(600);
    await page.screenshot({path: `${out}/pc-menu.png`});
  }
  await context.close();
}
console.log(JSON.stringify(result, null, 1));
await browser.close();
