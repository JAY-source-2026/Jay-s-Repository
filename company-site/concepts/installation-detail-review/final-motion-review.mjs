import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspaces/Jay-s-Repository/company-site/concepts/installation-detail-review';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:.65});
page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8000/?v=20261105r5#technology',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>!!window.systemExplorer);
 await page.locator('[data-certificate="FS-MP24-0617-15"]').evaluate(b=>b.click());
 await page.locator('#hero3d').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>window.systemExplorer.getState().elapsed>2.25);
 const motion=await page.evaluate(()=>{window.systemExplorer.stop();return window.systemExplorer.getState();});
 assert.equal(motion.selected,'metal');assert.equal(motion.mode,'install');assert.ok(motion.elapsed>2.25&&motion.elapsed<10);assert.ok(motion.construction.metal.some(p=>p.component==='board-half'&&p.visible));
 console.log('live replay passed',motion.elapsed);
 await page.evaluate(()=>window.systemExplorer.seek(7.4));
 await page.locator('#heroMedia').screenshot({path:out+'/sealant-cartridge.png'});
 await page.evaluate(()=>window.systemExplorer.seek(2.25));
 await page.locator('#heroMedia').screenshot({path:out+'/board-halves.png'});
 await page.evaluate(()=>window.systemExplorer.seek(4.65));
 await page.locator('#heroMedia').screenshot({path:out+'/board-installed.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.systemExplorer.seek(7.4));
 await page.locator('#heroMedia').screenshot({path:out+'/mobile.png'});
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/final-motion-checks.json',JSON.stringify({passed:true,liveReplayElapsed:motion.elapsed,zoomSeconds:motion.transitionSeconds,errors},null,2)+'\n');
 console.log('final visuals and live motion passed');
}finally{await browser.close();}
