import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
page.setDefaultTimeout(60000);
const base='http://127.0.0.1:8000/',out=new URL('./',import.meta.url).pathname,errors=[],bad=[],results=[];
const mode=process.argv[2]||'controls';
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
async function select(id,progress=1){
 await page.locator(`[data-certificate="${id}"]`).evaluate(el=>el.click());
 return page.evaluate(async({id,progress})=>{
  const {SYSTEMS}=await import('./assets/js/systems.js?v=20261109r7');
  const d=Object.values(SYSTEMS).find(d=>d.record?.id===id),i=d.record.steps.findIndex(s=>s.kind==='blanket'),slot=d.timing.steps[i];
  window.systemExplorer.seek(slot.start+(slot.duration-.1)*progress);
  return {state:window.systemExplorer.getState(),category:d.record.category,caption:document.getElementById('installationCaption').textContent};
 },{id,progress});
}
try{
 await page.goto(base+'?v=20261109r10#technology',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.systemExplorer);
 assert.equal(await page.getByRole('button',{name:'건물 전체 보기'}).count(),1);
 assert.equal(await page.getByRole('button',{name:'전체 구조 보기'}).count(),0);
 for(const id of [mode.startsWith('FS-')?mode:'FS-MP26-0507-14']){
  const {state,category,caption}=await select(id);
  const wrap=state.construction[category].find(p=>p.component==='blanket-wrap');
  assert.equal(wrap.throughSupport,true);assert.ok(wrap.coverage[0]<-.075&&wrap.coverage[1]>.075);
  assert.equal(state.architectureVisible,true);assert.equal(state.visibleFloors.length,5);
  if(id==='FS-MP26-0507-14')assert.deepEqual(wrap.coverage,[-1.075,1.075]);
  if(id!=='FS-MP26-0507-15')assert.match(caption,/벽체 내부를 통과/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  results.push({id,wrap,caption});await page.screenshot({path:out+id+'.png'});console.log(id,'passed');
 }
 if(mode==='controls'){
 await select('FS-MP26-0507-14',.5);await page.screenshot({path:out+'boardx-wrapping.png'});
 await page.locator('#explorerReplay').click();
 await page.locator('#explorerPause').click();
 assert.equal((await page.evaluate(()=>window.systemExplorer.getState())).running,false);
 await page.locator('#explorerPlay').click();
 assert.equal((await page.evaluate(()=>window.systemExplorer.getState())).running,true);
 await page.locator('#explorerPause').click();
 await page.evaluate(()=>window.systemExplorer.seek(999));
 await page.screenshot({path:out+'boardx-complete.png'});
 await page.getByRole('button',{name:'건물 전체 보기'}).click();
 assert.equal((await page.evaluate(()=>window.systemExplorer.getState())).selected,null);
 await page.screenshot({path:out+'building-overview.png'});
 for(const [width,height] of [[1366,650],[390,844]]){
  await page.setViewportSize({width,height});await select('FS-MP26-0507-14');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width>760)assert.ok(await page.locator('#systemDetail').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));
  await page.locator('#explorerPlayer').screenshot({path:out+`boardx-${width}.png`});
 }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+mode+'-browser-checks.json',JSON.stringify({passed:true,results,errors,bad},null,2)+'\n');
}finally{await browser.close();}
