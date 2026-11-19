import { chromium } from '/tmp/doenc-shutter-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.REVIEW_URL || 'http://127.0.0.1:8000/';
const out='/workspaces/Jay-s-Repository/company-site/concepts/shutter-cover-review';
const label=base.startsWith('http://127.')?'local':'live';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
for (const width of [1366,390,320]) {
 const context=await browser.newContext({viewport:{width,height:width===1366?768:844},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?intro=off#shutter',{waitUntil:'networkidle'});
 await page.locator('.shutter-certificates summary').click();
 const ids=await page.locator('[data-shutter-certificate]').evaluateAll(nodes=>nodes.map(n=>n.dataset.shutterCertificate));assert.equal(ids.length,6);
 for(const id of ids){
  await page.locator(`[data-shutter-certificate="${id}"]`).click();
  await page.waitForFunction(()=>document.querySelectorAll('#shutterCertificatePages img').length===2 && document.getElementById('shutterCertificateView').getAttribute('aria-busy')==='false');
  const state=await page.evaluate(()=>{
   const imgs=[...document.querySelectorAll('#shutterCertificatePages img')];const [a,b]=imgs.map(n=>n.getBoundingClientRect());
   return {sideBySide:a.right<=b.left+1,loaded:imgs.every(n=>n.complete&&n.naturalWidth>0),videoPaused:document.getElementById('shutterVideo').paused,videoHidden:document.getElementById('shutterVideo').hidden,overflow:document.documentElement.scrollWidth>innerWidth};
  });assert.ok(state.sideBySide&&state.loaded&&state.videoPaused&&state.videoHidden&&!state.overflow,JSON.stringify(state));
  assert.equal(context.pages().length,1);
 }
 await page.locator('#shutterCertificateZoom').click();
 assert.equal(await page.locator('#shutterCertificateZoom').getAttribute('aria-pressed'),'true');
 assert.ok(await page.locator('#shutterCertificateScroll').evaluate(n=>n.scrollWidth>n.clientWidth));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#shutterCertificateZoom').click();
 await page.locator('#shutterPlayer').scrollIntoViewIfNeeded();
 await page.screenshot({path:`${out}/${label}-certificate-${width}.png`});
 await page.locator('.shutter-videos summary').click();
 await page.locator('[data-shutter-video="standard"]').click();
 await page.waitForFunction(()=>document.getElementById('shutterVideo').readyState>=2);
 assert.ok(await page.locator('#shutterCertificateView').evaluate(n=>n.hidden));
 assert.ok(await page.locator('#shutterVideo').isVisible());
 await page.locator('[data-shutter-video="large"]').click();
 assert.ok(await page.locator('#shutterVideoEmpty').isVisible());
 await page.locator('.shutter-certificates summary').click();
 await page.locator('[data-shutter-certificate]').first().focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelectorAll('#shutterCertificatePages img').length===2);
 for(const [board,count] of [['recognition',6],['promo',0],['other',2]]) {
  await page.goto(base+'archive.html#shutter/'+board,{waitUntil:'networkidle'});
  await page.waitForSelector('.archive-total');
  assert.equal(await page.locator('.archive-subject').count(),count);
  if(board==='recognition'){
   await page.locator('.archive-subject').first().click();
   assert.equal(await page.locator('.certificate-preview img').count(),2);
   await page.locator('.certificate-preview-button').first().click();
   assert.ok((await page.locator('body').innerText()).includes('1페이지와 2페이지'));
   await page.keyboard.press('Escape');
  }
  if(board==='other'){
   await page.locator('.archive-subject').first().click();
   const href=await page.locator('.archive-download').getAttribute('href');assert.ok(href.includes('shutter-manuals'));
   assert.equal((await context.request.get(base+href)).status(),200);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 results.push({width,certificates:6,sideBySide:true,zoom:true,videoSwitch:true,keyboard:true,archiveCounts:[6,0,2],errors});
 assert.deepEqual(errors,[]);
 await context.close();
}
// A delayed certificate load cannot overwrite a later video selection.
const page=await browser.newPage();
await page.route('**/assets/data/archive.json*',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue();});
await page.goto(base+'?intro=off#shutter',{waitUntil:'networkidle'});
await page.locator('.shutter-certificates summary').click();await page.locator('[data-shutter-certificate]').first().click();
await page.locator('.shutter-videos summary').click();await page.locator('[data-shutter-video="large"]').click();
await page.waitForTimeout(900);assert.ok(await page.locator('#shutterCertificateView').evaluate(n=>n.hidden));assert.ok(await page.locator('#shutterVideoEmpty').isVisible());
await browser.close();
await fs.writeFile(`${out}/${label}-checks.json`,JSON.stringify({passed:true,base,results,racePassed:true},null,2)+'\n');
console.log(JSON.stringify({passed:true,base,results,racePassed:true}));
