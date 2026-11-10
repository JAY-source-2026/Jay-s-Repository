import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});page.setDefaultTimeout(120000);const state=()=>page.evaluate(()=>window.systemExplorer.getState()),out=new URL('./',import.meta.url).pathname;
try{
 await page.goto('http://127.0.0.1:8000/?v=20261109r7#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);
 await page.locator('[data-system="duct"]').evaluate(el=>el.click());await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{window.systemExplorer.overview();window.systemExplorer.seek(0);});
 await page.locator('[data-system="duct"]').evaluate(el=>el.click());console.log('Zoom started',JSON.stringify(await state()).slice(0,550));
 try{await page.waitForFunction(()=>window.systemExplorer.getState().elapsed>.15,{},{timeout:120000});}catch(e){console.log('Failed state',JSON.stringify(await state()).slice(0,700));throw e;}
 await page.locator('#explorerPause').evaluate(el=>el.click());const paused=await state();await page.waitForTimeout(250);assert.equal((await state()).elapsed,paused.elapsed);assert.equal(paused.architectureVisible,true);assert.equal(paused.visibleFloors.length,5);console.log('Zoom and pause passed');
 await page.locator('#explorerPlay').evaluate(el=>el.click());await page.waitForFunction(t=>window.systemExplorer.getState().elapsed>t+.1,paused.elapsed);await page.locator('#explorerPause').evaluate(el=>el.click());
 await page.locator('#explorerFullscreen').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='explorerPlayer');await page.locator('#explorerFullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
 const layouts=[];
 for(const [width,height]of [[1366,650],[900,700],[390,844]]){await page.setViewportSize({width,height});await page.locator('#heroMedia').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('#siteHeader').offsetHeight-14,behavior:'instant'}));const d=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,detailsBottom:document.querySelector('#systemDetail').getBoundingClientRect().bottom}));assert.equal(d.overflow,false);if(width>760)assert.ok(d.detailsBottom<=height+1);layouts.push(d);}
 await page.screenshot({path:out+'mobile.png'});await fs.writeFile(out+'controls-checks.json',JSON.stringify({passed:true,buildingPreserved:true,zoom:true,pauseAndResume:true,fullscreen:true,layouts},null,2)+'\n');console.log('Controls and layout passed');
}finally{await browser.close();}
