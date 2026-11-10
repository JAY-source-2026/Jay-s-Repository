import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url).pathname,base='http://127.0.0.1:8000/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1,reducedMotion:'reduce'});
page.setDefaultTimeout(60000);
const errors=[],bad=[],results={layouts:[],ducts:[]};
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
const state=()=>page.evaluate(()=>window.systemExplorer.getState());
async function choose(id){await page.locator(`[data-certificate="${id}"]`).evaluate(el=>el.click());await page.waitForFunction(id=>document.querySelector('#systemKicker').textContent===id,id);}
async function blanket(ratio){return page.evaluate(async ratio=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261109r1');const d=SYSTEMS.duct,i=d.record.steps.findIndex(s=>s.kind==='blanket'),slot=d.timing.steps[i];window.systemExplorer.seek(slot.start+(slot.duration-.1)*ratio);return window.systemExplorer.getState();},ratio);}
async function layout(label){
 const result=await page.evaluate(label=>{const p=document.querySelector('.explorer-controls').getBoundingClientRect();return {label,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,controls:{left:p.left,right:p.right,bottom:p.bottom},buttons:[...document.querySelectorAll('.explorer-controls button')].map(b=>({text:b.textContent.trim(),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})),detailsBottom:document.getElementById('systemDetail').getBoundingClientRect().bottom};},label);
 assert.equal(result.overflow,false);assert.ok(result.controls.left>=0&&result.controls.right<=result.width+1);
 assert.equal(result.buttons.length,4);assert.ok(result.buttons.every(b=>b.height>=40&&b.width>=50));results.layouts.push(result);
}
try{
 await page.goto(base+'?v=20261109r6#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);console.log('3D ready');
 assert.equal(await page.locator('[data-certificate]').count(),60);
 for(const id of ['FS-MP25-0224-06','FS-MP26-0507-14','FS-MP26-0507-15']){
  await choose(id);
  let s=await blanket(.38);assert.deepEqual(s.visibleFloors,['duct']);assert.equal(s.architectureVisible,false);assert.equal(s.terrainVisible,false);
  assert.equal(await page.locator('#systemDocuments a').count(),1);assert.ok(await page.locator('#systemMaterials img').count()>0);
  results.ducts.push({id,camera:s.camera,target:s.target,isolated:true});
  if(id==='FS-MP25-0224-06')for(const ratio of [0,.38,.72,1]){await blanket(ratio);await page.locator('#explorerPlayer').screenshot({path:out+`wrap-${Math.round(ratio*100)}.png`});}
  else await page.locator('#explorerPlayer').screenshot({path:out+id+'.png'});
  console.log('duct',id);
 }
 if(process.argv.includes('--visual')){console.log('Visual snapshots ready');process.exitCode=0;}
 else{
  await choose('FS-MP25-0224-06');const held=await blanket(.2);
  await page.locator('#explorerPlay').click();await page.waitForFunction(t=>window.systemExplorer.getState().elapsed>t+.3,held.elapsed);
  assert.equal(await page.locator('#explorerPlay').isDisabled(),true);assert.equal(await page.locator('#explorerPause').isEnabled(),true);
  await page.locator('#explorerPause').click();const paused=await state();await page.waitForTimeout(500);assert.equal((await state()).elapsed,paused.elapsed);assert.equal((await state()).paused,true);
  await page.setViewportSize({width:1366,height:650});await page.waitForTimeout(300);assert.equal((await state()).elapsed,paused.elapsed);
  results.pauseResumesFromSamePosition=true;
  await page.locator('#explorerFullscreen').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='explorerPlayer');
  await layout('native fullscreen');assert.equal((await state()).elapsed,paused.elapsed);
  await page.screenshot({path:out+'fullscreen.png'});
  await page.locator('#explorerFullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
  assert.equal((await state()).elapsed,paused.elapsed);results.nativeFullscreen=true;
  await page.locator('#explorerPlayer').evaluate(el=>{el.requestFullscreen=undefined;});
  await page.locator('#explorerFullscreen').click();await page.waitForFunction(()=>document.querySelector('#explorerPlayer').classList.contains('is-expanded'));
  assert.equal(await page.locator('#siteHeader').evaluate(el=>el.inert),true);await layout('fullscreen fallback');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#siteHeader').evaluate(el=>el.inert),false);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');results.fullscreenFallback=true;
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(250);
  await page.locator('#explorerPlayer').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
  assert.equal((await state()).elapsed,paused.elapsed);assert.equal((await state()).paused,true);results.pauseSurvivesScrolling=true;
  await page.locator('#explorerPlay').click();await page.waitForFunction(t=>window.systemExplorer.getState().elapsed>t+.2,paused.elapsed);
  await page.locator('#explorerPause').click();await page.locator('#explorerReplay').click();
  const restarted=await state();assert.ok(restarted.elapsed<1.5);assert.equal(restarted.selected,'duct');assert.equal(restarted.running,true);
  await page.locator('#explorerPause').click();results.restartFromBeginning=true;
  for(const [width,height] of [[1366,768],[1366,650],[900,700],[390,844],[320,640]]){
   await page.setViewportSize({width,height});await blanket(.38);
   await page.locator('#heroMedia').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('#siteHeader').offsetHeight-14,behavior:'instant'}));
   await layout('player');
   if(width>760)assert.ok(results.layouts.at(-1).detailsBottom<=height+1,JSON.stringify(results.layouts.at(-1)));
   await page.screenshot({path:out+`player-${width}-${height}.png`});console.log('layout',width,height);
  }
  await fs.writeFile(out+'playback-checks.json',JSON.stringify({passed:true,...results,errors,bad},null,2)+'\n');
  await page.setViewportSize({width:1366,height:768});await choose('FS-MP23-1103-3');let s=await state();assert.equal(s.architectureVisible,true);assert.equal(s.terrainVisible,true);assert.equal(s.visibleFloors.length,5);
  await page.locator('#explorerOverview').click();s=await state();assert.equal(s.mode,'overview');assert.equal(s.architectureVisible,true);assert.equal(await page.locator('#explorerPlay').isDisabled(),true);assert.equal(await page.locator('#explorerPause').isDisabled(),true);results.overviewRestored=true;
  await page.emulateMedia({reducedMotion:'no-preference'});await choose('FS-MP25-0224-06');
  await page.waitForFunction(()=>window.systemExplorer.getState().elapsed>.25);assert.equal((await state()).running,true);
  await page.locator('#explorerPause').click();const autoPaused=await state();await page.waitForTimeout(300);assert.equal((await state()).elapsed,autoPaused.elapsed);results.normalAutoplay=true;
  await page.evaluate(()=>window.systemExplorer.seek(window.systemExplorer.getState().duration));
  await page.locator('#explorerPlayer').screenshot({path:out+'duct-complete.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  await fs.writeFile(out+'checks.json',JSON.stringify({passed:true,...results,errors,bad},null,2)+'\n');console.log('Duct framing, controls, playback, fullscreen and responsive checks passed.');
 }
}finally{await browser.close();}
