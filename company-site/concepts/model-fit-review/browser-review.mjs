import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspaces/Jay-s-Repository/company-site/concepts/model-fit-review';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.5,reducedMotion:'reduce'});page.setDefaultTimeout(90000);
const errors=[],bad=[];page.on('crash',()=>console.log('PAGE CRASH'));browser.on('disconnected',()=>console.log('browser disconnected'));page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8000/')&&r.status()>=400)bad.push(r.url());});
const results={};
try{
 await page.goto('http://127.0.0.1:8000/?v=20261105r6#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);
 const select=async id=>page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());
 const seek=async t=>page.evaluate(t=>{window.systemExplorer.seek(t);return window.systemExplorer.getState();},t);
 const shot=async name=>{await page.locator('#heroMedia').screenshot({path:out+'/'+name+'.png'});console.log(name);};
 const kind=async(k,p=.5)=>page.evaluate(async({k,p})=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261105r6');const d=SYSTEMS[window.systemExplorer.getState().selected],i=d.record.steps.findIndex(s=>s.kind===k),t=d.timing.steps[i];window.systemExplorer.seek(t.start+t.duration*p);return window.systemExplorer.getState();},{k,p});
 assert.equal(await page.locator('[data-certificate]').count(),60);
 await select('FS-MP25-1218-11');let floor=await seek(999);assert.equal(floor.cutawayBay,'metal');await shot('floor-large');
 await select('FS-NP24-0617-11');const lower=await kind('jacket',.25);await shot('floor-jacket-open');assert.ok(lower.camera[1]<lower.target[1]);
 await select('FS-MP25-0224-06');let s=await page.evaluate(()=>window.systemExplorer.getState());assert.equal(s.elapsed,0);assert.equal(s.floors.find(f=>f.id==='duct').installed,0);results.ductInitial=true;
 await page.evaluate(()=>{window.systemExplorer.overview();window.systemExplorer.preview('duct');});s=await page.evaluate(()=>window.systemExplorer.getState());assert.equal(s.mode,'preview');assert.equal(s.floors.find(f=>f.id==='duct').installed,0);assert.equal(s.routeVisibility.duct,false);results.ductPreview=true;
 await select('FS-MP25-0224-06');s=await kind('board',.2);const pieces=s.construction.duct.filter(p=>p.component==='board-piece');assert.equal(pieces.length,20);assert.ok(pieces.some(p=>p.visible&&p.offset.some(v=>Math.abs(v)>.01)));s=await kind('board',.98);assert.ok(s.construction.duct.filter(p=>p.component==='board-piece').every(p=>p.visible&&p.offset.every(v=>Math.abs(v)<.001)));results.ductPieces=20;
 await select('FS-MP24-0617-21');s=await seek(0);assert.equal(s.assemblies.metal.existingInsulation,true);assert.match(await page.locator('#systemSteps button').nth(2).getAttribute('title'),/기존 은박/);results.existingInsulation=true;
 await select('FS-NP24-0617-5');const opened=await kind('jacket',.25),closed=await kind('jacket',.99);assert.ok(opened.construction.polymer.filter(p=>p.component==='jacket-clamp').every(p=>p.openAngle>1&&!p.latched));assert.ok(closed.construction.polymer.filter(p=>p.component==='jacket-clamp').every(p=>p.openAngle===0&&p.latched));results.jacket=true;
 const layouts=[];
 for(const [width,height]of [[1366,650],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await select('FS-MP25-1218-05');await seek(999);
  const l=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overlap:document.querySelector('#installationCaption').getBoundingClientRect().bottom>document.querySelector('#hero3d').getBoundingClientRect().top+1}));assert.equal(l.overflow,false);assert.equal(l.overlap,false);layouts.push({width,height,...l});
 }
 console.log('static checks passed');await page.setViewportSize({width:1440,height:1000});await select('FS-NP24-0617-5');await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#explorerReplay').evaluate(b=>b.click());await page.evaluate(()=>scrollTo({top:document.querySelector('#hero3d').getBoundingClientRect().top+scrollY-120,behavior:'instant'}));
 await page.waitForFunction(()=>window.systemExplorer.getState().elapsed>2.5);const liveOpen=await page.evaluate(()=>window.systemExplorer.getState());assert.ok(liveOpen.construction.polymer.some(p=>p.component==='jacket-clamp'&&p.visible&&!p.latched));
 await page.waitForFunction(()=>window.systemExplorer.getState().construction.polymer.filter(p=>p.component==='jacket-clamp').every(p=>p.latched));await page.evaluate(()=>window.systemExplorer.stop());results.liveJacket=true;
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'/checks.json',JSON.stringify({passed:true,...results,layouts,errors,bad},null,2)+'\n');console.log('browser acceptance passed',results);
}finally{await browser.close();}
