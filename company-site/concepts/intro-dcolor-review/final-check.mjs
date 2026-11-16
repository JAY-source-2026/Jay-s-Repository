import {chromium} from './browser/node_modules/playwright-core/index.mjs';
const out=process.argv[2],base=process.argv[3],tag=process.argv[4];
const browser=await chromium.launch({headless:true,executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const res={};
for(const [name,w,h] of [['pc',1366,768],['mobile',390,844]]){
 const ctx=await browser.newContext({viewport:{width:w,height:h}});await ctx.route(/google|clarity|bing/,r=>r.abort());
 const page=await ctx.newPage();page.setDefaultTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(!/google|clarity|bing/.test(r.url())&&r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'?intro=replay&v=20261116s15',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.doencIntro&&(doencIntro.state().ready||doencIntroBoot.reason));
 await page.evaluate(()=>doencIntro.pause());
 const d=(await page.evaluate(()=>doencIntro.state())).duration;const r={duration:d,errors};
 for(const f of [.2,.3,.45,.6,.72,.9]){await page.evaluate(t=>doencIntro.seek(t),+(d*f).toFixed(2));await page.screenshot({path:`${out}/${tag}-${name}-${String(f).replace('.','_')}.png`});}
 if(name==='pc'){await page.evaluate(d=>doencIntro.seek(d),d);}else{await page.locator('#introSkip').click();}
 await page.waitForFunction(()=>doencIntroBoot.reason);
 r.end=await page.evaluate(()=>({reason:doencIntroBoot.reason,hidden:document.getElementById('brandIntro').hidden,overflow:document.documentElement.scrollWidth>innerWidth}));
 res[name]=r;await ctx.close();
}
// 새 페이지 확인
const ctx=await browser.newContext({viewport:{width:1366,height:768}});await ctx.route(/google|clarity|bing/,r=>r.abort());const page=await ctx.newPage();res.pages={};
for(const p of ['business-firestop','business-fireproof','business-shutter','business-software','regulation']){const errors=[];const on=r=>{if(!/google|clarity|bing/.test(r.url())&&r.status()>=400)errors.push(r.status()+' '+r.url());};page.on('response',on);
 const resp=await page.goto(base+p+'.html',{waitUntil:'load'});await page.evaluate(async()=>{for(const i of document.images){i.loading='eager';}await Promise.all([...document.images].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r;})));});
 res.pages[p]={status:resp.status(),broken:await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)),notes:await page.evaluate(()=>document.querySelectorAll('.biz-fields .biz-note').length),errors};page.off('response',on);}
console.log(JSON.stringify(res,null,1));await browser.close();
