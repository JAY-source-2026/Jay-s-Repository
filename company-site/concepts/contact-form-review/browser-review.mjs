import { chromium } from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.REVIEW_BASE || 'http://127.0.0.1:8000/';
const out = new URL('./', import.meta.url).pathname;
const prefix = process.env.REVIEW_BASE ? 'live-' : '';
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});
page.setDefaultTimeout(30000);
const errors=[], bad=[], layouts=[], mails=[];
page.on('pageerror', e=>errors.push(e.message));
page.on('response', r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push({url:r.url(),status:r.status()});});
try {
  if (!prefix) {
    const reference = await browser.newPage({viewport:{width:1440,height:1000}});
    try {
      await reference.goto('https://www.eyecapkorea.com/ko/support/contact',{waitUntil:'domcontentloaded'});
      await reference.screenshot({path:out+'reference.png',fullPage:true});
    } catch(e) { console.log('Reference screenshot unavailable: '+e.message); }
    await reference.close();
  }
  await page.goto(base+'?v=20261111r1#contact',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#materialsHeading').textContent(),'내화채움구조 자재');
  assert.equal(await page.locator('#firestopCategory').textContent(),'내화채움구조 시공 시뮬레이션');
  assert.equal(await page.locator('#firewallCategory').textContent(),'내화구조 시공 시뮬레이션');
  assert.equal(await page.getByText('도면과 현장 조건을',{exact:false}).count(),0);
  for(const [width,height] of [[1440,900],[1366,768],[900,900],[760,900],[390,844],[320,740]]){
    await page.setViewportSize({width,height});
    await page.locator('#contact').evaluate(el=>el.scrollIntoView({behavior:'instant'}));
    await page.waitForTimeout(200);
    const layout=await page.evaluate(()=>({
      width:innerWidth, overflow:document.documentElement.scrollWidth-innerWidth,
      fields:[...document.querySelectorAll('#contact input:not([type=radio]),#contact select,#contact textarea')].map(el=>{
        const r=el.getBoundingClientRect();return {id:el.id,x:r.x,right:r.right,height:r.height};
      }),
      columns:getComputedStyle(document.querySelector('.ct-fields')).gridTemplateColumns
    }));
    assert(layout.overflow<=1,JSON.stringify(layout));
    assert(layout.fields.every(f=>f.x>=0&&f.right<=width&&f.height>=44),JSON.stringify(layout));
    layouts.push(layout);
    if([1366,390,320].includes(width)) await page.locator('#contact').screenshot({path:out+prefix+`contact-${width}.png`});
  }
  await page.setViewportSize({width:1366,height:900});
  await page.locator('.btn-send').click();
  assert.equal(await page.locator('#cf-name').getAttribute('aria-invalid'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cf-name');
  await page.locator('#cf-name').fill('   ');
  await page.locator('.btn-send').click();
  assert.equal(await page.locator('#cf-name').getAttribute('aria-invalid'),'true');
  await page.locator('#cf-name').fill('검수 담당자');
  await page.locator('#cf-company').fill('테스트 회사');
  await page.locator('#cf-contact').fill('010-1234-5678');
  await page.locator('#cf-email').fill('invalid-address');
  await page.locator('#cf-product').selectOption('셔터');
  await page.locator('#cf-message').fill('테스트 문의 & 도면 검토\n수량: 12개 / 일정: 협의');
  await page.locator('.btn-send').click();
  assert.equal(await page.locator('#cf-email').getAttribute('aria-invalid'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cf-email');
  await page.locator('#cf-email').fill('review@example.com');
  await page.locator('input[value="견적 요청"]').check();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  cdp.on('Page.frameRequestedNavigation',e=>{if(e.url.startsWith('mailto:'))mails.push(e.url);});
  for(const product of ['셔터','내화채움구조','내화구조','설계소프트웨어','기타']){
    await page.locator('#cf-product').selectOption(product);
    const before=mails.length;
    await page.locator('.btn-send').click();
    await page.waitForTimeout(150);
    assert.equal(mails.length,before+1,'mailto request');
    const url=new URL(mails.at(-1));
    assert.equal(url.pathname,product==='셔터'?'firescreen@doenc.com':'firestop@doenc.com');
    assert.equal(url.searchParams.get('subject'),`[견적 요청/${product}] 검수 담당자 · 테스트 회사`);
    for(const expected of ['검수 담당자','테스트 회사','010-1234-5678','review@example.com','테스트 문의 & 도면 검토\n수량: 12개 / 일정: 협의'])assert(url.searchParams.get('body').includes(expected));
  }
  assert(!(await page.locator('#formNote').textContent()).includes('접수 완료'));
  assert.equal(await page.locator('#cf-message').inputValue(),'테스트 문의 & 도면 검토\n수량: 12개 / 일정: 협의');
  for(const key of ['board','blanket','band']){
    await page.locator(`[data-material="${key}"]`).first().click();
    const note=await page.locator('#materialDialogNote').textContent();
    if(key==='board'){
      assert.equal(await page.locator('#materialDialogSpecs dt').filter({hasText:/^두께$/}).count(),1);
      assert(!(await page.locator('#materialDialogSpecs').textContent()).includes('카탈로그'));
    } else {
      assert(!note.includes('카탈로그'));
      assert(note.startsWith(key==='blanket'?'필요한 밀도·치수 조합':'표시한 두께·너비'));
    }
    await page.screenshot({path:out+prefix+`material-${key}.png`});
    await page.keyboard.press('Escape');
  }
  await page.locator('#technology').evaluate(el=>el.scrollIntoView({behavior:'instant'}));
  await page.waitForFunction(()=>!!window.systemExplorer);
  assert.equal(await page.locator('[data-certificate]').count(),60);
  for(const [width,height] of [[1366,768],[1366,650],[390,844]]){
    await page.setViewportSize({width,height});
    await page.locator('#technology').evaluate(el=>el.scrollIntoView({behavior:'instant'}));
    await page.waitForTimeout(300);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:out+prefix+`technology-${width}-${height}.png`});
  }
  assert.equal(await page.locator('[data-product-select]').count(),5);
  assert.equal(await page.locator('[data-shutter-select]').count(),4);
  assert.equal(await page.locator('[data-shutter-video]').count(),5);
  assert.deepEqual(errors,[]); assert.deepEqual(bad,[]);
  await fs.writeFile(out+prefix+'checks.json',JSON.stringify({passed:true,base,layouts,validation:true,mailRoutes:mails.map(m=>new URL(m).pathname),actualEmailSent:false,materialCopy:true,certificates:60,errors,bad},null,2)+'\n');
  console.log('PASS: responsive contact form, validation, five mail routes, product copy and 3D menus.');
} finally {await browser.close();}
