import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspaces/Jay-s-Repository/company-site/concepts/installation-models-review';
const certificates=JSON.parse(await fs.readFile(out+'/certificate-browser-checks.json','utf8'));
assert.equal(certificates.checked,60);assert.deepEqual(certificates.errors,[]);assert.deepEqual(certificates.bad,[]);
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.5,reducedMotion:'reduce'});
page.setDefaultTimeout(90000);
const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>console.log('PAGE CRASH'));browser.on('disconnected',()=>console.log('BROWSER DISCONNECTED'));
page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8000/')&&r.status()>=400)bad.push(r.url());});
await page.route(/google-analytics|googletagmanager/,r=>r.abort());
try{
 await page.goto('http://127.0.0.1:8000/?v=20261105r3#technology',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>!!window.systemExplorer);console.log('ready');
 await page.locator('[data-certificate="FS-NP25-0224-05"]').evaluate(b=>b.click());
 const steps=await page.locator('#certificateInstructions h4').allTextContents();
 const jacket=steps.findIndex(t=>t.includes('자켓'));
 assert.ok(jacket>=0);
 await page.evaluate(t=>window.systemExplorer.seek(t),jacket*3+1.9);
 const lower=await page.evaluate(()=>window.systemExplorer.getState());assert.ok(lower.camera[1]<lower.target[1]);assert.equal(lower.polymer.pipeVisible,true);
 await page.locator('#heroMedia').screenshot({path:out+'/floor-jacket-lower.png'});
 await page.evaluate(()=>window.systemExplorer.seek(999));
 const upper=await page.evaluate(()=>window.systemExplorer.getState());assert.ok(upper.camera[1]>upper.target[1]);assert.equal(upper.polymer.pipeVisible,true);assert.equal(upper.fireObjects,0);assert.equal(upper.damperObjects,0);
 await page.locator('#heroMedia').screenshot({path:out+'/floor-installation-complete.png'});console.log('floor faces and pipes passed');
 await page.locator('#explorerOverview').evaluate(b=>b.click());
 await page.locator('#heroMedia').scrollIntoViewIfNeeded();
 await page.locator('#hero3d').screenshot({path:out+'/tunnel-before.png'});
 const before=await page.evaluate(()=>window.systemExplorer.getState());
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
 await page.locator('#heroMedia').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
 const returned=await page.evaluate(()=>window.systemExplorer.getState());
 assert.equal(returned.selected,null);assert.deepEqual(returned.camera,before.camera);
 await page.locator('#hero3d').screenshot({path:out+'/tunnel-after.png'});console.log('reentry passed');
 await page.locator('#systemOptions').scrollIntoViewIfNeeded();await page.waitForTimeout(1100);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{window.motionFrames=[];let count=0;function sample(){const s=window.systemExplorer.getState();if(s.selected==='bundle')window.motionFrames.push({selected:s.selected,mode:s.mode,transition:s.transition,camera:s.camera,architecture:s.architectureVisible,terrain:s.terrainVisible,floors:s.visibleFloors});if(++count<80&&window.motionFrames.length<6)requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 await page.locator('[data-system="bundle"]').hover();
 await page.waitForFunction(()=>window.motionFrames.some(s=>s.transition>0&&s.transition<1));
 const motion=await page.evaluate(()=>window.motionFrames.filter(s=>s.transition>0&&s.transition<1));
 assert.ok(motion.every(s=>s.architecture&&s.terrain&&s.floors.includes('firewall')));
 await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(1430,980);console.log('camera frames passed',motion.length);
 await page.locator('[data-cert-toggle="bundle"]').focus();await page.keyboard.press('Enter');
 await page.locator('#certificates-bundle [data-certificate]').first().focus();await page.keyboard.press('End');await page.keyboard.press('Enter');
 const selected=await page.locator('#systemKicker').textContent();
 const expected=await page.locator('#certificates-bundle [data-certificate]').last().getAttribute('data-certificate');assert.equal(selected,expected);
 await page.locator('#certificates-bundle [data-certificate]').last().focus();await page.keyboard.press('Escape');assert.equal(await page.locator('[data-cert-toggle="bundle"]').getAttribute('aria-expanded'),'false');
 await page.locator('[data-cert-toggle="bundle"]').click();await page.locator('#systemOptions').screenshot({path:out+'/certificate-menu.png'});console.log('keyboard passed');
 const layouts=[];
 for(const [width,height]of [[1440,1000],[1366,650],[1024,600],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>window.systemExplorer.seek(10));
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overlap:document.querySelector('#explorerCaption').getBoundingClientRect().bottom>document.querySelector('#hero3d').getBoundingClientRect().top+1}));
  assert.equal(layout.overflow,false);assert.equal(layout.overlap,false,`caption at ${width}`);layouts.push({width,height,...layout});
  if(width===390){await page.locator('#heroMedia').screenshot({path:out+'/mobile-installation.png'});await page.locator('#systemOptions').screenshot({path:out+'/certificate-menu-mobile.png'});}
 }
 await fs.writeFile(out+'/checks.json',JSON.stringify({passed:!errors.length&&!bad.length,certificates:60,motion,floorViews:{lower:lower.camera,upper:upper.camera},reentryStable:true,pipePermanent:true,noFireOrDamper:true,keyboard:true,layouts,deviceScaleFactor:.5,errors,bad},null,2)+'\n');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('all final checks passed');
}finally{await browser.close();}
