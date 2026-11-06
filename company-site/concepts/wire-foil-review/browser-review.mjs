import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('.',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.5,reducedMotion:'reduce'});page.setDefaultTimeout(90000);
const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8000/')&&r.status()>=400)bad.push(r.url());});
try{
 await page.goto('http://127.0.0.1:8000/?v=20261106r1#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);
 const select=async id=>page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());
 const seek=async t=>page.evaluate(t=>{window.systemExplorer.seek(t);return window.systemExplorer.getState();},t);
 const state=()=>page.evaluate(()=>window.systemExplorer.getState());
 const shot=async name=>{await page.locator('#heroMedia').screenshot({path:out+name+'.png'});console.log(name);};
 const fixing=()=>page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261106r1');const d=SYSTEMS[window.systemExplorer.getState().selected],i=d.record.steps.findIndex(s=>s.kind==='fixing'&&/철선|철사/.test(s.text.replace(/\s/g,'')));return d.timing.steps[i];});
 assert.equal(await page.locator('[data-certificate]').count(),60);
 await select('FS-MP23-1103-3');let slot=await fixing();
 const samples=[];
 for(const fraction of [.2,.5,.95,1]){
  const s=await seek(slot.start+slot.duration*fraction);samples.push({fraction,wires:s.construction.metal.filter(p=>p.component==='winding-wire')});await shot('wire-'+fraction);
 }
 assert.ok(samples[0].wires.some(w=>w.wrapped>0&&w.wrapped<1));assert.ok(samples[3].wires.every(w=>w.wrapped===1&&w.twisted===1));
 await select('FS-MP25-1218-01');await seek(999);await shot('short-blanket');
 await select('FS-MP25-0625-02');await seek(999);await shot('bundle');
 await select('FS-MP25-0224-06');await seek(999);await shot('duct-foil');
 await select('FS-MP26-0507-15');await seek(999);await shot('duct-wire');assert.equal((await state()).construction.duct.filter(p=>p.component==='winding-wire').length,20);
 const layouts=[];
 for(const [width,height]of [[1366,650],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await select('FS-MP25-1218-05');await seek(999);
  const l=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overlap:document.querySelector('#installationCaption').getBoundingClientRect().bottom>document.querySelector('#hero3d').getBoundingClientRect().top+1}));assert.equal(l.overflow,false);assert.equal(l.overlap,false);layouts.push({width,height,...l});if(width===390)await shot('mobile');
 }
 await page.setViewportSize({width:1366,height:900});await page.emulateMedia({reducedMotion:'no-preference'});
 console.log('Checking live zoom');
 await page.evaluate(()=>window.systemExplorer.overview());await page.waitForFunction(()=>window.systemExplorer.getState().transition===1);
 await select('FS-MP23-1103-3');await page.waitForTimeout(700);const zoom=await state();assert.equal(zoom.transitionSeconds,2.2);assert.ok(zoom.transition<1);assert.equal(zoom.elapsed,0);
 await page.waitForFunction(()=>window.systemExplorer.getState().transition===1&&window.systemExplorer.getState().elapsed>0);await page.evaluate(()=>window.systemExplorer.stop());
 slot=await fixing();await seek(slot.start);await page.evaluate(()=>window.systemExplorer.resume());await page.waitForFunction(()=>window.systemExplorer.getState().construction.metal.some(w=>w.component==='winding-wire'&&w.wrapped>.1&&w.wrapped<.95));const live=await state();
 console.log('Checking live wire finish');
 await page.waitForFunction(()=>window.systemExplorer.getState().construction.metal.filter(w=>w.component==='winding-wire').every(w=>w.twisted===1));await page.evaluate(()=>window.systemExplorer.stop());
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'checks.json',JSON.stringify({passed:true,zoom:{seconds:zoom.transitionSeconds,progressAt700ms:zoom.transition,elapsed:zoom.elapsed},liveWinding:live.construction.metal.filter(w=>w.component==='winding-wire'),samples,layouts,errors,bad},null,2)+'\n');console.log('Browser checks passed.');
}finally{await browser.close();}
