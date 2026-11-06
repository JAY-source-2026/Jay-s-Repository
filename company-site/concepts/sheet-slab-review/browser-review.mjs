import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('.',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1366,height:900},deviceScaleFactor:.65,reducedMotion:'reduce'});page.setDefaultTimeout(120000);
const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>console.log('PAGE CRASH'));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8000/')&&r.status()>=400)bad.push(r.url());});
try{
 await page.goto('http://127.0.0.1:8000/?v=20261106r2#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);console.log('ready');
 const select=id=>page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());
 const seek=t=>page.evaluate(t=>{window.systemExplorer.seek(t);return window.systemExplorer.getState();},t);
 const shot=async name=>{await page.locator('#heroMedia').screenshot({path:out+name+'.png'});console.log(name);};
 const slot=kind=>page.evaluate(async kind=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261106r2');const d=SYSTEMS[window.systemExplorer.getState().selected],i=d.record.steps.findIndex(s=>s.kind===kind);return d.timing.steps[i];},kind);
 await select('FS-MP23-1103-3');let timing=await slot('blanket');
 const sheets=[];
 for(const ratio of [0,.5,.99]){const s=await seek(timing.start+timing.duration*ratio);sheets.push(s.construction.metal.filter(p=>p.component==='blanket-wrap'));await shot('sheet-'+ratio);}
 assert.ok(sheets[0].some(p=>p.visible&&p.wrapped===0));assert.ok(sheets[1].some(p=>p.visible&&p.wrapped>0&&p.wrapped<1));
 await select('FS-MP24-0617-17');await page.evaluate(()=>window.systemExplorer.overview());const overview=await page.evaluate(()=>window.systemExplorer.getState());assert.equal(overview.routeVisibility.metal,true);assert.equal(overview.routeVisibility.bundle,true);await shot('overview-connected');
 await select('FS-NP25-0224-05');timing=await slot('jacket');const lower=await seek(timing.start+timing.duration*.6);await shot('floor-lower');timing=await slot('blanket');const upper=await seek(timing.start+timing.duration*.6);await shot('floor-upper');assert.deepEqual(lower.camera,upper.camera);assert.equal(upper.assemblies.polymer.sectionSlabVisible,true);
 await select('FS-MP23-1103-2');await seek(999);await shot('floor-metal-below');
 await select('FS-MP26-0507-15');timing=await slot('blanket');await seek(timing.start+timing.duration*.5);await shot('duct-sheet');
 const layouts=[];
 for(const [width,height]of [[1366,650],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await select('FS-NP25-0224-05');await seek(999);
  const l=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overlap:document.querySelector('#installationCaption').getBoundingClientRect().bottom>document.querySelector('#hero3d').getBoundingClientRect().top+1}));assert.equal(l.overflow,false);assert.equal(l.overlap,false);layouts.push({width,height,...l});if(width===390)await shot('floor-mobile');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'checks.json',JSON.stringify({passed:true,sheets,overviewRoutes:overview.routeVisibility,floorCamera:{lower:lower.camera,upper:upper.camera},layouts,errors,bad},null,2)+'\n');console.log('Browser static checks passed');
}finally{await browser.close();}
