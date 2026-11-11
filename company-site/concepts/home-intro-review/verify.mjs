import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url).pathname,base='http://127.0.0.1:8000/';
const browser=await chromium.launch({headless:true,executablePath:'/tmp/doenc-browser/browsers/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:.75});await context.route(/google|clarity|bing/,r=>r.abort());
 const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[],bad=[],states=[],layouts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
 await page.goto(base+'?intro=replay&v=20261111s4',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>doencIntro.state().ready||doencIntroBoot.reason);assert.equal(await page.evaluate(()=>doencIntroBoot.reason),null);await page.evaluate(()=>doencIntro.pause());console.log('ready');
 assert(await page.locator('#introSkip').isVisible());assert(await page.locator('#main').evaluate(el=>el.inert));
 const skip=await page.locator('#introSkip').boundingBox();assert(skip.x>1000&&skip.y<60&&skip.height>=44);
 assert.equal(await page.evaluate(()=>!!window.systemExplorer),false);
 for(const t of [2,4.9,5.35,5.48,6.5,9,10.7,13.7,14.8,16,17.8,19.8,22.4,25.8,27.8])states.push(await page.evaluate(t=>doencIntro.seek(t),t));
 const s=t=>states.find(s=>s.elapsed===t);
 assert(s(9).scene.logoCut.dCenterFilled);assert(!s(10.7).scene.logoCut.dCenterFilled);assert(s(13.7).scene.logoCut.oCenterFilled);assert(s(14.8).scene.logoCut.solidO);assert(!s(16).scene.logoCut.oCenterFilled&&s(16).scene.seedCenterFilled);assert(!s(17.8).scene.seedCenterFilled);
 assert.equal(s(5.35).scene.fire,0);assert(s(5.48).scene.impact.active);assert(Math.abs(s(5.48).scene.impact.shakeY)>0);assert(!s(6.5).scene.impact.active);
 const fire=s(4.9).scene.fireCompression;assert(fire.flameTop<=fire.underSide&&fire.emberTop<=fire.ceiling);
 assert.equal(s(2).frame.reveal,0);assert.equal(s(22.4).frame.reveal,0);assert.equal(s(27.8).frame.reveal,1);
 assert.equal(s(4.9).frame.logoScale,.78);assert.equal(s(4.9).frame.logoDepth,.14);
 assert(s(27.8).frame.imageSources.every(v=>v.includes('assets/media/hero/doenc-')));
 for(const [width,height]of [[1920,1080],[1366,650],[900,700],[390,844],[320,640]]){
  await page.setViewportSize({width,height});const state=await page.evaluate(()=>doencIntro.seek(27.8));const a=state.frame.jacket,b=state.frame.targetJacket;
  for(const k of ['x','y','width','height'])assert(Math.abs(a[k]-b[k])<.01);assert(Math.abs(a.angle)<.001);
  const layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth-innerWidth,skip:document.getElementById('introSkip').getBoundingClientRect().toJSON(),jacket:document.querySelector('.signature-product-jacket').getBoundingClientRect().toJSON(),board:document.querySelector('.signature-product-board').getBoundingClientRect().toJSON()}));
  assert.equal(layout.overflow,0);assert(layout.skip.right<=width&&layout.skip.top>=0);layouts.push(layout);
  if([1366,390,320].includes(width))await page.screenshot({path:out+'handoff-'+width+'.png',timeout:120000});
  if(width===390){for(const [name,t]of [['mobile-d',4.9],['mobile-roll',22.4]]){await page.evaluate(t=>doencIntro.seek(t),t);await page.screenshot({path:out+name+'.png',timeout:120000});}}
  console.log('layout',width);
 }
 await fs.writeFile(out+'timeline-checkpoint.json',JSON.stringify({states,layouts,errors,bad},null,2));
 await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>doencIntro.seek(5.2));await page.locator('#introPause').click();await page.waitForFunction(()=>doencIntro.state().elapsed>5.6);await page.locator('#introPause').click();assert.equal(await page.evaluate(()=>doencIntro.state().scene.fire),0);
 const stopped=await page.evaluate(()=>doencIntro.state().elapsed);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>doencIntro.state().elapsed),stopped);
 const end=await page.evaluate(()=>doencIntro.seek(27.8));await page.locator('#introPause').click();await page.waitForFunction(()=>!doencIntroBoot.active);assert.equal(await page.evaluate(()=>doencIntroBoot.reason),'complete');
 assert.equal(await page.locator('#introStage canvas').count(),0);assert(!await page.locator('#main').evaluate(el=>el.inert));assert(!await page.locator('#brandIntro').isVisible());
 const after=await page.locator('.signature-product-jacket').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(after[k]-end.frame.targetJacket[k])<.1);
 await page.screenshot({path:out+'completed-desktop.png',timeout:120000});console.log('natural handoff');
 await page.locator('[data-product-select="sealant"]').click();assert.equal(await page.locator('[data-product-select="sealant"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-shutter-select="wire"]').click();assert.equal(await page.locator('[data-shutter-select="wire"]').getAttribute('aria-pressed'),'true');
 await page.waitForFunction(()=>!!window.systemExplorer);console.log('existing product menus and technical 3D');
 // SKIP stays usable while the heavy scene module is still in flight.
 const early=await context.newPage();early.setDefaultTimeout(120000);let release;const held=new Promise(r=>release=r);
 await early.route('**/brand-intro/scene.js*',async route=>{await held;await route.abort();});
 await early.goto(base+'?intro=replay',{waitUntil:'domcontentloaded'});await early.locator('#introSkip').click();release();
 assert.equal(await early.evaluate(()=>doencIntroBoot.reason),'skip');assert(!await early.locator('#main').evaluate(el=>el.inert));assert(!await early.locator('#brandIntro').isVisible());
 await early.locator('[data-product-select="jacket"]').click();assert.equal(await early.locator('[data-product-select="jacket"]').getAttribute('aria-pressed'),'true');
 await early.goto(base,{waitUntil:'domcontentloaded'});assert.equal(await early.evaluate(()=>doencIntroBoot.active),false);await early.close();console.log('early skip and session');
 const reduced=await context.newPage();await reduced.emulateMedia({reducedMotion:'reduce'});await reduced.goto(base+'?intro=replay',{waitUntil:'domcontentloaded'});assert.equal(await reduced.evaluate(()=>doencIntroBoot.active),false);assert(!await reduced.locator('#brandIntro').isVisible());await reduced.close();
 const deep=await context.newPage();await deep.goto(base+'?intro=replay#contact',{waitUntil:'domcontentloaded'});assert.equal(await deep.evaluate(()=>doencIntroBoot.active),false);await deep.close();
 const noGPU=await context.newPage();noGPU.setDefaultTimeout(120000);await noGPU.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args);};});
 await noGPU.goto(base+'?intro=replay',{waitUntil:'domcontentloaded'});await noGPU.waitForFunction(()=>doencIntroBoot.reason==='unavailable');assert(!await noGPU.locator('#main').evaluate(el=>el.inert));assert(!await noGPU.locator('#brandIntro').isVisible());await noGPU.close();
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'checks.json',JSON.stringify({passed:true,revision:'20261111s4',states,layouts,errors,bad,behavior:{contactFire:true,solidDandO:true,subtleImpact:true,exactPublishedProductAssets:true,matchedLanding:true,naturalHandoff:true,skipDuringLoading:true,sessionReturn:true,reducedMotion:true,deepLinks:true,webglFallback:true,pauseResume:true,canvasDisposed:true,homepageMenus:true,technical3D:true}},null,2));console.log('PASS');
}finally{await browser.close();}
