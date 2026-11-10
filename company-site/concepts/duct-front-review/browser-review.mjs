import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});page.setDefaultTimeout(120000);const out=new URL('./',import.meta.url).pathname,base='http://127.0.0.1:8000/',errors=[],bad=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
try{
 await page.goto(base+'?v=20261109r8#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);
 for(const id of ['FS-MP25-0224-06','FS-MP26-0507-14','FS-MP26-0507-15']){
  await page.locator(`[data-certificate="${id}"]`).evaluate(el=>el.click());
  const state=await page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261109r7');const d=SYSTEMS.duct,i=d.record.steps.findIndex(s=>s.kind==='blanket');window.systemExplorer.seek(d.timing.steps[i].end-.1);return window.systemExplorer.getState();});
  assert.equal(state.architectureVisible,true);assert.equal(state.visibleFloors.length,5);assert.ok(Math.abs(state.camera[0]-state.target[0])<1e-7);
  if(id.endsWith('-15'))assert.deepEqual(state.construction.duct.find(p=>p.component==='blanket-wrap').coverage,[state.assemblies.duct.serviceEnds.back,state.assemblies.duct.serviceEnds.front]);
  assert.equal(await page.locator('.explorer-controls button').count(),4);assert.equal(await page.locator('#systemDocuments a').count(),1);
  await page.locator('#explorerPlayer').screenshot({path:out+id+'.png'});results.push({id,camera:state.camera,target:state.target,coverage:state.construction.duct.find(p=>p.component==='blanket-wrap').coverage});console.log(id,'passed');
 }
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#explorerPlayer').screenshot({path:out+'floor-mobile.png'});assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'checks.json',JSON.stringify({passed:true,results,errors,bad,mobileOverflow:false},null,2)+'\n');console.log('Front view and full floor insulation passed.');
}finally{await browser.close();}
