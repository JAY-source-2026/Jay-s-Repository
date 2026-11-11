(() => {
 const root=document.documentElement,query=new URLSearchParams(location.search),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const forced=query.get('intro')==='replay',section=!location.hash||['#home','#top'].includes(location.hash);
 let seen=false;try{seen=sessionStorage.getItem('doenc-intro-s4')==='seen';}catch{}
 const boot=window.doencIntroBoot={active:section&&query.get('intro')!=='off'&&!reduced.matches&&(!seen||forced),reason:null,ready:false};
 if(boot.active){root.style.setProperty('--intro-scrollbar-gap',`${Math.max(0,innerWidth-root.clientWidth)}px`);root.classList.add('intro-active');}
 let watchdog,overlay,saved=[];
 function finish(reason='skip'){
  if(!boot.active)return;boot.active=false;boot.reason=reason;clearTimeout(watchdog);
  const focusWasInside=overlay?.contains(document.activeElement);
  root.classList.remove('intro-active');root.style.removeProperty('--intro-reveal');root.style.removeProperty('--intro-scrollbar-gap');
  if(overlay)overlay.hidden=true;
  for(const [el,inert]of saved)el.inert=inert;saved=[];
  try{sessionStorage.setItem('doenc-intro-s4','seen');}catch{}
  if(focusWasInside){const heading=document.getElementById('introHeading');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}
  document.dispatchEvent(new CustomEvent('doenc:intro-finished',{detail:{reason}}));
 }
 boot.finish=finish;boot.markReady=()=>{boot.ready=true;clearTimeout(watchdog);};
 function setup(){
  overlay=document.getElementById('brandIntro');if(!overlay||!boot.active)return;
  overlay.hidden=false;
  for(const el of document.body.children)if(el!==overlay&&!['SCRIPT','STYLE'].includes(el.tagName)){saved.push([el,el.inert]);el.inert=true;}
  document.getElementById('introSkip').addEventListener('click',()=>finish('skip'));
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finish('escape');}});
  watchdog=setTimeout(()=>finish('loading-timeout'),60000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
 reduced.addEventListener('change',e=>{if(e.matches)finish('reduced-motion');});
 window.addEventListener('hashchange',()=>{if(location.hash&&!['#home','#top'].includes(location.hash))finish('section-link');});
 window.addEventListener('pagehide',()=>finish('pagehide'));
 window.addEventListener('pageshow',e=>{if(e.persisted)finish('history');});
})();
