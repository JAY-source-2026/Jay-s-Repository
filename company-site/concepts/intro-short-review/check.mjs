// Review script for the shortened intro cuts (?cut=a, ?cut=b). Needs a local playwright install.
import {chromium} from '/tmp/claude-1000/-workspaces-Jay-s-Repository/1ac2ae99-c7d2-41f0-9f7b-b9d8dd228ce0/scratchpad/browser/node_modules/playwright/index.mjs';
const out=process.argv[2];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const result={};
for(const cut of ['final'])for(const [name,w,h] of [['pc',1366,768],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});await context.route(/google|clarity|bing/,r=>r.abort());
 const page=await context.newPage();page.setDefaultTimeout(240000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(!/google|clarity|bing/.test(r.url())&&r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto((process.argv[3]||'http://127.0.0.1:8000/')+'?intro=replay&v=20261112s13',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.doencIntro&&(doencIntro.state().ready||doencIntroBoot.reason));
 await page.evaluate(()=>doencIntro.pause());
 const r={};const s0=await page.evaluate(()=>doencIntro.state());r.duration=s0.duration;r.reasonAtStart=s0.reason;
 if(name==='pc'){
  const d=s0.duration;r.frames=[];
  for(const f of [0,.2,.3,.45,.53,.6,.63,.72,.78,.9,.97]){const t=+(d*f).toFixed(2);const s=await page.evaluate(t=>doencIntro.seek(t),t);r.frames.push([t,+s.frame.time.toFixed(2)]);
   if(cut)await page.screenshot({path:`${out}/${cut}-t${String(t).replace('.','_')}.png`});}
  await page.evaluate(d=>doencIntro.seek(d),d);
 }else{
  // Real-time playback for 3 seconds, then SKIP.
  await page.evaluate(()=>doencIntro.seek(0));await page.evaluate(()=>doencIntro.play());await page.waitForTimeout(3000);
  const s=await page.evaluate(()=>doencIntro.state());r.played={elapsed:+s.elapsed.toFixed(2),story:+s.frame.time.toFixed(2)};
  await page.locator('#introSkip').click();
 }
 r.end=await page.evaluate(()=>({reason:doencIntroBoot.reason,hidden:document.getElementById('brandIntro').hidden,inert:document.getElementById('main').inert,introActive:document.documentElement.classList.contains('intro-active')}));
 r.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);r.errors=errors;
 if(cut&&name==='pc')await page.screenshot({path:`${out}/${cut}-homepage.png`});
 result[(cut||'full')+'-'+name]=r;await context.close();
}
console.log(JSON.stringify(result,null,1));await browser.close();
