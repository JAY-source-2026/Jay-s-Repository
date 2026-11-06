import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('.',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1366,height:900},deviceScaleFactor:.5});page.setDefaultTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8000/?v=20261106r2#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);
 await page.locator('[data-certificate="FS-MP23-1103-3"]').evaluate(b=>b.click());
 await page.waitForFunction(()=>window.systemExplorer.getState().transition===1);await page.evaluate(()=>window.systemExplorer.stop());
 const timing=await page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261106r2');const d=SYSTEMS.metal;return d.timing.steps[d.record.steps.findIndex(s=>s.kind==='blanket')];});
 const samples=[];
 await page.evaluate(t=>{window.systemExplorer.seek(t);window.systemExplorer.resume();},timing.start);
 for(const minimum of [.05,.4,.95]){
  await page.waitForFunction(minimum=>window.systemExplorer.getState().construction.metal.find(p=>p.component==='blanket-wrap').wrapped>=minimum,minimum);
  const s=await page.evaluate(()=>window.systemExplorer.getState());samples.push({elapsed:s.elapsed,blanket:s.construction.metal.find(p=>p.component==='blanket-wrap')});
 }
 await page.evaluate(()=>window.systemExplorer.stop());
 assert.ok(samples[0].blanket.wrapped<samples[1].blanket.wrapped);assert.ok(samples[0].blanket.flatLength>samples[1].blanket.flatLength);console.log('Live sheet winding passed');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-certificate="FS-MP26-0507-15"]').evaluate(b=>b.click());
 await page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261106r2');const d=SYSTEMS.duct,i=d.record.steps.findIndex(s=>s.kind==='blanket'&&s.lengthMm>1000),slot=d.timing.steps[i];window.systemExplorer.seek(slot.start+slot.duration*.46);});
 await page.locator('#heroMedia').screenshot({path:out+'duct-large-sheet.png'});
 await page.evaluate(()=>window.systemExplorer.seek(999));await page.locator('#heroMedia').screenshot({path:out+'duct-foil-complete.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'live-checks.json',JSON.stringify({passed:true,samples,errors},null,2)+'\n');console.log('Final live and duct checks passed');
}finally{await browser.close();}
