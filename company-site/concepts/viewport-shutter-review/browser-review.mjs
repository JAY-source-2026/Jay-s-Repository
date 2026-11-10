import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const mode=process.argv[2]||'remaining';
if(mode==='remaining'){
 const {spawn}=await import('node:child_process');
 for(const name of ['shutter','boardx','floor'])await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[new URL(import.meta.url).pathname,name],{stdio:'inherit',env:process.env});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(name+' review failed: '+code)));
 });
 process.exit(0);
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});page.setDefaultTimeout(90000);
const out=new URL('./',import.meta.url).pathname,base='http://127.0.0.1:8000/',errors=[],bad=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
async function layout(name){
 const r=await page.evaluate(()=>{const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};return {width:innerWidth,height:innerHeight,header:rect('siteHeader'),render:rect('heroMedia'),detail:rect('systemDetail'),overflow:document.documentElement.scrollWidth>innerWidth};});
 assert.equal(r.overflow,false);if(r.width>760){assert.ok(r.render.top>=r.header.bottom-1,JSON.stringify(r));assert.ok(r.detail.bottom<=r.height,JSON.stringify(r));}results.push({name,...r});
}
try{
 await page.goto(base+'?v=20261109r9#'+(mode==='shutter'?'shutter':'technology'),{waitUntil:'networkidle'});
 if(mode!=='shutter'){await page.waitForFunction(()=>!!window.systemExplorer);
 assert.equal(await page.getByText('디오이엔씨의 화재차단 기술',{exact:true}).count(),0);
 await layout('initial');
 for(const id of [mode==='floor'?'FS-MP26-0507-15':mode==='boardx'?'FS-MP26-0507-14':'FS-MP25-0224-06']){
  await page.locator(`[data-certificate="${id}"]`).evaluate(el=>el.click());
  const state=await page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261109r7');const d=SYSTEMS.duct,i=d.record.steps.findIndex(s=>s.kind==='blanket');window.systemExplorer.seek(d.timing.steps[i].end-.1);return window.systemExplorer.getState();});
  assert.equal(state.architectureVisible,true);assert.equal(state.visibleFloors.length,5);
  if(id.endsWith('-15'))assert.deepEqual(state.construction.duct.find(p=>p.component==='blanket-wrap').coverage,[state.assemblies.duct.serviceEnds.back,state.assemblies.duct.serviceEnds.front]);
  await layout(id);await page.screenshot({path:out+id+'.png'});console.log(id,'passed');
 }
 if(mode==='wall')for(const [width,height] of [[1366,650],[900,700]]){
  await page.setViewportSize({width,height});await page.locator('[data-certificate="FS-MP25-0224-06"]').evaluate(el=>el.click());await page.evaluate(()=>window.systemExplorer.seek(999));await layout('compact');
  await page.screenshot({path:out+`technology-${width}-${height}.png`});
 }
 }
 if(mode==='shutter'){
 await page.setViewportSize({width:1366,height:768});
 await page.locator('a.signature-detail-link[href="#shutter"]').count().then(async n=>{if(n)await page.locator('a.signature-detail-link[href="#shutter"]').evaluate(el=>el.click());else await page.evaluate(()=>{location.hash='shutter';});});
 await page.locator('#shutter').evaluate(el=>el.scrollIntoView());
 const shutter=await page.locator('#shutter').evaluate(el=>({height:el.offsetHeight,viewport:innerHeight,top:el.getBoundingClientRect().top}));
 assert.ok(Math.abs(shutter.height-(shutter.viewport-100))<=2,JSON.stringify(shutter));results.push({shutter});
 await page.screenshot({path:out+'shutter-closed.png'});
 const summary=page.locator('.shutter-certificates summary');assert.equal(await summary.innerText(),'방화셔터 인정서 보기');await summary.click();
 assert.equal(await page.locator('.shutter-certificates').getAttribute('open'),'');
 const links=await page.locator('.shutter-certificates a').evaluateAll(els=>els.map(a=>({href:a.href,text:a.textContent,target:a.target})));
 const source=JSON.parse(await fs.readFile(new URL('../../assets/data/archive.json',import.meta.url))).items.filter(i=>i.cat==='shutter'&&i.board==='recognition');assert.equal(links.length,5);
 for(let i=0;i<links.length;i++){
  const a=links[i];assert.equal(a.href,base+source[i].file.href+'#page=1');assert.equal(a.target,'_blank');
  const response=await page.request.get(a.href.split('#')[0]);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/application\/pdf/);assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');
 }
 await page.locator('#shutter').screenshot({path:out+'shutter-open.png'});results.push({certificates:links});
 const popupPromise=page.waitForEvent('popup'),requestPromise=page.context().waitForEvent('request',{predicate:r=>r.url()===links[0].href.split('#')[0]});await page.locator('.shutter-certificates a').first().click();const popup=await popupPromise,request=await requestPromise;results.push({newTabRequest:request.url()});await popup.close();
 await summary.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.shutter-certificates').getAttribute('open'),null);
 await page.setViewportSize({width:390,height:844});await page.locator('#shutter').evaluate(el=>el.scrollIntoView());await summary.click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#shutter').screenshot({path:out+'shutter-mobile.png'});
 }
 if(mode==='floor'){await page.setViewportSize({width:390,height:844});
 await page.locator('[data-certificate="FS-MP26-0507-15"]').evaluate(el=>el.click());await page.evaluate(()=>window.systemExplorer.seek(999));await layout('mobile');await page.locator('#explorerPlayer').screenshot({path:out+'floor-mobile.png'});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await fs.writeFile(out+mode+'-checks.json',JSON.stringify({passed:true,results,errors,bad},null,2)+'\n');console.log('Viewport, geometry, shutter disclosure and PDFs passed.');
}finally{await browser.close();}
