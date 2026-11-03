import { SYSTEMS, MATERIALS, SOURCES } from './systems.js?v=20261103r1';

const buttons = [...document.querySelectorAll('[data-system]')];
const $ = id => document.getElementById(id);
let api, current = null, committed = null, displayMode = 'overview', failed = false, phase = -1, hoverTimer;
const hoverCapable = matchMedia('(hover: hover) and (pointer: fine)');
const overview = $('explorerOverview'), replay = $('explorerReplay');
const asset = name => new URL('../images/products/' + name, import.meta.url).href;
const stepLabel = text => text;
const overviewHint = () => hoverCapable.matches ? '메뉴에 마우스를 올리면 확대하고, 클릭하면 시공 과정을 보여드립니다.' : '메뉴를 누르면 확대하여 시공 과정을 보여드립니다.';
function link(text, href) {
  const a = document.createElement('a'); a.textContent = text; a.href = href;
  // Original PDFs/PPTs are intentionally not part of the public package.
  const path = decodeURIComponent(new URL(href, location.href).pathname);
  if (/\/assets\/(?:자료|docs)\//.test(path)) {
    a.href = '#contact'; a.title = '제품·기술자료 문의';
    if (text) a.textContent = text.replace(' ↗', '') + ' 문의 ↓';
    return a;
  }
  a.target = '_blank'; a.rel = 'noopener'; return a;
}
function details(id, mode = id ? 'install' : 'overview') {
  current = id; displayMode = mode; phase = -1;
  buttons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.system === committed));
    button.classList.toggle('is-preview', mode === 'preview' && button.dataset.system === id);
  });
  replay.disabled = !id || mode !== 'install' || failed;
  $('systemTimeline').hidden = !id || mode !== 'install' || failed;
  $('heroMedia').classList.toggle('has-selection', Boolean(id));
  $('systemDocuments').replaceChildren(); $('systemMaterials').replaceChildren();
  const data = SYSTEMS[id];
  $('explorerCaption').hidden = !data;
  $('explorerCaption').classList.toggle('is-installing', Boolean(id && mode === 'install' && !failed));
  if (!data) {
    for (const name of ['instructionNumber', 'instructionKicker', 'instructionTitle', 'instructionDescription']) $(name).textContent = '';
    $('systemKicker').textContent = 'A CLOSER LOOK AT SAFETY';
    $('systemTitle').textContent = '시스템별 구조를 살펴보세요.';
    $('systemDescription').textContent = '지상 건물의 관통부와 공간의 경계, 지하 공동구의 내화벽체까지. 실제 제품과 인정도면을 바탕으로 다섯 가지 화재차단 시스템을 살펴보세요.';
    $('systemFacts').replaceChildren(...['내화채움구조 / 금속배관 · 비금속배관 · 금속덕트', '방화셔터 / 스크린셔터', '내화구조 / 지하 공동구 내화벽체'].map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    const summary = document.createElement('div'); summary.className = 'detail-summary';
    summary.append('DOENC SYSTEMS'); const number = document.createElement('b'); number.textContent = '05'; summary.append(number, '지상과 지하를 연결하는 화재차단 기술'); $('systemMaterials').append(summary);
    $('explorerHint').textContent = overviewHint();
    $('heroMedia').setAttribute('aria-label', '다섯 가지 화재차단 시스템의 3D 모형');
    return;
  }
  $('instructionNumber').textContent = id === 'firewall' ? 'B1' : id === 'shutter' ? '1F' : '1–2F';
  $('instructionKicker').textContent = mode === 'preview' ? '설비 미리보기 · 클릭하면 시공 재생' : data.name + ' · 시공 순서';
  $('instructionTitle').textContent = data.name + (data.routeLabel ? ' · ' + data.routeLabel : '');
  $('instructionDescription').textContent = data.previewDescription;
  $('systemKicker').textContent = data.certificate || 'ACTUAL OPERATION / DOENC';
  $('systemTitle').textContent = data.title;
  $('systemDescription').textContent = data.description;
  $('heroMedia').setAttribute('aria-label', `${data.name} 시공 및 작동 과정 모형`);
  $('systemFacts').replaceChildren(...data.facts.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  if (data.certificate) {
    $('systemDocuments').append(link('인정도면 ↗', SOURCES[id] + '#page=' + data.drawingPage), link('시방서 ↗', SOURCES[id] + '#page=' + data.specPage));
  } else {
    const a = document.createElement('a'); a.href = '#shutter'; a.textContent = '실제 구동 영상 ↓'; $('systemDocuments').append(a);
  }
  for (const key of data.materials) {
    const item = MATERIALS[key], a = link('', SOURCES.catalog + '#page=' + item.page); a.className = 'mini-material';
    const img = document.createElement('img'); img.src = asset((key === 'board' && id === 'duct' ? 'duct-board' : key) + '.webp'); img.alt = item.name + ' 실제 제품 사진';
    const caption = document.createElement('span'); caption.textContent = item.name + ' · ' + item.code;
    a.append(img, caption); $('systemMaterials').append(a);
  }
  if (id === 'shutter') {
    const a = document.createElement('a'); a.href = '#shutter'; a.className = 'detail-film';
    const img = document.createElement('img'); img.src = asset('shutter-site.webp'); img.alt = '실제 현장 스크린셔터'; a.append(img, '실제 구동 영상 확인하기 ↓'); $('systemMaterials').append(a);
  }
  if (id === 'firewall') {
    $('systemDocuments').append(link('공동구 시공 기술자료 ↗', SOURCES.utilityTunnel));
    for (const [name, description, href] of [
      ['firewall-site.webp', '공동구 실제 시공 사진', SOURCES.utilityTunnel],
      ['firewall-drawing.webp', '내화벽체 인정도면', SOURCES.firewall + '#page=3'],
    ]) {
      const a = link('', href); a.className = 'mini-material';
      const img = document.createElement('img'); img.src = asset(name); img.alt = description;
      const caption = document.createElement('span'); caption.textContent = description;
      a.append(img, caption); $('systemMaterials').append(a);
    }
  }
  $('systemSteps').replaceChildren(...data.steps.map(([time, text], i) => {
    const el = document.createElement('span'); el.textContent = String(i + 1).padStart(2, '0'); el.title = `${i + 1}. ${stepLabel(text)}`; el.setAttribute('aria-label', el.title); return el;
  }));
  if (failed) {
    $('instructionNumber').textContent = '자료';
    $('instructionKicker').textContent = '제품 사진 · 인정자료';
    $('instructionTitle').textContent = data.name;
    $('instructionDescription').textContent = '3D를 사용할 수 없어 아래 실제 제품 사진과 인정자료로 안내합니다.';
  } else if (mode === 'preview') $('explorerHint').textContent = `${data.name} · 클릭하면 시공 과정을 재생합니다.`;
  else update({ phase: 0, progress: 0, complete: false });
}
function update(state) {
  if (!current || displayMode !== 'install' || (state.mode && state.mode !== 'install') || (state.selected && state.selected !== current)) return;
  const p = Math.round(state.progress * 100);
  $('systemProgress').style.width = p + '%';
  $('systemProgress').parentElement.setAttribute('aria-valuenow', p);
  if (phase !== state.phase) {
    phase = state.phase;
    [...$('systemSteps').children].forEach((step, i) => {
      step.classList.toggle('active', i === phase);
      if (i === phase) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
    });
    const data = SYSTEMS[current];
    $('instructionNumber').textContent = String(phase + 1).padStart(2, '0');
    $('instructionKicker').textContent = `${data.name} · ${phase + 1} / ${data.steps.length} 단계`;
    $('instructionTitle').textContent = stepLabel(data.steps[phase]?.[1] || '');
    $('instructionDescription').textContent = data.instructions[phase] || '';
    $('explorerHint').textContent = '화면 위의 번호와 설명에 따라 시공 과정을 확인하세요.';
  }
  if (state.complete) $('explorerHint').textContent = state.reduced ? '동작을 줄이는 설정에 따라 완료 상태를 표시합니다.' : '재생 완료 · 다른 시스템을 선택하거나 다시 재생하세요.';
}
function choose(id) {
  void startExplorer();
  clearTimeout(hoverTimer); committed = id;
  details(id);
  const viewport = $('heroMedia').getBoundingClientRect();
  const headerHeight = $('siteHeader').offsetHeight;
  if (viewport.top < headerHeight + 12 || viewport.bottom > innerHeight - 12) {
    // Keep the vertical floor menu beside the model on desktop. On narrow screens,
    // scroll to the horizontal floor row so it stays visible above the model.
    const anchor = matchMedia('(max-width: 760px)').matches ? $('systemOptions') : $('heroMedia');
    const top = anchor.getBoundingClientRect().top + scrollY - headerHeight - 14;
    window.scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  api?.select(id);
  if (failed) $('explorerHint').textContent = '3D를 사용할 수 없어 실제 사진과 인정도면으로 안내합니다.';
}
function preview(id) {
  if (id === committed && displayMode === 'install') return;
  details(id, 'preview'); api?.preview(id);
}
function clearPreview() {
  clearTimeout(hoverTimer);
  if (displayMode !== 'preview') return;
  details(committed); api?.clearPreview();
}
buttons.forEach((button, index) => {
  button.addEventListener('click', () => choose(button.dataset.system));
  button.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || !hoverCapable.matches || button.disabled) return;
    clearTimeout(hoverTimer); hoverTimer = setTimeout(() => preview(button.dataset.system), 100);
  });
  button.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  button.addEventListener('focus', () => {
    if (button.matches(':focus-visible') && !button.disabled) { clearTimeout(hoverTimer); preview(button.dataset.system); }
  });
  button.addEventListener('keydown', event => {
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next !== null) { event.preventDefault(); buttons[next].focus(); preview(buttons[next].dataset.system); }
    if (event.key === 'Escape') { event.preventDefault(); clearPreview(); }
  });
});
$('systemOptions').addEventListener('pointerleave', clearPreview);
$('systemOptions').addEventListener('focusout', event => { if (!$('systemOptions').contains(event.relatedTarget)) clearPreview(); });
document.querySelectorAll('[data-view-system]').forEach(a => a.addEventListener('click', event => {
  event.preventDefault(); choose(a.dataset.viewSystem);
}));
overview.addEventListener('click', () => choose(null));
replay.addEventListener('click', () => { if (current) choose(current); });
function fallback() {
  clearTimeout(hoverTimer);
  failed = true; api?.dispose(); api = null; window.systemExplorer = null;
  $('explorerRender').classList.remove('is-3d');
  $('instructionKicker').textContent = '제품 사진 · 인정자료';
  $('instructionDescription').textContent = '3D를 사용할 수 없어 아래 실제 제품 사진과 인정자료로 안내합니다.';
  $('heroMedia').setAttribute('aria-busy', 'false');
  $('explorerLoadStatus').textContent = '시스템별 제품 사진과 인정자료를 확인하세요.';
  buttons.forEach(button => { button.disabled = false; });
  overview.disabled = false; replay.disabled = true;
  $('systemTimeline').hidden = true;
  $('explorerHint').textContent = '3D를 사용할 수 없어 실제 사진과 인정도면으로 안내합니다.';
}
$('hero3d').addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
details(null);
let loading;
function startExplorer() {
  if (loading) return loading;
  loading = (async () => {
    try {
      $('explorerLoadStatus').textContent = '화재차단 시스템을 준비하고 있습니다.';
      const { initHero3D } = await import('./hero3d.js?v=20261103r5');
      api = await initHero3D($('hero3d'), $('explorerRender'), { onUpdate: update });
      window.systemExplorer = api;
      $('heroMedia').setAttribute('aria-busy', 'false');
      buttons.forEach(button => { button.disabled = false; });
      overview.disabled = false;
      if (current) { if (displayMode === 'preview') api.preview(current); else api.select(current); }
    } catch (error) {
      console.warn('DOENC system explorer is unavailable:', error);
      fallback();
    }
  })();
  return loading;
}
// Keep the signature photo and video light; construct the 3D scene near its section.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect(); void startExplorer();
  }, { rootMargin: '60px' });
  observer.observe($('heroMedia'));
} else void startExplorer();
