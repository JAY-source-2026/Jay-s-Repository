import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url).pathname,base='http://127.0.0.1:8000/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1,reducedMotion:'reduce'});
page.setDefaultTimeout(60000);
const errors=[],bad=[],results={layouts:[],ducts:[]};
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
const state=()=>page.evaluate(()=>window.systemExplorer.getState());
async function choose(id){await page.locator(`[data-certificate="${id}"]`).evaluate(el=>el.click());await page.waitForFunction(id=>document.querySelector('#systemKicker').textContent===id,id);}
async function blanket(ratio){return page.evaluate(async ratio=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261109r7');const d=SYSTEMS.duct,i=d.record.steps.findIndex(s=>s.kind==='blanket'),slot=d.timing.steps[i];window.systemExplorer.seek(slot.start+(slot.duration-.1)*ratio);return window.systemExplorer.getState();},ratio);}
async function layout(label){
 const result=await page.evaluate(label=>{const p=document.querySelector('.explorer-controls').getBoundingClientRect();return {label,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,controls:{left:p.left,right:p.right,bottom:p.bottom},buttons:[...document.querySelectorAll('.explorer-controls button')].map(b=>({text:b.textContent.trim(),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})),detailsBottom:document.getElementById('systemDetail').getBoundingClientRect().bottom};},label);
 assert.equal(result.overflow,false);assert.ok(result.controls.left>=0&&result.controls.right<=result.width+1);
 assert.equal(result.buttons.length,4);assert.ok(result.buttons.every(b=>b.height>=40&&b.width>=50));results.layouts.push(result);
}
try{
 await page.goto(base+'?v=20261109r7#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);console.log('3D ready');
 for(const id of (process.argv.includes('--quick')?['FS-MP25-0224-06']:['FS-MP25-0224-06','FS-MP26-0507-14','FS-MP26-0507-15'])){
  await choose(id);let s=await blanket(.5);assert.equal(s.architectureVisible,true);assert.equal(s.terrainVisible,true);assert.equal(s.visibleFloors.length,5);
  const title=await page.locator('#systemTitle').textContent();if(id==='FS-MP25-0224-06')assert.ok(title.endsWith('(보드 타입)'));if(id==='FS-MP26-0507-14')assert.ok(title.endsWith('(보드X 타입)'));
  for(const ratio of (process.argv.includes('--quick')?[.25,1]:[.5])){await blanket(ratio);await page.locator('#explorerPlayer').screenshot({path:out+id+'-wrap-'+Math.round(ratio*100)+'.png'});}
  await page.evaluate(()=>window.systemExplorer.seek(window.systemExplorer.getState().duration));await page.locator('#explorerPlayer').screenshot({path:out+id+'-complete.png'});
  results.ducts.push({id,title,state:await state()});console.log('duct',id);
 }
 await fs.writeFile(out+(process.argv.includes('--quick')?'quick-checks.json':'certificate-checks.json'),JSON.stringify({passed:true,...results,errors,bad},null,2)+'\n');
 if(!process.argv.includes('--quick')){
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#explorerOverview').evaluate(el=>el.click());await page.waitForFunction(()=>window.systemExplorer.getState().transition>=1);
  const before=await state();await page.locator('[data-system="duct"]').evaluate(el=>el.click());const start=await state();assert.equal(start.visibleFloors.length,5);assert.equal(start.architectureVisible,true);assert.equal(start.terrainVisible,true);assert.ok(start.transition<1);
  await page.waitForFunction(()=>window.systemExplorer.getState().elapsed>.15);await page.locator('#explorerPause').evaluate(el=>el.click());const held=await state();await page.waitForTimeout(250);assert.equal((await state()).elapsed,held.elapsed);results.buildingZoomAndAutoplay=true;
  await page.locator('#explorerPlay').evaluate(el=>el.click());await page.waitForFunction(t=>window.systemExplorer.getState().elapsed>t+.1,held.elapsed);await page.locator('#explorerPause').evaluate(el=>el.click());results.pauseAndResume=true;
  await page.locator('#explorerFullscreen').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='explorerPlayer');await page.locator('#explorerFullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);results.fullscreen=true;
  await page.emulateMedia({reducedMotion:'reduce'});await choose('FS-MP25-0224-06');await blanket(.5);
  for(const [width,height]of [[1366,650],[900,700],[390,844]]){await page.setViewportSize({width,height});await blanket(.5);await page.locator('#heroMedia').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('#siteHeader').offsetHeight-14,behavior:'instant'}));await layout('player');if(width>760)assert.ok(results.layouts.at(-1).detailsBottom<=height+1);}
  await page.screenshot({path:out+'mobile.png'});assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 }
 await fs.writeFile(out+(process.argv.includes('--quick')?'quick-checks.json':'visual-checks.json') ,JSON.stringify({passed:true,...results,errors,bad},null,2)+'\n');
}finally{await browser.close();}
