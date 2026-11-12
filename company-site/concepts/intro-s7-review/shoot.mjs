import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
const [,,out,ver,timesArg,w='1366',h='768',clipArg]=process.argv;
const times=timesArg.split(',').map(Number);
const browser=await chromium.launch({headless:true,executablePath:'/tmp/doenc-browser/browsers/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:+w,height:+h},deviceScaleFactor:1});await context.route(/google|clarity|bing/,r=>r.abort());
const page=await context.newPage();page.setDefaultTimeout(180000);const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
await page.goto('http://127.0.0.1:8000/?intro=replay&v='+ver,{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.doencIntro&&(doencIntro.state().ready||doencIntroBoot.reason));
console.log('reason',await page.evaluate(()=>doencIntroBoot.reason));
await page.evaluate(()=>doencIntro.pause());
for(const t of times){const s=await page.evaluate(t=>{const s=doencIntro.seek(t);return{q:s.frame.quality,scale:s.frame.logoScale,impact:s.frame.impact,fire:s.frame.fire};},t);
 const opt={path:`${out}/t${String(t).replace('.','_')}-${w}.png`};if(clipArg){const [x,y,cw,ch]=clipArg.split(',').map(Number);opt.clip={x,y,width:cw,height:ch};}
 await page.screenshot(opt);console.log(t,JSON.stringify(s));}
console.log('overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'errors',JSON.stringify(errors));
await browser.close();
