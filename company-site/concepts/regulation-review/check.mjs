// Review script for regulation.html (품질인정제도). Needs a local playwright install.
import {chromium} from '/tmp/claude-1000/-workspaces-Jay-s-Repository/1ac2ae99-c7d2-41f0-9f7b-b9d8dd228ce0/scratchpad/browser/node_modules/playwright/index.mjs';
const out=process.argv[2],base=process.argv[3]||'http://127.0.0.1:8000/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});const result={};
for(const [name,w,h] of [['pc',1366,768],['mobile',390,844],['small',320,700]]){
 const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});await context.route(/google|clarity|bing/,r=>r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(!/google|clarity|bing/.test(r.url())&&r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'regulation.html?v=20261113r1',{waitUntil:'networkidle'});await page.waitForTimeout(800);
 const r={};
 r.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 r.wide=await page.evaluate(()=>[...document.querySelectorAll('#main *')].filter(e=>!e.closest('.reg-tabs-list')&&e.getBoundingClientRect().right>innerWidth+1).slice(0,5).map(e=>e.className||e.tagName));
 r.links=await page.evaluate(()=>[...document.querySelectorAll('#main a')].map(a=>a.getAttribute('href')));
 await page.screenshot({path:out+'/'+name+'-full.png',fullPage:true});
 await page.screenshot({path:out+'/'+name+'-top.png'});
 r.tabs=[];for(const id of ['laws','system','process','difference','documents']){await page.evaluate(id=>{const y=document.getElementById(id).getBoundingClientRect().top+scrollY-170;scrollTo(0,y);},id);await page.waitForTimeout(1300);r.tabs.push(await page.evaluate(()=>document.querySelector('#regTabs a.on')?.hash));if(name!=='small')await page.screenshot({path:out+'/'+name+'-'+id+'.png'});}
 if(name==='pc'){await page.evaluate(()=>scrollTo(0,0));await page.hover('.nav-item[data-nav="business"] .nav-top');await page.waitForTimeout(700);await page.screenshot({path:out+'/pc-menu.png'});
  r.menu=await page.evaluate(()=>[...document.querySelectorAll('.nav-item[data-nav="business"] .nav-sub a')].map(a=>({t:a.textContent,bottom:Math.round(a.getBoundingClientRect().bottom)})));
  for(const p of ['index.html?intro=off','about.html','archive.html','support.html']){await page.goto(base+p,{waitUntil:'domcontentloaded'});r[p]=await page.evaluate(()=>document.querySelectorAll('a[href="regulation.html"]').length);}}
 else if(name==='mobile'){await page.evaluate(()=>scrollTo(0,0));await page.click('#navToggle');await page.waitForTimeout(400);await page.click('.mnav-top:has-text("사업영역")');await page.waitForTimeout(400);await page.screenshot({path:out+'/mobile-menu.png'});}
 r.errors=errors;result[name]=r;await context.close();}
console.log(JSON.stringify(result,null,1));await browser.close();
