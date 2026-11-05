import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const out='/workspaces/Jay-s-Repository/company-site/concepts/model-fit-review';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.65,reducedMotion:'reduce'});page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8000/?v=20261105r6#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);console.log('ready');
 async function select(id){await page.locator(`[data-certificate="${id}"]`).evaluate(b=>b.click());}
 async function atKind(kind,ratio){return page.evaluate(async({kind,ratio})=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261105r6');const id=window.systemExplorer.getState().selected,d=SYSTEMS[id],i=d.record.steps.findIndex(s=>s.kind===kind),slot=d.timing.steps[i];window.systemExplorer.seek(slot.start+slot.duration*ratio);return window.systemExplorer.getState();},{kind,ratio});}
 async function shot(name){await page.locator('#heroMedia').screenshot({path:out+'/'+name+'.png'});console.log(name);}
 await select('FS-MP24-0617-15');await atKind('board',.5);await shot('small-pipe');
 await select('FS-MP25-1218-05');await page.evaluate(()=>window.systemExplorer.seek(999));await shot('large-400a');
 await select('FS-MP24-0617-21');await page.evaluate(()=>window.systemExplorer.seek(0));await shot('existing-insulation');
 await select('FS-MP25-0224-06');await page.evaluate(()=>window.systemExplorer.seek(0));await shot('duct-initial');
 await atKind('board',.18);await shot('duct-split-boards');
 await atKind('board',.92);await shot('duct-attached-boards');
 await select('FS-NP24-0617-5');const opened=await atKind('jacket',.25);await shot('jacket-open');const closed=await atKind('jacket',.98);await shot('jacket-closed');
 await page.setViewportSize({width:390,height:844});await select('FS-MP25-1218-05');await page.evaluate(()=>window.systemExplorer.seek(999));await shot('large-mobile');
 await fs.writeFile(out+'/first-browser.json',JSON.stringify({errors,opened:opened.construction.polymer,closed:closed.construction.polymer},null,2));
 console.log('complete',errors);
}finally{await browser.close();}
