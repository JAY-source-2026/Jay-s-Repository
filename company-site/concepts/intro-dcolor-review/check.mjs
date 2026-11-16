import {chromium} from './browser/node_modules/playwright-core/index.mjs';
const out=process.argv[2];
const browser=await chromium.launch({headless:true,executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const res={};
for(const k of ['base','a','b','c']){
 const ctx=await browser.newContext({viewport:{width:1366,height:768}});await ctx.route(/google|clarity|bing/,r=>r.abort());
 const page=await ctx.newPage();page.setDefaultTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/?intro=replay&v=20261116s14'+(k==='base'?'':'&dcolor='+k),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.doencIntro&&(doencIntro.state().ready||doencIntroBoot.reason));
 await page.evaluate(()=>doencIntro.pause());
 const d=(await page.evaluate(()=>doencIntro.state())).duration;res[k]={d,errors,frames:[]};
 for(const f of [.2,.3,.45,.6,.9]){const t=+(d*f).toFixed(2);const s=await page.evaluate(t=>doencIntro.seek(t),t);res[k].frames.push([t,+s.frame.time.toFixed(2)]);await page.screenshot({path:`${out}/${k}-${String(f).replace('.','_')}.png`});}
 await ctx.close();
}
console.log(JSON.stringify(res));await browser.close();
