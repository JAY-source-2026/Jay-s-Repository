import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
page.setDefaultTimeout(60000);
const base='http://127.0.0.1:8000/',out=new URL('./',import.meta.url).pathname,errors=[],bad=[],results=[];
const mode=process.argv[2]||'FS-MP25-0224-06';
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
async function select(id,progress=1){
 await page.locator(`[data-certificate="${id}"]`).evaluate(el=>el.click());
 return page.evaluate(async({id,progress})=>{
  const {SYSTEMS}=await import('./assets/js/systems.js?v=20261109r7');
  const d=Object.values(SYSTEMS).find(d=>d.record?.id===id),i=d.record.steps.findIndex(s=>['band','insulation-band'].includes(s.kind)),slot=d.timing.steps[i];
  window.systemExplorer.seek(slot.start+slot.duration*progress-.001);
  return {state:window.systemExplorer.getState(),category:d.record.category,caption:document.getElementById('installationCaption').textContent};
 },{id,progress});
}
try{
 await page.goto(base+'?v=20261110r1#technology',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.systemExplorer);
 for(const id of [mode==='controls'?'FS-MP25-0224-06':mode]){
  for(const progress of [.32,1]){
   const {state,category,caption}=await select(id,progress),bands=state.openingBands.assemblies[category];
   assert.equal(state.openingBands.photoLoaded,true);assert.ok(bands.length);assert.ok(bands.every(b=>b.wrapper==='blue-printed-film'));
   assert.equal(state.architectureVisible,true);assert.equal(state.visibleFloors.length,5);
   assert.match(caption,/파란/);
   if(progress===1)assert.ok(bands.filter(b=>b.visible).every(b=>b.offset.every(v=>Math.abs(v)<1e-9)));
   results.push({id,progress,bands,caption});
   await page.locator('#explorerPlayer').screenshot({path:out+id+(progress===1?'-seated':'-inserting')+'.png'});
  }
  console.log(id,'passed');
 }
 if(mode==='controls'){
 for(const [width,height] of [[1366,650],[390,844]]){
  await page.setViewportSize({width,height});await select('FS-MP25-0224-06',.32);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width>760)assert.ok(await page.locator('#systemDetail').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));
  await page.screenshot({path:out+`layout-${width}.png`});
 }
 await page.setViewportSize({width:1366,height:768});await select('FS-MP26-0507-14');
 await page.locator('#explorerReplay').click();await page.locator('#explorerPause').click();
 assert.equal((await page.evaluate(()=>window.systemExplorer.getState())).running,false);
 await page.locator('#explorerPlay').click();assert.equal((await page.evaluate(()=>window.systemExplorer.getState())).running,true);
 await page.locator('#explorerPause').click();
 await page.evaluate(()=>window.systemExplorer.seek(999));await page.locator('#explorerPlayer').screenshot({path:out+'boardx-complete.png'});
 await page.getByRole('button',{name:'건물 전체 보기'}).click();assert.equal((await page.evaluate(()=>window.systemExplorer.getState())).selected,null);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+mode+'-browser-checks.json',JSON.stringify({passed:true,results,errors,bad},null,2)+'\n');
}finally{await browser.close();}
