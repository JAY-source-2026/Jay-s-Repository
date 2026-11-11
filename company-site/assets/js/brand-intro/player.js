const boot=window.doencIntroBoot,overlay=document.getElementById('brandIntro');
const duration=28,clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p;
const phase=(t,a,b)=>{const x=clamp((t-a)/(b-a));return x*x*x*(x*(6*x-15)+10);};
let studio,elapsed=0,paused=false,ready=false,raf=0,last=0,resizeObserver,frameState={},scenePose=null,errors=[];
const stage=document.getElementById('introStage'),backdrop=document.getElementById('introBackdrop'),products=document.getElementById('introProducts'),pauseButton=document.getElementById('introPause'),progress=document.getElementById('introProgress');
let jacket,board,shadow,sourceJacket,sourceBoard;
function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
function cleanup(){stop();resizeObserver?.disconnect();studio?.dispose();studio=null;products.replaceChildren();}
document.addEventListener('doenc:intro-finished',cleanup,{once:true});
function schedule(){if(boot.active&&ready&&!paused&&!document.hidden&&!raf)raf=requestAnimationFrame(tick);}
function setPaused(value){paused=value;pauseButton.textContent=paused?'재생':'일시정지';pauseButton.setAttribute('aria-label',paused?'인트로 재생':'인트로 일시정지');paused?stop():schedule();}
function rectangle(el){const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}
function paint(){
 if(!boot.active||!studio)return;
 const t=elapsed,poseTime=Math.min(t,20.1);
 // After the 3D opening, only the published product images move. Avoid
 // rendering the covered WebGL scene during the homepage handoff.
 const state=scenePose?.time===poseTime?scenePose:(scenePose=studio.render(poseTime)),travel=phase(t,20.3,26.6);
 const end=rectangle(sourceJacket),b=rectangle(sourceBoard),start=state.seedScreen;
 const startHeight=start.height*1.1,startWidth=startHeight*(sourceJacket.naturalWidth/sourceJacket.naturalHeight);
 const w=mix(startWidth,end.width,travel),h=mix(startHeight,end.height,travel),x=mix(start.x,end.x+end.width/2,travel),y=mix(start.y,end.y+end.height/2,travel);
 const distance=end.x+end.width/2-start.x,averageRadius=(startHeight+end.height)/4;
 const angle=-(1-travel)*distance/Math.max(1,averageRadius)*180/Math.PI;
 jacket.style.width=`${w}px`;jacket.style.height=`${h}px`;jacket.style.transform=`translate(${x-w/2}px,${y-h/2}px) rotate(${angle}deg)`;jacket.style.opacity=phase(t,18.6,19.5);
 const boardOpacity=phase(t,22.2,24.2);board.style.width=`${b.width}px`;board.style.height=`${b.height}px`;board.style.transform=`translate(${b.x}px,${b.y+(1-boardOpacity)*12}px)`;board.style.opacity=boardOpacity;
 shadow.style.left=`${x}px`;shadow.style.top=`${y+h*.47}px`;shadow.style.width=`${w*1.08}px`;shadow.style.height=`${h*.18}px`;shadow.style.opacity=phase(t,18.8,19.6)*(1-phase(t,26.5,27.8));
 const reveal=phase(t,23.8,27.6);document.documentElement.style.setProperty('--intro-reveal',reveal);
 backdrop.style.opacity=1-phase(t,22,27.6);stage.style.opacity=1-phase(t,19.6,21.4);
 progress.style.transform=`scaleX(${t/duration})`;
 document.querySelector('.intro-controls').style.opacity=1-phase(t,26.6,27.8);
 frameState={...state,time:t,travel,reveal,jacket:{x:x-w/2,y:y-h/2,width:w,height:h,angle,opacity:Number(jacket.style.opacity)},targetJacket:end,board:{x:b.x,y:b.y,width:b.width,height:b.height,opacity:boardOpacity},imageSources:[sourceBoard.getAttribute('src'),sourceJacket.getAttribute('src')]};
}
function tick(now){raf=0;if(!boot.active||paused||document.hidden){last=0;return;}if(last)elapsed=Math.min(duration,elapsed+Math.min((now-last)/1000,.15));last=now;paint();if(elapsed>=duration)boot.finish('complete');else schedule();}
function resize(){if(!studio||!boot.active)return;studio.resize(overlay.clientWidth,overlay.clientHeight);scenePose=null;paint();}
pauseButton?.addEventListener('click',()=>setPaused(!paused));
document.addEventListener('visibilitychange',()=>document.hidden?stop():schedule());
window.doencIntro={seek(t){if(!ready||!boot.active)return this.state();stop();paused=true;elapsed=Math.max(0,Math.min(duration,t));paint();setPaused(true);if(elapsed>=duration)boot.finish('complete');return this.state();},play(){setPaused(false);},pause(){setPaused(true);},finish:reason=>boot.finish(reason||'skip'),state(){return{active:boot.active,reason:boot.reason,ready,elapsed,paused,duration,errors:[...errors],frame:frameState,scene:studio?.getState()};}};
if(boot.active){
 try{
  sourceJacket=document.querySelector('.signature-product-jacket');sourceBoard=document.querySelector('.signature-product-board');
  await Promise.all([sourceJacket.decode(),sourceBoard.decode(),document.fonts.ready]);
  if(boot.active){
   for(const [src,key]of [[sourceBoard,'board'],[sourceJacket,'jacket']]){const img=new Image();img.src=src.currentSrc;img.alt='';img.className=`intro-product intro-${key}`;img.draggable=false;products.append(img);if(key==='board')board=img;else jacket=img;}
   shadow=document.createElement('div');shadow.className='intro-product-shadow';products.prepend(shadow);
   const {createScene}=await import('./scene.js?v=20261111s5');
   if(boot.active){studio=await createScene(stage,()=>boot.finish('webgl-lost'));if(boot.active){ready=true;boot.markReady();studio.resize(overlay.clientWidth,overlay.clientHeight);paint();resizeObserver=new ResizeObserver(resize);resizeObserver.observe(overlay);schedule();}else{studio.dispose();studio=null;}}
  }
 }catch(e){errors.push(e.message);boot.finish('unavailable');}
}
