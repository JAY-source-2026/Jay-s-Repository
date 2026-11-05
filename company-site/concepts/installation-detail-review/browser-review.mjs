import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspaces/Jay-s-Repository/company-site/concepts/installation-detail-review';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.65,reducedMotion:'reduce'});
page.setDefaultTimeout(90000);
const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8000/')&&r.status()>=400)bad.push(r.url());});
const results={};
try{
 await page.goto('http://127.0.0.1:8000/?v=20261105r5#technology',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>!!window.systemExplorer);console.log('ready');
 assert.equal(await page.locator('[data-certificate]').count(),60);
 async function select(id){await page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());}
 async function seek(t){return page.evaluate(t=>{window.systemExplorer.seek(t);return window.systemExplorer.getState();},t);}
 async function capture(name,t){await seek(t);await page.locator('#heroMedia').screenshot({path:out+'/'+name+'.png'});console.log('captured',name);}
 await select('FS-MP24-0617-15');
 const half=await seek(2.25),parts=half.construction.metal.filter(p=>p.component==='board-half'&&p.face===1);
 assert.equal(parts.length,2);assert.ok(parts[0].offset[1]>0&&parts[1].offset[1]<0);assert.notEqual(Math.abs(parts[0].offset[1]),Math.abs(parts[1].offset[1]));
 await capture('board-halves',2.25);
 const installed=await seek(4.65);assert.ok(installed.construction.metal.filter(p=>p.component==='board-half').every(p=>p.offset.every(x=>Math.abs(x)<.0001)));
 await capture('board-installed',4.65);
 const a=await seek(6),b=await seek(7.4);
 const sa=a.construction.metal.filter(p=>p.component==='sealant-pass'),sb=b.construction.metal.filter(p=>p.component==='sealant-pass');
 assert.ok(sa[0].toolVisible&&sb[0].toolVisible&&sb[0].progress>sa[0].progress);assert.notDeepEqual(sa[0].nozzle,sb[0].nozzle);
 assert.match(await page.locator('#installationTitle').textContent(),/실란트/);
 assert.match(await page.locator('#installationSource').getAttribute('href'),/FS-MP24-0617-15.pdf#page=8$/);
 await capture('sealant-cartridge',7.4);
 const complete=await seek(999);assert.ok(complete.construction.metal.filter(p=>p.component==='sealant-pass').every(p=>p.progress===1&&!p.toolVisible));
 results.splitBoard=true;results.progressiveSealant=true;
 await select('FS-MP23-1103-3');await capture('blanket',999);
 results.blanketPhoto=await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('/products/blanket.webp')));assert.ok(results.blanketPhoto);
 await select('FS-NP25-0224-05');
 const slots=await page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261105r5');return SYSTEMS.polymer.record.steps.map((s,i)=>({kind:s.kind,faces:s.faces,start:SYSTEMS.polymer.timing.steps[i].start}));});
 const jacket=slots.find(s=>s.kind==='jacket');const lower=await seek(jacket.start+1);assert.ok(lower.camera[1]<lower.target[1]);assert.ok(lower.polymer.pipeVisible);
 results.lowerFace=true;
 await select('FS-MP25-0224-06');await seek(18);assert.equal(await page.locator('#installationCaption').isVisible(),true);
 await select('FS-MP25-0625-02');await seek(7.4);assert.equal((await page.evaluate(()=>window.systemExplorer.getState())).assemblies.bundle.pipes,3);
 await page.locator('[data-system="firewall"]').evaluate(b=>b.click());await capture('firewall-sealant',18.3);
 const firewall=await page.evaluate(()=>window.systemExplorer.getState());assert.ok(firewall.construction.firewall[0].toolVisible);
 assert.equal(firewall.fireObjects,0);assert.equal(firewall.damperObjects,0);
 await select('FS-MP24-0617-15');
 const layouts=[];
 for(const [width,height]of [[1440,1000],[1366,650],[1024,600],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await seek(7.4);
  const l=await page.evaluate(()=>{const c=document.querySelector('#installationCaption').getBoundingClientRect(),r=document.querySelector('#hero3d').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,overlap:c.bottom>r.top+1,captionVisible:c.height>0,canvasHeight:r.height};});
  assert.equal(l.overflow,false);assert.equal(l.overlap,false);assert.ok(l.captionVisible&&l.canvasHeight>=390);layouts.push({width,height,...l});
  if(width===390)await page.locator('#heroMedia').screenshot({path:out+'/mobile.png'});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-cert-toggle="metal"]').focus();await page.keyboard.press('Enter');
 await page.locator('#certificates-metal [data-certificate]').first().focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 assert.match(await page.locator('#installationSource').textContent(),new RegExp((await page.locator('#certificates-metal [data-certificate]').nth(1).getAttribute('data-certificate'))));
 const step=page.locator('#systemSteps button').nth(2);await step.focus();await page.keyboard.press('Enter');assert.equal(await step.getAttribute('aria-current'),'step');results.keyboard=true;
 await page.locator('#explorerOverview').evaluate(b=>b.click());assert.equal(await page.locator('#installationCaption').isVisible(),false);
 await select('FS-MP24-0617-15');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('#explorerReplay').evaluate(b=>b.click());
 const speed=await page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261105r5');const s=window.systemExplorer.getState();return {zoom:s.transitionSeconds,firstConstruction:SYSTEMS.metal.timing.steps[2].start,totalToConstruction:s.transitionSeconds+SYSTEMS.metal.timing.steps[2].start};});
 assert.equal(speed.zoom,.65);assert.ok(speed.totalToConstruction<2);results.speed=speed;
 await page.evaluate(()=>window.systemExplorer.stop());
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await fs.writeFile(out+'/checks.json',JSON.stringify({passed:true,certificates:60,...results,layouts,errors,bad,deviceScaleFactor:.65},null,2)+'\n');
 console.log('all browser checks passed',JSON.stringify(results));
}finally{await browser.close();}
