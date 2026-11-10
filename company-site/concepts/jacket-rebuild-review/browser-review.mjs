import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:.5,reducedMotion:'reduce'});page.setDefaultTimeout(90000);
const errors=[],bad=[];page.on('pageerror',e=>{errors.push(e.message);console.log('pageerror',e.message);});page.on('crash',()=>console.log('PAGE CRASH'));browser.on('disconnected',()=>console.log('browser disconnected'));page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1'))bad.push(r.url());});
try{
 for(const [name,size,t]of (process.argv.includes('--site-only')?[]:[['product-250',267,5.99],['product-open',267,1.2],['product-brackets',267,10.6],['product-50',60,10.6]])){
  await page.goto(`http://127.0.0.1:8000/concepts/jacket-rebuild-review/model-view.html?size=${size}&t=${t}`);await page.waitForFunction(()=>window.review);await page.screenshot({path:out+name+'.png'});console.log(name);
 }
 await page.goto('http://127.0.0.1:8000/?v=20261109r1#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.systemExplorer);
 const select=async id=>page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());
 const kind=async(k,p)=>page.evaluate(async({k,p})=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261109r1');const d=SYSTEMS[window.systemExplorer.getState().selected],i=d.record.steps.findIndex(s=>s.kind===k),t=d.timing.steps[i];window.systemExplorer.seek(t.start+t.duration*p);return window.systemExplorer.getState();},{k,p});
 const results=[];
 for(const id of ['FS-NP24-0617-5','FS-NP24-0617-1','FS-NP24-0617-10','FS-NP24-0617-11','FS-NP25-0224-05','FS-NP25-0625-04']){
  await select(id);let s=await kind('jacket',.15);assert.ok(s.construction[s.selected].filter(p=>p.component==='jacket-clamp').every(p=>!p.latched));
  await page.locator('#heroMedia').screenshot({path:out+id+'-open.png'});
  s=await kind('jacket',.999);
  if(id!=='FS-NP25-0625-04'){
   assert.ok(s.construction[s.selected].filter(p=>p.component==='jacket-clamp').every(p=>p.tightened&&!p.seated));
   s=await kind('brackets',.999);
  }
  assert.ok(s.construction[s.selected].filter(p=>p.component==='jacket-clamp').every(p=>p.screwsFixed));
  await page.locator('#heroMedia').screenshot({path:out+id+'-fixed.png'});results.push({id,jackets:s.construction[s.selected].filter(p=>p.component==='jacket-clamp')});console.log(id);
 }
 const layouts=[];
 for(const [width,height]of [[1366,650],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await select('FS-NP24-0617-5');await kind('brackets',.999);
  const l=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overlap:document.querySelector('#installationCaption').getBoundingClientRect().bottom>document.querySelector('#hero3d').getBoundingClientRect().top+1}));assert.equal(l.overflow,false);assert.equal(l.overlap,false);layouts.push({width,height,...l});
  await page.locator('#heroMedia').screenshot({path:out+`layout-${width}.png`});
 }
 await page.setViewportSize({width:1280,height:900});await select('FS-NP24-0617-5');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#explorerReplay').evaluate(b=>b.click());
 await page.locator('#hero3d').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>window.systemExplorer.getState().construction.polymer.some(p=>p.component==='jacket-clamp'&&p.visible&&p.stage==='wrap'));
 await page.waitForFunction(()=>window.systemExplorer.getState().construction.polymer.some(p=>p.component==='jacket-clamp'&&p.visible&&p.stage==='wing-nuts'));
 await page.waitForFunction(()=>window.systemExplorer.getState().construction.polymer.filter(p=>p.component==='jacket-clamp').every(p=>p.screwsFixed));
 await page.evaluate(()=>window.systemExplorer.stop());
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'browser-checks.json',JSON.stringify({passed:true,livePlayback:true,results,layouts,errors,bad},null,2)+'\n');console.log('Browser checks passed');
}finally{await browser.close();}
