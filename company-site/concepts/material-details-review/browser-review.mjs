import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1,reducedMotion:'reduce'});page.setDefaultTimeout(90000);
const errors=[],bad=[],navigations=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});page.on('response',r=>{if(r.url().includes('127.0.0.1:8000')&&r.status()>=400)bad.push(r.url());});page.on('popup',p=>navigations.push(p.url()));
const dialog=page.locator('#materialDialog');
try{
 await page.goto('http://127.0.0.1:8000/?v=20261109r2#firestop',{waitUntil:'networkidle'});
 await page.locator('#firestop').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.querySelectorAll('.material-card img')].every(i=>i.complete&&i.naturalWidth>0));
 await page.locator('#firestop').screenshot({path:out+'desktop-materials.png'});
 const products=[];
 for(const [key,code]of [['board','SFB-100F'],['jacket','SFBA-200'],['sealant','SFS-100'],['blanket','SFI-100'],['band','SFBA-120']]){
  const card=page.locator(`.material-card[data-material="${key}"]`);await card.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY),url=page.url();
  await card.locator('img').click();await dialog.waitFor({state:'visible'});assert.equal(await page.locator('#materialDialogCode').innerText(),code);
  await page.waitForFunction(()=>document.querySelector('#materialDialogImage').complete&&document.querySelector('#materialDialogImage').naturalWidth>0);
  assert.equal(await page.locator('#materialDialogSpecs > div').count()>=4,true);assert.equal(page.url(),url);
  assert.equal(await page.evaluate(()=>document.body.style.position),'fixed');const lockedY=await page.evaluate(()=>-parseFloat(document.body.style.top));
  await dialog.screenshot({path:out+`desktop-${key}.png`});
  await page.keyboard.press('Tab');for(let i=0;i<4;i++){assert.equal(await page.evaluate(()=>document.querySelector('#materialDialog').contains(document.activeElement)),true);await page.keyboard.press('Tab');}
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.body.style.position!=='fixed');
  assert.equal(await card.evaluate(el=>el===document.activeElement),true);const restored=await page.evaluate(()=>scrollY);console.log('scroll',key,{before,lockedY,restored});assert.ok(Math.abs(restored-lockedY)<3);
  products.push({key,code,focusRestored:true,scrollRestored:true,noNavigation:true});console.log(key);
 }
 // Keyboard opening, clicking content, and both explicit and backdrop closing.
 const card=page.locator('.material-card[data-material="board"]');await card.focus();await page.keyboard.press('Enter');await dialog.waitFor({state:'visible'});
 await page.locator('#materialDialogSummary').click();assert.equal(await dialog.isVisible(),true);await page.locator('.material-dialog-close').click();await dialog.waitFor({state:'hidden'});
 await card.focus();await page.keyboard.press('Space');await dialog.waitFor({state:'visible'});await page.mouse.click(4,4);await dialog.waitFor({state:'hidden'});
 const layouts=[];
 for(const [width,height]of [[1366,650],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await page.locator('.material-card[data-material="blanket"]').click();await dialog.waitFor({state:'visible'});
  const layout=await page.evaluate(()=>{const d=document.querySelector('#materialDialog'),r=d.getBoundingClientRect(),s=document.querySelector('.material-dialog-scroll'),c=document.querySelector('.material-dialog-close').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,dialogOverflow:d.scrollWidth>d.clientWidth+1,inViewport:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,closeVisible:c.top>=0&&c.bottom<=innerHeight,canScroll:s.scrollHeight>s.clientHeight};});
  assert.equal(layout.overflow,false);assert.equal(layout.dialogOverflow,false);assert.equal(layout.inViewport,true);assert.equal(layout.closeVisible,true);assert.equal(layout.canScroll,true);
  await dialog.screenshot({path:out+`dialog-${width}.png`});
  await page.locator('.material-dialog-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
  const note=await page.locator('#materialDialogNote').boundingBox();assert.ok(note.y+note.height<=height+1);await dialog.screenshot({path:out+`dialog-${width}-scrolled.png`});
  await page.locator('.material-dialog-close').click();await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.body.style.position!=='fixed');await page.evaluate(()=>scrollTo({top:document.querySelector('#firestop').getBoundingClientRect().top+scrollY-document.querySelector('#siteHeader').offsetHeight,behavior:'instant'}));await page.screenshot({path:out+`materials-${width}.png`});layouts.push({width,height,...layout});console.log('layout',width);
 }
 // Existing 3D material thumbnails use the same dialog; retained jacket remains intact.
 await page.setViewportSize({width:1280,height:900});await page.locator('#technology').scrollIntoViewIfNeeded();await page.waitForFunction(()=>window.systemExplorer);
 await page.locator('[data-certificate="FS-NP25-0224-05"]').evaluate(el=>el.click());
 const state=await page.evaluate(()=>{window.systemExplorer.seek(999);return window.systemExplorer.getState();});
 assert.ok(state.construction.polymer.filter(p=>p.component==='jacket-clamp').every(p=>p.wingBoltCount===2&&p.screwsFixed));
 const mini=page.locator('#systemMaterials [data-material="jacket"]');await mini.click();await dialog.waitFor({state:'visible'});assert.equal(await page.locator('#materialDialogCode').innerText(),'SFBA-200');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.style.position!=='fixed');assert.equal(await mini.evaluate(el=>el===document.activeElement),true);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(navigations,[]);
 await fs.writeFile(out+'checks.json',JSON.stringify({passed:true,products,layouts,keyboard:true,backdrop:true,miniMaterialDialog:true,jacketPreserved:true,errors,bad,navigations},null,2)+'\n');console.log('All product dialog checks passed');
}finally{await browser.close();}
