import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('.',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1366,height:900},deviceScaleFactor:.5});page.setDefaultTimeout(120000);
const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>console.log('Page crashed'));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8000/')&&r.status()>=400)bad.push(r.url());});
try{
 await page.goto('http://127.0.0.1:8000/?v=20261106r1#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);
 const state=()=>page.evaluate(()=>window.systemExplorer.getState());
 const select=async id=>page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());
 const seek=async t=>page.evaluate(t=>{window.systemExplorer.seek(t);return window.systemExplorer.getState();},t);
 await select('FS-MP23-1103-3');await page.waitForTimeout(700);const zoom=await state();assert.equal(zoom.transitionSeconds,2.2);assert.ok(zoom.transition<1);assert.equal(zoom.elapsed,0);
 await page.waitForFunction(()=>window.systemExplorer.getState().transition===1);await page.evaluate(()=>window.systemExplorer.stop());console.log('Final zoom passed');
 const slot=await page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261106r1');const d=SYSTEMS.metal,i=d.record.steps.findIndex(s=>s.kind==='fixing');return d.timing.steps[i];});
 await seek(slot.start);await page.evaluate(()=>window.systemExplorer.resume());
 await page.waitForFunction(()=>window.systemExplorer.getState().construction.metal.some(w=>w.component==='winding-wire'&&w.wrapped>.1&&w.wrapped<.95));const winding=await state();
 await page.waitForFunction(()=>window.systemExplorer.getState().construction.metal.filter(w=>w.component==='winding-wire').every(w=>w.twisted===1));await page.evaluate(()=>window.systemExplorer.stop());console.log('Final live winding passed');
 await page.locator('#heroMedia').screenshot({path:out+'final-pipe.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await select('FS-MP26-0507-15');const duct=await seek(999);assert.equal(duct.construction.duct.filter(w=>w.component==='winding-wire').length,20);await page.locator('#heroMedia').screenshot({path:out+'final-duct.png'});console.log('Final duct passed');
 const layouts=[];
 for(const [width,height]of [[1366,650],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await select('FS-MP25-1218-05');await seek(999);
  const l=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overlap:document.querySelector('#installationCaption').getBoundingClientRect().bottom>document.querySelector('#hero3d').getBoundingClientRect().top+1}));assert.equal(l.overflow,false);assert.equal(l.overlap,false);layouts.push({width,height,...l});
  if(width===390)await page.locator('#heroMedia').screenshot({path:out+'final-mobile.png'});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'final-checks.json',JSON.stringify({passed:true,zoom:{seconds:zoom.transitionSeconds,progressAt700ms:zoom.transition,elapsed:zoom.elapsed},liveWinding:winding.construction.metal.filter(w=>w.component==='winding-wire'),ductWires:20,layouts,errors,bad},null,2)+'\n');console.log('Final current-source browser checks passed.');
}finally{await browser.close();}
