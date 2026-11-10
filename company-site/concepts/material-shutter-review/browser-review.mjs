import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url).pathname, base='http://127.0.0.1:8000/';
const sources=JSON.parse(await fs.readFile(new URL('../shutter-certificates-review/sources/manifest.json',import.meta.url)));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1,reducedMotion:'reduce'});
page.setDefaultTimeout(60000);
const errors=[],bad=[],products=[],certificates=[],layouts=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
const dialog=page.locator('#materialDialog');
const close=async()=>{await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.body.style.position!=='fixed');};
const layout=async(label)=>{const result=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(result.overflow,false);layouts.push({label,...result});};
try{
 await page.goto(base+'?v=20261109r3#firestop',{waitUntil:'networkidle'});
 for(const key of ['board','jacket','sealant','blanket','band']){
  await page.locator(`.material-card[data-material="${key}"]`).click();await dialog.waitFor({state:'visible'});
  await page.waitForFunction(()=>{const i=document.querySelector('#materialDialogImage');return i.complete&&i.naturalWidth>0;});
  assert.equal(await page.locator('#materialDialogSource').count(),0);assert.equal(await dialog.getAttribute('data-product'),key);
  assert.ok(await page.locator('#materialDialogSpecs > div').count()>=4);
  assert.ok((await dialog.innerText()).includes('자세히 알아보기'));
  if(key==='blanket'){
   assert.equal(await page.locator('#materialDialogImage').evaluate(el=>getComputedStyle(el).translate),'-2%');
   await dialog.screenshot({path:out+'blanket-desktop.png'});
  }
  products.push({key,sourceRemoved:true,specsPreserved:true});await close();console.log('product',key);
 }
 for(const [width,height] of [[1366,650],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await page.locator('.material-card[data-material="blanket"]').click();
  await dialog.waitFor({state:'visible'});await layout('blanket-dialog');
  const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1);
  await dialog.screenshot({path:out+`blanket-${width}.png`});
  await page.locator('.material-dialog-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
  assert.equal(await dialog.getByText('제품 자료 출처',{exact:false}).count(),0);
  await close();await layout('material-cards');
 }
 await fs.writeFile(out+'product-checks.json',JSON.stringify({passed:true,products,layouts,errors,bad},null,2)+'\n');
 console.log('Product source removal and blanket layouts passed');
 await page.setViewportSize({width:1366,height:900});
 await page.goto(base+'archive.html?v=20261109r3#shutter/recognition',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelectorAll('.archive-subject').length===5);
 assert.equal(await page.locator('#archive-tab-recognition .tab-count').innerText(),'5');
 await page.locator('#archivePanel').screenshot({path:out+'shutter-list-desktop.png'});
 for(const item of sources.items){
  await page.locator(`.archive-subject[href*="certificate-${item.certificate.toLowerCase()}"]`).click();
  await page.waitForFunction(title=>document.querySelector('#archivePostTitle')?.textContent===title,item.title);
  assert.equal(await page.locator('.archive-download').getAttribute('download'),item.file.name);
  assert.equal(await page.locator('.archive-pdf-open').getAttribute('href'),item.file.href);
  const response=await page.request.get(base+item.file.href);assert.equal(response.status(),200);
  assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'),item.sourceSha256);
  assert.equal(await page.locator('.certificate-preview-button').count(),2);
  await page.locator('.certificate-preview-button').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.certificate-preview img')].every(i=>i.complete&&i.naturalWidth===1600));
  await page.locator('.certificate-preview-button').first().click();await page.locator('#lightbox.open').waitFor();
  await page.waitForFunction(()=>document.querySelector('#lbStage img')?.complete);
  await page.locator('#lbNext').click();assert.ok((await page.locator('#lbCount').innerText()).includes('2'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#lightbox').isVisible(),false);
  if(item.sourceNumber===1)await page.locator('#archivePanel').screenshot({path:out+'shutter-detail-desktop.png'});
  certificates.push({certificate:item.certificate,pdfHashMatches:true,previewPages:[1,3],lightboxWorks:true});console.log('certificate',item.certificate);
  await page.locator('.post-back').click();await page.waitForFunction(()=>document.querySelectorAll('.archive-subject').length===5);
 }
 for(const query of ['FDS-OTS26-0630-2','FDS OTS26 0630 2','투시형']){
  await page.locator('#archiveQuery').fill(query);await page.locator('#archiveQuery').press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('.archive-subject').length===1);
  assert.equal(await page.locator('.archive-subject').count(),1);
 }
 for(const [width,height] of [[390,844],[320,640]]){
  await page.setViewportSize({width,height});await page.goto(base+'archive.html?v=20261109r3#shutter/recognition',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelectorAll('.archive-subject').length===5);await layout('shutter-list');
  await page.locator('#archivePanel').screenshot({path:out+`shutter-list-${width}.png`});
  await page.locator('.archive-subject').last().click();await page.locator('.archive-download').waitFor();await layout('shutter-detail');
  await page.locator('.certificate-preview-button').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.certificate-preview img')].every(i=>i.complete&&i.naturalWidth===1600));
  await page.locator('#archivePanel').screenshot({path:out+`shutter-detail-${width}.png`});
 }
 const archive=await (await page.request.get(base+'assets/data/archive.json?v=20261109r3')).json();
 const counts=Object.fromEntries(['firestop','fireproof','shutter'].map(cat=>[cat,archive.items.filter(i=>i.cat===cat&&i.board==='recognition').length]));
 assert.deepEqual(counts,{firestop:60,fireproof:1,shutter:5});assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'checks.json',JSON.stringify({passed:true,products,certificates,layouts,counts,searches:['exact code','spaced code','Korean title'],errors,bad},null,2)+'\n');
 console.log('All 5 shutter PDFs, previews, search and mobile layouts passed');
}finally{await browser.close();}
