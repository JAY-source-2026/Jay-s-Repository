import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspaces/Jay-s-Repository/company-site/concepts/installation-detail-review';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:320,height:640},deviceScaleFactor:.5,reducedMotion:'reduce'});page.setDefaultTimeout(90000);
 await page.goto('http://127.0.0.1:8000/?v=20261105r5#technology',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.systemExplorer);
 await page.locator('[data-certificate="FS-MP26-0507-14"]').evaluate(b=>b.click());
 const result=await page.evaluate(async()=>{const {SYSTEMS}=await import('./assets/js/systems.js?v=20261105r5');const d=SYSTEMS.duct,i=d.record.steps.findIndex(s=>s.kind==='insulation-band');window.systemExplorer.seek(d.timing.steps[i].start+1);const c=document.querySelector('#installationCaption'),r=document.querySelector('#hero3d');return {text:document.querySelector('#installationDescription').textContent,captionHeight:c.getBoundingClientRect().height,overlap:c.getBoundingClientRect().bottom>r.getBoundingClientRect().top+1,overflow:document.documentElement.scrollWidth>innerWidth,source:document.querySelector('#installationSource').href};});
 assert.ok(result.text.length<200);assert.equal(result.overlap,false);assert.equal(result.overflow,false);assert.ok(result.captionHeight<300);
 await page.locator('#heroMedia').screenshot({path:out+'/duct-mobile.png'});
 await fs.writeFile(out+'/caption-checks.json',JSON.stringify({passed:true,...result},null,2)+'\n');console.log('long specification summary on 320px passed');
}finally{await browser.close();}
