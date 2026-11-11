import {chromium} from '/tmp/doenc-browser/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/tmp/doenc-browser/browsers/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/assets/images/doenc_mark.png');
 const result=await page.evaluate(async()=>{
  const data=await fetch('/assets/media/intro/logo-vector.json').then(r=>r.json());
  const im=new Image();im.src='/assets/images/doenc_mark.png';await im.decode();
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const original=ctx.getImageData(0,0,c.width,c.height).data;
  const compare=contours=>{ctx.clearRect(0,0,c.width,c.height);ctx.beginPath();for(const p of [contours.outer,contours.hole,contours.dot]){ctx.moveTo(...p.start);for(const c of p.curves)ctx.bezierCurveTo(...c);ctx.closePath();}ctx.fill('evenodd');const actual=ctx.getImageData(0,0,c.width,c.height).data;let union=0,intersection=0,mismatch=0,interiorMismatch=0;for(let i=3;i<original.length;i+=4){const a=original[i]>=128,b=actual[i]>=128;union+=a||b;intersection+=a&&b;mismatch+=a!==b;if(a!==b){const pixel=(i-3)/4,x=pixel%c.width,y=Math.floor(pixel/c.width);let edge=false;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<c.width&&yy<c.height&&((original[(yy*c.width+xx)*4+3]>=128)!==a))edge=true;}if(!edge)interiorMismatch++;}}return{intersection,union,mismatch,interiorMismatch,iou:intersection/union};};
  return{source:'assets/images/doenc_mark.png',width:c.width,height:c.height,vector:compare(data.paths),method:data.vectorMethod};
 });
 console.log(JSON.stringify(result));assert(result.vector.iou>.985);assert.equal(result.vector.interiorMismatch,0);
 await fs.writeFile(new URL('outline-check.json',import.meta.url),JSON.stringify({passed:true,...result},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
