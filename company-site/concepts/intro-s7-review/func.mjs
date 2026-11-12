import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'/tmp/doenc-browser/browsers/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const out={};
for(const [name,w,h] of [['pc',1366,768],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width:w,height:h}});await context.route(/google|clarity|bing/,r=>r.abort());
 const page=await context.newPage();page.setDefaultTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('127.0.0.1')&&r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto('http://127.0.0.1:8000/?intro=replay&v=20261112s7',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.doencIntro&&(doencIntro.state().ready||doencIntroBoot.reason));
 const r={};
 await page.evaluate(()=>doencIntro.pause());
 const a=await page.evaluate(()=>doencIntro.seek(5.5)),b=await page.evaluate(()=>doencIntro.seek(4.9)),c=await page.evaluate(()=>doencIntro.seek(13.7));
 r.shake=[a.frame.impact.shakeX,a.frame.impact.shakeY,a.frame.impact.roll,a.frame.impact.bounce];r.fireUnderD=b.frame.fireCompression.flameTop<=b.frame.fireCompression.underSide;r.logoScale=c.frame.logoScale;r.quality=c.frame.quality;r.logoCut=c.scene.logoCut;
 if(name==='pc'){await page.evaluate(()=>doencIntro.seek(28));r.end=await page.evaluate(()=>({reason:doencIntroBoot.reason,hidden:document.getElementById('brandIntro').hidden,inert:document.getElementById('main').inert,explorer:true}));}
 else{await page.locator('#introSkip').click();r.end=await page.evaluate(()=>({reason:doencIntroBoot.reason,hidden:document.getElementById('brandIntro').hidden,inert:document.getElementById('main').inert}));}
 r.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);r.errors=errors;out[name]=r;await context.close();
}
console.log(JSON.stringify(out,null,1));await browser.close();
