import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url).pathname,base='http://127.0.0.1:8000/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1,reducedMotion:'reduce'});
page.setDefaultTimeout(45000);
const errors=[],bad=[],layouts=[],materials=[],documents=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
async function select(id){
 await page.locator(`[data-certificate="${id}"]`).evaluate(el=>el.click());
 await page.waitForFunction(id=>document.querySelector('#systemKicker').textContent===id,id);
 await page.evaluate(()=>window.systemExplorer.seek(999));
 await page.waitForFunction(()=>[...document.querySelectorAll('#systemMaterials img')].every(el=>el.complete&&el.naturalWidth));
}
async function checkLayout(label,fit){
 const result=await page.evaluate(label=>{
  const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
  return {label,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,header:rect('siteHeader'),model:rect('heroMedia'),canvas:rect('explorerRender'),caption:rect('installationCaption'),details:rect('systemDetail'),materials:rect('systemMaterials'),captionHidden:document.getElementById('installationCaption').hidden};
 },label);
 assert.equal(result.overflow,false);
 assert.ok(result.canvas.top>=result.caption.bottom-1);assert.ok(result.canvas.bottom<=result.model.bottom+1);
 if(fit){assert.ok(result.model.top>=result.header.bottom-1,JSON.stringify(result));assert.ok(result.details.bottom<=result.height,JSON.stringify(result));}
 layouts.push(result);return result;
}
try{
 await page.goto(base+'?v=20261109r5#technology',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>!!window.systemExplorer);
 console.log('3D ready');
 assert.equal(await page.locator('[data-certificate]').count(),60);
 assert.equal(await page.locator('#systemDescription,#systemFacts').count(),0);
 assert.equal(await page.locator('#systemMaterialsHeading').innerText(),'사용 자재');
 for(const [id,names] of [
  ['FS-MP23-1103-3',['내화채움보드','내화실리콘실란트','세라믹섬유블랭킷']],
  ['FS-NP24-0617-5',['내화자켓']],
  ['FS-MP25-0224-06',['내화채움보드','내화실리콘실란트','세라믹섬유블랭킷','내화밴드']],
  ['FS-MP25-0625-02',['내화채움보드M','내화실리콘실란트','세라믹섬유블랭킷']]
 ]){
  await select(id);
  assert.deepEqual(await page.locator('#systemMaterials .mini-material > span').allTextContents(),names);
  assert.equal(await page.locator('#systemDocuments a').count(),1);
  const a=page.locator('#systemDocuments a'),href=await a.getAttribute('href');
  assert.equal(await a.innerText(),'인정서 보기 ↗');assert.equal(await a.getAttribute('target'),'_blank');assert.ok(href.endsWith(id+'.pdf#page=1'));
  const response=await page.request.get(href.split('#')[0]);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/application\/pdf/);
  assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');
  materials.push({id,names});documents.push({id,href,status:response.status()});
  await checkLayout(id,true);
  if(id==='FS-MP25-0625-02')assert.equal(await page.locator('#systemMaterials button[data-material="board"]').count(),0);
  if(id==='FS-MP25-0224-06'){
   await page.locator('#systemMaterials button[data-material="board"]').click();await page.locator('#materialDialog').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#materialDialog').waitFor({state:'hidden'});
  }
  console.log(id,names.length,'materials, PDF verified');
 }
 await page.locator('[data-system="firewall"]').click();await page.evaluate(()=>window.systemExplorer.seek(999));
 assert.deepEqual(await page.locator('#systemMaterials .mini-material > span').allTextContents(),['내화보드','내화실리콘실란트']);
 assert.equal(await page.locator('#systemDocuments a').count(),1);assert.ok((await page.locator('#systemDocuments a').getAttribute('href')).endsWith('FR-WS26-0102-1.pdf#page=1'));
 await checkLayout('firewall',true);
 for(const [width,height] of [[1920,1080],[1366,768],[1366,650],[900,700],[390,844],[320,640]]){
  await page.setViewportSize({width,height});
  for(const id of ['FS-MP23-1103-3','FS-NP24-0617-5','FS-MP25-0224-06']){
   await select(id);await checkLayout(id,width>760);
  }
  if(width>760){
   for(const step of [0,4,6,7]){
    await page.locator('#systemSteps button').nth(step).click();await checkLayout('duct step '+step,true);
   }
  }
  await page.screenshot({path:out+`details-${width}-${height}.png`});console.log('layout',width,height);
 }
 // Opening a long certificate menu must not push the selected model's details below the screen.
 await page.setViewportSize({width:1366,height:650});await select('FS-MP25-0224-06');
 await page.locator('[data-cert-toggle="duct"]').click();
 await page.locator('[data-certificate="FS-MP25-0224-06"]').click();
 await checkLayout('expanded certificate menu',true);
 await page.locator('#explorerOverview').click();
 assert.equal(await page.locator('#systemDocuments a').count(),0);assert.equal(await page.locator('#systemMaterials .mini-material').count(),0);
 for(const category of ['metal','polymer','duct','bundle','firewall']){
  await page.locator(`[data-system="${category}"]`).click();
  assert.ok(await page.locator('#systemMaterials img').count()>0,category+' needs materials');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'checks.json',JSON.stringify({passed:true,materials,documents,layouts,errors,bad},null,2)+'\n');
 console.log('Passed: compact details, matching material families, one full certificate, product detail, navigation and responsive layouts.');
}finally{await browser.close();}
