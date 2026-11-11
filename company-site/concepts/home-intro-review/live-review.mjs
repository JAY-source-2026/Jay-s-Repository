import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url).pathname,base='https://jay-source-2026.github.io/Jay-s-Repository/company-site/';
const browser=await chromium.launch({headless:true,executablePath:'/tmp/doenc-browser/browsers/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:.8});await context.route(/google|clarity|bing/,r=>r.abort());
 const page=await context.newPage();page.setDefaultTimeout(150000);const errors=[],bad=[],states=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
 await page.goto(base+'?intro=replay&v=20261111s4',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.doencIntro?.state().ready||window.doencIntroBoot?.reason);assert.equal(await page.evaluate(()=>doencIntroBoot.reason),null);await page.evaluate(()=>doencIntro.pause());
 for(const [name,t]of [['live-d',4.9],['live-impact',5.48],['live-roll',22.4],['live-landing',27.8]]){states.push(await page.evaluate(t=>doencIntro.seek(t),t));await page.screenshot({path:out+name+'.png',timeout:150000});console.log(name);}
 await page.evaluate(()=>doencIntro.play());await page.waitForFunction(()=>!doencIntroBoot.active);assert.equal(await page.evaluate(()=>doencIntroBoot.reason),'complete');assert(!await page.locator('#main').evaluate(el=>el.inert));await page.screenshot({path:out+'live-homepage.png',timeout:150000});
 await page.locator('[data-product-select="board"]').click();assert.equal(await page.locator('[data-product-select="board"]').getAttribute('aria-pressed'),'true');await page.close();
 console.log('desktop natural handoff passed');
 const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});mobile.setDefaultTimeout(150000);await mobile.goto(base+'?intro=replay&v=20261111s4',{waitUntil:'domcontentloaded'});await mobile.locator('#introSkip').click();assert.equal(await mobile.evaluate(()=>doencIntroBoot.reason),'skip');assert(!await mobile.locator('#main').evaluate(el=>el.inert));await mobile.screenshot({path:out+'live-mobile-skip.png',timeout:150000});await mobile.locator('#navToggle').click();assert.equal(await mobile.locator('#navToggle').getAttribute('aria-expanded'),'true');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await fs.writeFile(out+'live-checks.json',JSON.stringify({passed:true,states,desktopNaturalHandoff:true,mobileSkip:true,productMenu:true,mobileMenu:true,errors,bad},null,2));console.log('LIVE PASS');
}finally{await browser.close();}
