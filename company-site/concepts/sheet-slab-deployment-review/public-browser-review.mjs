import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('.',import.meta.url).pathname;
const base='https://jay-source-2026.github.io/Jay-s-Repository/company-site/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1366,height:900},deviceScaleFactor:.5,reducedMotion:'reduce'});page.setDefaultTimeout(120000);
const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push({url:r.url(),status:r.status()});});
const result={};
try{
 await page.goto(base+'?v=20261106r2#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);console.log('Public 3D ready');
 const release=await (await page.request.get(base+'release.json')).json();assert.equal(release.source_commit,'aa96fe337d3c9ff20b058a030761c7f411f80724');result.release=release;
 assert.equal(await page.locator('[data-certificate]').count(),60);assert.equal(await page.locator('[data-shutter-photo]').count(),4);result.certificates=60;result.shutterPhotos=4;
 const select=id=>page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());
 const seek=t=>page.evaluate(t=>{window.systemExplorer.seek(t);return window.systemExplorer.getState();},t);
 const slot=kind=>page.evaluate(async kind=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261106r2');const d=SYSTEMS[window.systemExplorer.getState().selected];return d.timing.steps[d.record.steps.findIndex(s=>s.kind===kind)];},kind);
 await select('FS-MP23-1103-3');assert.equal((await page.evaluate(()=>window.systemExplorer.getState())).transitionSeconds,2.2);let timing=await slot('blanket');
 const flat=await seek(timing.start),bent=await seek(timing.start+timing.duration*.5);
 assert.ok(flat.construction.metal.some(p=>p.component==='blanket-wrap'&&p.visible&&p.wrapped===0));assert.ok(bent.construction.metal.some(p=>p.component==='blanket-wrap'&&p.visible&&p.wrapped>0&&p.wrapped<1));
 await page.locator('#heroMedia').screenshot({path:out+'live-sheet-wrapping.png'});result.slowZoomAndFlatSheet=true;
 timing=await slot('fixing');let s=await seek(timing.start+timing.duration*.5);assert.ok(s.construction.metal.some(p=>p.component==='winding-wire'&&p.wrapped>0&&p.wrapped<1));s=await seek(999);assert.ok(s.construction.metal.filter(p=>p.component==='winding-wire').every(p=>p.twisted===1));result.wireWinding=true;
 await select('FS-MP24-0617-17');await page.evaluate(()=>window.systemExplorer.overview());s=await page.evaluate(()=>window.systemExplorer.getState());assert.equal(s.routeVisibility.metal,true);assert.equal(s.routeVisibility.bundle,true);assert.ok(s.assemblies.metal.serviceEnds.front-s.assemblies.metal.serviceEnds.back>=7);result.continuousServices=true;
 await page.locator('#heroMedia').screenshot({path:out+'live-overview.png'});
 await select('FS-NP25-0224-05');timing=await slot('jacket');const lower=await seek(timing.start+timing.duration*.6);timing=await slot('blanket');const upper=await seek(timing.start+timing.duration*.6);assert.deepEqual(lower.camera,upper.camera);assert.equal(upper.assemblies.polymer.sectionSlabVisible,true);result.bothSlabFaces=true;
 const pdf=await page.locator('#installationSource').getAttribute('href');assert.match(pdf,/assets\/downloads\/firestop-certificates\/.*FS-NP25-0224-05\.pdf#page=/);const pdfResponse=await page.request.get(pdf.split('#')[0]);assert.equal(pdfResponse.status(),200);result.certificateLink=true;
 await page.locator('#heroMedia').screenshot({path:out+'live-floor.png'});
 await page.locator('[data-system="firewall"]').evaluate(b=>b.click());assert.ok((await page.locator('#systemDocuments a').evaluateAll(as=>as.map(a=>a.getAttribute('href')))).includes('#contact'));result.privateDocumentFallback=true;
 const layouts=[];
 for(const [width,height]of [[390,844],[320,640]]){
  await page.setViewportSize({width,height});await select('FS-NP25-0224-05');await seek(999);
  const l=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overlap:document.querySelector('#installationCaption').getBoundingClientRect().bottom>document.querySelector('#hero3d').getBoundingClientRect().top+1}));assert.equal(l.overflow,false);assert.equal(l.overlap,false);layouts.push({width,height,...l});if(width===390)await page.locator('#heroMedia').screenshot({path:out+'live-mobile.png'});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await fs.writeFile(out+'live-browser-checks.json',JSON.stringify({passed:true,base,...result,layouts,errors,bad},null,2)+'\n');console.log('Public browser checks passed');
}finally{await browser.close();}
