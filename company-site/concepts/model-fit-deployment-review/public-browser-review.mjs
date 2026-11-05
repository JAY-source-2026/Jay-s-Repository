import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspaces/Jay-s-Repository/company-site/concepts/model-fit-deployment-review';
const base='https://jay-source-2026.github.io/Jay-s-Repository/company-site/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.5,reducedMotion:'reduce'});page.setDefaultTimeout(90000);
const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push({url:r.url(),status:r.status()});});
const results={};
try{
 await page.goto(base+'?v=20261105r6#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);console.log('public 3D ready');
 const release=await (await page.request.get(base+'release.json?verify=a620c16')).json();assert.equal(release.source_commit,'a620c16f764788346524476d6be834c8576630eb');results.release=release;
 assert.equal(await page.locator('[data-certificate]').count(),60);results.certificates=60;
 assert.equal(await page.locator('[data-shutter-photo]').count(),4);results.shutterPhotos=4;
 const select=async id=>page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());
 const seek=async t=>page.evaluate(t=>{window.systemExplorer.seek(t);return window.systemExplorer.getState();},t);
 await select('FS-MP24-0617-15');let s=await seek(7.4);assert.ok(s.construction.metal.some(p=>p.component==='sealant-pass'&&p.toolVisible));assert.match(await page.locator('#installationTitle').textContent(),/실란트/);assert.match(await page.locator('#installationSource').getAttribute('href'),/FS-MP24-0617-15.pdf#page=8$/);results.captionAndSealant=true;
 await page.locator('#heroMedia').screenshot({path:out+'/live-sealant.png'});
 await select('FS-MP25-1218-05');s=await seek(999);results.largePipeDistance=Math.hypot(...s.camera.map((v,i)=>v-s.target[i]));assert.ok(results.largePipeDistance>4);await page.locator('#heroMedia').screenshot({path:out+'/live-large-pipe.png'});
 await select('FS-MP25-0224-06');s=await page.evaluate(()=>window.systemExplorer.getState());assert.equal(s.elapsed,0);assert.equal(s.floors.find(f=>f.id==='duct').installed,0);assert.equal(s.construction.duct.filter(p=>p.component==='board-piece').length,20);results.ductInitialAndSplitBoards=true;
 await select('FS-MP24-0617-21');s=await seek(0);assert.ok(s.assemblies.metal.existingInsulation);results.existingInsulation=true;
 await select('FS-NP24-0617-5');s=await seek(2.2);assert.ok(s.construction.polymer.filter(p=>p.component==='jacket-clamp').every(p=>p.openAngle>1&&!p.latched));s=await seek(5.05);assert.ok(s.construction.polymer.filter(p=>p.component==='jacket-clamp').every(p=>p.latched));results.jacket=true;
 await page.locator('[data-system="firewall"]').evaluate(b=>b.click());const privateLinks=await page.locator('#systemDocuments a').evaluateAll(as=>as.map(a=>a.getAttribute('href')));assert.ok(privateLinks.includes('#contact'));results.privateDocumentFallback=true;
 await page.setViewportSize({width:390,height:844});await select('FS-MP25-1218-11');s=await seek(999);assert.equal(s.cutawayBay,'metal');
 const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overlap:document.querySelector('#installationCaption').getBoundingClientRect().bottom>document.querySelector('#hero3d').getBoundingClientRect().top+1}));assert.equal(layout.overflow,false);assert.equal(layout.overlap,false);results.mobile=layout;await page.locator('#heroMedia').screenshot({path:out+'/live-mobile.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await fs.writeFile(out+'/live-browser-checks.json',JSON.stringify({passed:true,base,...results,errors,bad},null,2)+'\n');console.log('public browser checks passed');
}finally{await browser.close();}
