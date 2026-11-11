import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,executablePath:'/tmp/doenc-browser/browsers/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1,reducedMotion:'no-preference'});page.setDefaultTimeout(120000);
 const errors=[],bad=[],states=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('127.0.0.1')&&r.status()>=400)bad.push(r.url());});
 await page.route(/google|clarity|bing/,r=>r.abort());
 await page.goto('http://127.0.0.1:8000/?intro=replay&v=20261111s4',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.doencIntro?.state().ready||window.doencIntroBoot?.reason);console.log('READY',await page.evaluate(()=>({boot:doencIntroBoot,state:doencIntro?.state()})));
 if(!(await page.evaluate(()=>doencIntro?.state().ready)))throw new Error('Intro did not initialize');
 await page.evaluate(()=>doencIntro.pause());
 for(const [name,t]of [['clean-d',4.9],['impact',5.48],['logo',13.7],['cut-o',16],['photo-morph',19.1],['photo-roll',22.4],['handoff',25.8],['landed',27.8]]){
  const s=await page.evaluate(t=>doencIntro.seek(t),t);states.push(s);await page.screenshot({path:out+name+'.png',timeout:120000});console.log(name);
 }
 await page.evaluate(()=>doencIntro.seek(28));await page.screenshot({path:out+'homepage.png',timeout:120000});
 await fs.writeFile(out+'first-checks.json',JSON.stringify({errors,bad,states,completed:await page.evaluate(()=>doencIntro.state())},null,2));console.log('DONE',JSON.stringify({errors,bad}));
}finally{await browser.close();}
