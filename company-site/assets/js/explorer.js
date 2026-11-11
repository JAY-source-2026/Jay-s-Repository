import { SYSTEMS, MATERIALS, SOURCES, CATEGORIES, loadCertificates, applyCertificate } from './systems.js?v=20261109r7';
import { PRODUCTS } from './product-data.js?v=20261111r1';
import { blanketPassesThrough } from './installation-blanket.js?v=20261109r10';
const $=id=>document.getElementById(id);
const buttons=[...document.querySelectorAll('[data-system]')];
const toggles=[...document.querySelectorAll('[data-cert-toggle]')];
const hoverCapable=matchMedia('(hover: hover) and (pointer: fine)');
let api,current=null,committed=null,displayMode='overview',failed=false,phase=-1,hoverTimer,loading;
let hoverBlockedUntil=0,lastPointerMove=0,lastScroll=0;
document.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&(event.movementX||event.movementY))lastPointerMove=performance.now();},{passive:true});
window.addEventListener('scroll',()=>{lastScroll=performance.now();clearTimeout(hoverTimer);},{passive:true});
const overview=$('explorerOverview'),replay=$('explorerReplay');
const play=$('explorerPlay'),pause=$('explorerPause'),fullscreen=$('explorerFullscreen'),player=$('explorerPlayer');
let expandedOverflow='',inertSiblings=[];
function syncPlayback(state={}){
 const available=Boolean(api&&current&&displayMode==='install'&&!failed),running=available&&Boolean(state.running);
 play.disabled=!available||running;pause.disabled=!available||!running;replay.disabled=!available;
 play.setAttribute('aria-pressed',String(running));pause.setAttribute('aria-pressed',String(available&&Boolean(state.paused)));
}
function syncFullscreen(){
 const expanded=document.fullscreenElement===player||player.classList.contains('is-expanded');
 fullscreen.setAttribute('aria-pressed',String(expanded));$('explorerFullscreenLabel').textContent=expanded?'전체화면 닫기':'전체화면 보기';
}
function setExpanded(expanded){
 if(expanded){
  expandedOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  for(let node=player;node&&node!==document.body;node=node.parentElement){
   for(const sibling of node.parentElement.children)if(sibling!==node){inertSiblings.push([sibling,sibling.inert]);sibling.inert=true;}
  }
 }else{
  document.body.style.overflow=expandedOverflow;
  for(const [element,wasInert] of inertSiblings)element.inert=wasInert;
  inertSiblings=[];
 }
 player.classList.toggle('is-expanded',expanded);syncFullscreen();fullscreen.focus({preventScroll:true});
}
fullscreen.addEventListener('click',async()=>{
 if(player.classList.contains('is-expanded')){setExpanded(false);return;}
 if(document.fullscreenElement===player){await document.exitFullscreen();return;}
 try{if(!player.requestFullscreen)throw new Error('Fullscreen unavailable');await player.requestFullscreen();}
 catch{setExpanded(true);}
 syncFullscreen();
});
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('keydown',event=>{
 if(!player.classList.contains('is-expanded'))return;
 if(event.key==='Escape'){event.preventDefault();setExpanded(false);return;}
 if(event.key!=='Tab')return;
 const controls=[...player.querySelectorAll('a[href],button:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
 const first=controls[0],last=controls.at(-1);
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
});
const overviewHint=()=> '메뉴를 누르면 시공 순서를, 오른쪽 화살표를 누르면 인정서 목록을 확인할 수 있습니다.';
function explainStep(data,index){
 const step=data.record?.steps[index];
 if(!step)return data.instructions[index]||'선택한 인정서의 시공 순서와 마감 상태를 확인합니다.';
 const board=data.record.geometry.boardMm;
 if(step.kind==='glasswool')return '은박 외장 보온재가 배관 전체에 연속으로 감겨 있는 상태에서 시작합니다. 기존 보온재의 이음부와 관통부 상태를 확인한 뒤 내화채움 제품을 시공합니다.';
 if(step.kind==='jacket'){
  const large=data.record.geometry.diametersMm.some(d=>d>=216),separate=data.record.steps.some(s=>s.kind==='brackets');
  return '브라켓 홈이 지지구조를 향하도록 자켓을 배관에 감싸고, 양 끝을 겹쳐 구멍에 고리를 걸어 체결합니다.'+(large?' 200·250A는 나비볼트 두 개를 조여 고정합니다.':'')+(separate?' 다음 단계에서 브라켓을 설치합니다.':' 이어서 규격별 L형 브라켓을 홈에 걸고, 지지구조에 밀착시킨 뒤 나사로 고정합니다.');
 }
 if(step.kind==='brackets')return `L형 브라켓 ${step.fasteners||''}개를 자켓의 홈에 걸어 체결합니다. 자켓을 지지구조에 밀착시킨 뒤 브라켓 구멍에 직결나사를 넣어 고정합니다. 원문은 직결나사 또는 타정기 못을 지정합니다.`;
 if(step.kind==='board'&&data.record.category==='duct')return '재단된 내화보드 조각을 덕트의 위·아래·양옆에 나누어 부착하고 고정합니다. 각 조각의 이음매를 구분해 보여주며, 다음 단계에서 테두리와 이음부를 실란트로 마감합니다.';
 if(step.kind==='fixing'&&/철선|철사/.test(step.text.replace(/\s/g,'')))return '철선을 보온재 둘레에 감아 밀착시키고 끝을 꼬아 고정합니다. 철선의 위치·규격·간격과 마감 조건은 연결된 시방에서 확인하세요.';
 if(step.kind==='fixing'&&data.record.category==='duct')return '보온재 위·아래에 시스템찬넬을 맞추고, 양옆 전산볼트에 와셔와 너트를 체결해 고정합니다. 부재 규격과 설치 간격은 연결된 시방을 따릅니다.';
 if(step.kind==='board')return `내화보드 두 조각을 위·아래에서 각각 끼워 관통재 주위에 맞댄 뒤 고정합니다.${board?.thickness?` 보드 두께 ${board.thickness} mm 이상.`:''} 테두리와 이음매는 다음 실란트 단계에서 마감합니다.`;
 if(step.kind==='sealant')return '실란트 카트리지의 노즐을 접합부에 대고 이동하며 빈틈을 채웁니다. '+(board?'보드 테두리·관통재 접점·두 조각의 이음매를 연결해 도포합니다. ':'관통재와 채움재의 접합부를 따라 도포합니다. ')+'도포 치수와 적용 부위는 선택한 시방을 따릅니다.';
 if(step.kind==='blanket'&&data.record.category==='duct'&&data.record.geometry.orientation==='floor'&&step.text.includes('연속시공'))return `1단 세라믹섬유블랭킷을 덕트 전체 길이에 1겹으로 감싸 밀착시킵니다. 두께 ${step.thicknessMm} mm. 이음부와 세부 적용 조건은 연결된 시방을 확인하세요.`;
 if(blanketPassesThrough(step))return `세라믹섬유블랭킷을 관통재 둘레에 감아 ${data.record.geometry.orientation==='floor'?'바닥':'벽체'} 내부를 통과하도록 연속 설치합니다. 지지구조 안에서 보온층이 끊기지 않도록 양쪽을 연결합니다.${step.thicknessMm?` 두께 ${step.thicknessMm} mm.`:''} 양쪽 시공 길이와 이음부 조건은 연결된 시방을 확인하세요.`;
 if(step.kind==='blanket'&&data.record.category==='duct')return `세라믹섬유블랭킷을 풀어 덕트 둘레에 감고 이음부를 밀착시킵니다.${step.thicknessMm?` 두께 ${step.thicknessMm} mm.`:''}${step.lengthMm&&!step.text.includes('연속시공')?` 시공 길이 ${step.lengthMm} mm.`:''} 겹수와 세부 적용 조건은 연결된 시방을 확인하세요.`;
 if(step.kind==='blanket')return `평평한 세라믹섬유블랭킷을 관통재에 대고 둘레를 따라 감아 이음부를 밀착시킵니다.${step.thicknessMm?` 두께 ${step.thicknessMm} mm.`:''}${step.lengthMm?` 시공 길이 ${step.lengthMm} mm.`:''} 겉면·안쪽·옆면 모두 같은 은박 표면입니다. 세부 적용 조건은 연결된 시방을 확인하세요.`;
 const brief={
  'insulation-band':'파란 포장 내화밴드와 세라믹섬유블랭킷으로 구성된 단열밴드를 개구부 안쪽에 설치합니다. 파란 밴드와 은박 보온재를 구분해 보여줍니다. 각 면의 구성·두께·길이·수량은 연결된 시방에서 확인하세요.',
  band:'흰색 DOENC 인쇄가 있는 파란 포장 상태의 내화밴드를 관통재와 개구부 사이에 밀착하여 설치합니다. 밴드의 겹수·두께·너비와 배관별 적용 조건은 연결된 시방을 따릅니다.',
  plate:'시공한 내화채움재 위에 마감판을 덮고 지지구조에 고정합니다. 마감판의 겹침 길이·치수와 고정못 규격은 연결된 시방을 따릅니다.',
  fixing:'시방에 지정된 고정 재료와 간격에 맞추어 보온재를 고정합니다. 처짐이나 벌어진 이음부가 없는지 확인하고 각 위치의 체결 상태를 점검합니다.',
 };
 if(brief[step.kind])return brief[step.kind];
 return step.text.split(/\s+-\s+/).slice(0,2).join(' ').replace(/^\s*-\s*/,'');
}
function caption(data,index){
 $('installationCaption').hidden=!data||displayMode!=='install';
 if(!data||displayMode!=='install')return;
 const step=data.record?.steps[index];
 $('installationStep').textContent=index===data.steps.length-1?'시공 완료':`시공 ${String(index+1).padStart(2,'0')} / ${String(data.steps.length-1).padStart(2,'0')}`;
 $('installationTitle').textContent=data.steps[index]?.[1]||'';
 $('installationDescription').textContent=explainStep(data,index);
 const sourcePage=jacketDetailPage(data.certificate,step?.kind)||step?.page||data.specPage;
 $('installationSource').textContent=`${data.certificate} · 시방 ${sourcePage}쪽 ↗`;
 $('installationSource').href=SOURCES[current]+'#page='+sourcePage;
}
function jacketDetailPage(id,kind){
 if(!['jacket','brackets'].includes(kind))return null;
 let pages;
 const match=id.match(/^FS-NP24-0617-(\d+)$/);
 if(match){const n=Number(match[1]);pages=n<=5?[13,14]:n<=10?[17,18]:[11,12];}
 else pages={'FS-NP25-0224-05':[13,14],'FS-NP25-0625-04':[11,17],'FS-NP25-0625-05':[10,16]}[id];
 return pages?.[kind==='jacket'?0:1];
}
function link(text,href){const a=document.createElement('a');a.textContent=text;a.href=href;a.target='_blank';a.rel='noopener';return a;}
function certificateTitle(record){
 const suffix={'FS-MP25-0224-06':'보드 타입','FS-MP26-0507-14':'보드X 타입'}[record.id];
 return record.title+(suffix?' ('+suffix+')':'');
}
function usedMaterials(data){
 // Older certificates omit the product-code list but still name materials in their specifications.
 const text=(data.record?data.record.steps.map(step=>step.title+' '+step.text):data.instructions).join(' ').replace(/\s/g,'');
 return Object.keys(MATERIALS).filter(key=>({
  board:/내화채움보드|SFB-100[EFM]/,
  jacket:/내화자켓|SFBA-200/,
  sealant:/내화실리콘실란트|SFS-100/,
  blanket:/세라믹섬유블랭킷/,
  band:/내화밴드/
 }[key].test(text))).map(key=>({
  key,
  name:key==='board'&&text.includes('SFB-100E')?'내화보드':key==='board'&&text.includes('내화채움보드M')?'내화채움보드M':MATERIALS[key].name,
  exactCode:(data.record?.materials||[]).includes(MATERIALS[key].code)||text.includes(MATERIALS[key].code)
 }));
}
function details(id,mode=id?'install':'overview'){
 current=id;displayMode=mode;phase=-1;
 buttons.forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.system===committed));button.classList.toggle('is-preview',mode==='preview'&&button.dataset.system===id);});
 document.querySelectorAll('[data-certificate]').forEach(button=>button.setAttribute('aria-pressed',String(id===button.dataset.category&&SYSTEMS[id]?.certificate===button.dataset.certificate)));
 syncPlayback();
 $('systemTimeline').hidden=!id||mode!=='install'||failed;
 $('heroMedia').classList.toggle('has-selection',Boolean(id));
 $('systemDocuments').replaceChildren();$('systemMaterials').replaceChildren();
 const data=SYSTEMS[id];
 caption(data,0);
 $('certificateSpec').hidden=!data?.record;
 $('certificateInstructions').replaceChildren();
 if(!data){
  $('systemKicker').textContent='A CLOSER LOOK AT SAFETY';$('systemTitle').textContent='인정서별 시공 방법을 살펴보세요.';
  $('explorerHint').textContent=overviewHint();$('heroMedia').setAttribute('aria-label','인정서별 시공 방법 3D 모형');return;
 }
 $('systemKicker').textContent=data.certificate;$('systemTitle').textContent=(data.record?certificateTitle(data.record):data.title).replace(data.certificate,'').trim();
 $('heroMedia').setAttribute('aria-label',`${data.name} ${data.certificate} 시공 순서 모형`);
 $('systemDocuments').append(link('인정서 보기 ↗',SOURCES[id]+'#page=1'));
 for(const {key,name,exactCode} of usedMaterials(data)){
  // Family photographs show the material type; open a product spec only for a confirmed matching code.
  const item=document.createElement(exactCode?'button':'div');item.className='mini-material';item.dataset.materialKind=key;
  if(exactCode){item.type='button';item.dataset.material=key;item.setAttribute('aria-haspopup','dialog');item.setAttribute('aria-controls','materialDialog');item.setAttribute('aria-label',name+' '+MATERIALS[key].code+' 제품 상세 보기');}
  const img=document.createElement('img');img.src=PRODUCTS[key].image;img.alt=name+' 제품군 이미지';
  const caption=document.createElement('span');caption.textContent=name;item.append(img,caption);$('systemMaterials').append(item);
 }
 if(data.record){
  $('certificateSpec').querySelector('summary').textContent=data.certificate+' · 시방 상세';
  data.record.steps.forEach((step,index)=>{
   const li=document.createElement('li'),title=document.createElement('h4'),text=document.createElement('p');
   title.textContent=step.title;text.textContent=step.text;
   li.append(title,text,link(`원문 ${step.page}쪽 ↗`,SOURCES[id]+'#page='+step.page));$('certificateInstructions').append(li);
  });
 }
 $('systemSteps').replaceChildren(...data.steps.map(([time,text],i)=>{
  const button=document.createElement('button');button.type='button';button.textContent=String(i+1).padStart(2,'0');button.title=text;button.setAttribute('aria-label',`${i+1}. ${text}`);
  button.addEventListener('click',()=>{const span=(data.steps[i+1]?.[0]??data.duration)-time;api?.seek(time+span*.52);});return button;
 }));
 if(failed){$('explorerHint').textContent='3D를 사용할 수 없어 아래 인정서 시방과 제품 사진으로 안내합니다.';}
 else if(mode==='preview')$('explorerHint').textContent=data.name+' · 클릭하면 시공 순서를 재생합니다.';
 else update({phase:0,progress:0,complete:false});
}
function update(state){
 syncPlayback(state);
 if(!current||displayMode!=='install'||(state.mode&&state.mode!=='install')||(state.selected&&state.selected!==current))return;
 const p=Math.round(state.progress*100);$('systemProgress').style.width=p+'%';$('systemProgress').parentElement.setAttribute('aria-valuenow',p);
 if(phase!==state.phase){
  phase=state.phase;[...$('systemSteps').children].forEach((step,i)=>{step.classList.toggle('active',i===phase);if(i===phase)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});
  caption(SYSTEMS[current],phase);
  $('systemProgress').parentElement.setAttribute('aria-valuetext',SYSTEMS[current].steps[phase]?.[1]||'');
  $('explorerHint').textContent='번호를 눌러 시공 단계를 확인하거나, 아래 시방 상세에서 원문 내용을 읽을 수 있습니다.';
 }
 if(state.complete)$('explorerHint').textContent=state.reduced?'동작을 줄이는 설정에 따라 시공 완료 상태를 표시합니다.':'시공 완료 · 다른 인정서나 단계를 선택해보세요.';
}
function choose(id,certificateId){
 clearTimeout(hoverTimer);hoverBlockedUntil=performance.now()+900;
 if(certificateId&&!applyCertificate(certificateId))return;
 committed=id;details(id);api?.select(id);
 const viewport=$('heroMedia').getBoundingClientRect(),detail=$('systemDetail').getBoundingClientRect(),header=$('siteHeader').offsetHeight;
 if(viewport.top<header+12||detail.bottom>innerHeight-12){
  window.scrollTo({top:Math.max(0,viewport.top+scrollY-header-14),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
}
function preview(id){if(id===committed&&displayMode==='install')return;details(id,'preview');api?.preview(id);}
function clearPreview(){clearTimeout(hoverTimer);if(displayMode!=='preview')return;details(committed);api?.clearPreview();}
buttons.forEach((button,index)=>{
 button.addEventListener('click',()=>choose(button.dataset.system));
 button.addEventListener('pointerenter',event=>{if(event.pointerType!=='mouse'||!hoverCapable.matches||button.disabled)return;const entered=performance.now();clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{const now=performance.now();if(now>=hoverBlockedUntil&&now-lastScroll>180&&lastPointerMove>=entered-40&&lastPointerMove>=lastScroll)preview(button.dataset.system);},220);});
 button.addEventListener('pointerleave',()=>clearTimeout(hoverTimer));
 button.addEventListener('focus',()=>{if(button.matches(':focus-visible')&&!button.disabled){clearTimeout(hoverTimer);preview(button.dataset.system);}});
 button.addEventListener('keydown',event=>{
  let next;
  if(event.key==='ArrowDown')next=(index+1)%buttons.length;
  if(event.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;
  if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;
  if(next!==undefined){event.preventDefault();buttons[next].focus();}
  if(event.key==='ArrowRight'){const toggle=document.querySelector(`[data-cert-toggle="${button.dataset.system}"]`);if(toggle){event.preventDefault();toggle.focus();}}
  if(event.key==='Escape'){event.preventDefault();clearPreview();}
 });
});
toggles.forEach(toggle=>toggle.addEventListener('click',()=>{
 clearPreview();const expanded=toggle.getAttribute('aria-expanded')!=='true';
 toggle.setAttribute('aria-expanded',String(expanded));$(toggle.getAttribute('aria-controls')).hidden=!expanded;
}));
$('systemOptions').addEventListener('pointerleave',clearPreview);
$('systemOptions').addEventListener('focusout',event=>{if(!$('systemOptions').contains(event.relatedTarget))clearPreview();});
document.querySelectorAll('[data-view-system]').forEach(a=>a.addEventListener('click',event=>{if(SYSTEMS[a.dataset.viewSystem]){event.preventDefault();choose(a.dataset.viewSystem);}}));
overview.addEventListener('click',()=>choose(null));
play.addEventListener('click',()=>api?.play());pause.addEventListener('click',()=>api?.pause());
replay.addEventListener('click',()=>api?.replay());
function populate(records){
 for(const [id,meta]of Object.entries(CATEGORIES)){
  const list=$('certificates-'+id),items=records.filter(record=>record.category===id);
  const count=document.createElement('p');count.className='certificate-count';count.textContent=items.length+'건';list.replaceChildren(count);
  items.forEach((record,index)=>{
   const button=document.createElement('button');button.type='button';button.className='certificate-choice';button.dataset.certificate=record.id;button.dataset.category=id;button.setAttribute('aria-pressed','false');
   button.textContent=certificateTitle(record);button.addEventListener('click',()=>choose(id,record.id));
   button.addEventListener('keydown',event=>{
    const choices=[...list.querySelectorAll('button')];let next;
    if(event.key==='ArrowDown')next=(index+1)%items.length;if(event.key==='ArrowUp')next=(index+items.length-1)%items.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=items.length-1;
    if(next!==undefined){event.preventDefault();choices[next].focus();}
    if(event.key==='Escape'){event.preventDefault();const toggle=document.querySelector(`[data-cert-toggle="${id}"]`);toggle.click();toggle.focus();}
   });list.append(button);
  });
 }
 $('certificateStatus').textContent='화살표를 눌러 인정서를 선택하세요.';toggles.forEach(button=>button.disabled=false);
}
function fallback(){
 clearTimeout(hoverTimer);failed=true;api?.dispose();api=null;window.systemExplorer=null;
 $('explorerRender').classList.remove('is-3d');$('heroMedia').setAttribute('aria-busy','false');
 $('explorerLoadStatus').textContent='3D를 사용할 수 없습니다. 인정서 시방과 제품 사진을 확인하세요.';
 buttons.forEach(button=>button.disabled=!SYSTEMS[button.dataset.system]);overview.disabled=false;syncPlayback();
 $('systemTimeline').hidden=true;details(current);
}
$('hero3d').addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
details(null);
function startExplorer(){
 if(loading)return loading;
 // Give the opening film its own renderer; initialize the technical model
 // when the homepage becomes interactive again.
 if(window.doencIntroBoot?.active){
  document.addEventListener('doenc:intro-finished',()=>void startExplorer(),{once:true});
  return;
 }
 loading=(async()=>{
  try{
   const [records,{initHero3D}]=await Promise.all([loadCertificates(),import('./hero3d.js?v=20261110r1')]);populate(records);
   $('explorerLoadStatus').textContent='시공 모형을 준비하고 있습니다.';
   api=await initHero3D($('hero3d'),$('explorerRender'),{onUpdate:update});
   window.systemExplorer=api;
   // A certificate can be chosen while the renderer is still being prepared.
   if(current){if(displayMode==='preview')api.preview(current);else api.select(current);}
   $('heroMedia').setAttribute('aria-busy','false');buttons.forEach(button=>button.disabled=false);overview.disabled=false;syncPlayback(api.getState());
  }catch(error){console.warn('DOENC system explorer is unavailable:',error);fallback();if(!SYSTEMS.metal){$('certificateStatus').textContent='인정서 자료를 불러오지 못했습니다. 페이지를 새로고침해주세요.';}}
 })();return loading;
}
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){observer.disconnect();void startExplorer();}},{rootMargin:'650px'});observer.observe($('heroMedia'));}else void startExplorer();
