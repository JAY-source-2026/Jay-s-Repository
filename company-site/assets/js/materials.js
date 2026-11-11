import {PRODUCTS} from './product-data.js?v=20261111r1';
const dialog=document.getElementById('materialDialog');
if(dialog){
  const $=id=>document.getElementById(id),close=dialog.querySelector('.material-dialog-close');
  const scrollArea=dialog.querySelector('.material-dialog-scroll');
  let opener,scrollY=0,bodyStyles=null,resumeExplorer=false,backdropDown=false;
  const element=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
  function lockScroll(){
    scrollY=window.scrollY;
    bodyStyles=Object.fromEntries(['position','top','width','overflow','paddingRight'].map(key=>[key,document.body.style[key]]));
    const gutter=window.innerWidth-document.documentElement.clientWidth;
    const padding=parseFloat(getComputedStyle(document.body).paddingRight)||0;
    Object.assign(document.body.style,{position:'fixed',top:`-${scrollY}px`,width:'100%',overflow:'hidden',paddingRight:`${padding+gutter}px`});
  }
  function unlockScroll(){
    if(!bodyStyles)return;
    Object.assign(document.body.style,bodyStyles);bodyStyles=null;
    window.scrollTo({top:scrollY,behavior:'instant'});
  }
  function openProduct(key,trigger){
    const product=PRODUCTS[key];if(!product)return;
    opener=trigger;
    dialog.dataset.product=key;
    $('materialDialogCode').textContent=product.code;
    $('materialDialogTitle').textContent=product.name;
    $('materialDialogSummary').textContent=product.summary;
    const image=$('materialDialogImage');image.src=product.image;image.alt=product.name+' 제품 이미지';image.width=product.width;image.height=product.height;
    $('materialDialogSpecs').replaceChildren(...product.specs.map(([label,value])=>{const row=document.createElement('div');row.append(element('dt',label),element('dd',value));return row;}));
    $('materialDialogDescription').replaceChildren(...product.description.map(text=>element('p',text)));
    $('materialDialogNote').textContent=product.note;
    if(!dialog.open){
      resumeExplorer=Boolean(window.systemExplorer?.getState().running);if(resumeExplorer)window.systemExplorer.stop();
      lockScroll();dialog.showModal();
    }
    scrollArea.scrollTop=0;$('materialDialogTitle').focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-material]');
    if(trigger&&PRODUCTS[trigger.dataset.material]){event.preventDefault();openProduct(trigger.dataset.material,trigger);}
  });
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const stops=[close,scrollArea],active=document.activeElement;
    if(!stops.includes(active)||event.shiftKey&&active===stops[0]||!event.shiftKey&&active===stops.at(-1)){
      event.preventDefault();(event.shiftKey?stops.at(-1):stops[0]).focus({preventScroll:true});
    }
  });
  const outside=event=>{const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  dialog.addEventListener('pointerdown',event=>{backdropDown=event.target===dialog&&outside(event);});
  dialog.addEventListener('pointerup',event=>{if(backdropDown&&event.target===dialog&&outside(event))dialog.close();backdropDown=false;});
  dialog.addEventListener('pointercancel',()=>{backdropDown=false;});
  dialog.addEventListener('close',()=>{
    unlockScroll();if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;
    if(resumeExplorer)window.systemExplorer?.resume();resumeExplorer=false;
  });
}
