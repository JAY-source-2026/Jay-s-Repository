import { initHero3D } from './hero3d.js?v=20261023d';
import { SYSTEMS, MATERIALS, SOURCES } from './systems.js?v=20261023d';

const buttons = [...document.querySelectorAll('[data-system]')];
const $ = id => document.getElementById(id);
let api, current = null, failed = false, phase = -1;
const overview = $('explorerOverview'), replay = $('explorerReplay');
const asset = name => new URL('../images/products/' + name, import.meta.url).href;
function link(text, href) {
  const a = document.createElement('a'); a.textContent = text; a.href = href;
  a.target = '_blank'; a.rel = 'noopener'; return a;
}
function details(id) {
  current = id; phase = -1;
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.system === id)));
  replay.disabled = !id || failed;
  $('systemTimeline').hidden = !id || failed;
  $('heroMedia').classList.toggle('has-selection', Boolean(id));
  $('systemDocuments').replaceChildren(); $('systemMaterials').replaceChildren();
  const data = SYSTEMS[id];
  if (!data) {
    $('sceneNumber').textContent = '01—04 / BUILDING OVERVIEW';
    $('sceneCaption').textContent = '하나의 건물, 네 가지 화재차단 기술.';
    $('systemKicker').textContent = 'A CLOSER LOOK AT SAFETY';
    $('systemTitle').textContent = '건물 속 안전을, 한 층씩 살펴보세요.';
    $('systemDescription').textContent = '배관과 덕트가 벽을 지나는 곳, 그리고 넓게 열린 공간. 각 층의 시스템을 선택하면 실제 제품과 인정도면을 바탕으로 구성한 구조를 자세히 볼 수 있습니다.';
    $('systemFacts').replaceChildren(...['1F · 금속배관 / 양면 보드와 블랭킷', '2F · 비금속배관 / 내화자켓과 팽창재', '3F · 금속덕트 / 중공부 및 외곽 보호', '4F · 스크린셔터 / 두 개의 스크린 하강'].map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    const summary = document.createElement('div'); summary.className = 'detail-summary';
    summary.append('ONE BUILDING'); const number = document.createElement('b'); number.textContent = '04'; summary.append(number, '층마다 연결되는 안전의 기술'); $('systemMaterials').append(summary);
    $('explorerHint').textContent = '아래 층별 시스템을 선택하면 확대하여 시공과 작동 과정을 보여드립니다.';
    $('heroMedia').setAttribute('aria-label', '1층 금속배관, 2층 비금속배관, 3층 금속덕트, 4층 스크린셔터가 배치된 건물 모형');
    return;
  }
  $('sceneNumber').textContent = `${data.floor}F / ${data.en}`;
  $('sceneCaption').textContent = data.name + ' · ' + data.code;
  $('systemKicker').textContent = data.certificate || 'ACTUAL OPERATION / DOENC';
  $('systemTitle').textContent = data.title;
  $('systemDescription').textContent = data.description;
  $('heroMedia').setAttribute('aria-label', `${data.floor}층 ${data.name} 시공 및 작동 과정 모형`);
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
  $('systemSteps').replaceChildren(...data.steps.map(([time, text], i) => {
    const el = document.createElement('span'); el.textContent = `${String(i + 1).padStart(2, '0')} ${text}`; return el;
  }));
  update({ phase: 0, progress: 0, complete: false });
}
function update(state) {
  if (!current) return;
  const p = Math.round(state.progress * 100);
  $('systemProgress').style.width = p + '%';
  $('systemProgress').parentElement.setAttribute('aria-valuenow', p);
  if (phase !== state.phase) {
    phase = state.phase;
    [...$('systemSteps').children].forEach((step, i) => {
      step.classList.toggle('active', i === phase);
      if (i === phase) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
    });
    $('explorerHint').textContent = SYSTEMS[current].steps[phase]?.[1] || '';
  }
  if (state.complete) $('explorerHint').textContent = state.reduced ? '동작을 줄이는 설정에 따라 완료 상태를 표시합니다.' : '재생 완료 · 다른 층을 선택하거나 다시 재생하세요.';
}
function choose(id) {
  details(id);
  const top = $('heroMedia').getBoundingClientRect().top + window.scrollY - $('siteHeader').offsetHeight - 14;
  window.scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  api?.select(id);
  if (failed) $('explorerHint').textContent = '3D를 사용할 수 없어 실제 사진과 인정도면으로 안내합니다.';
}
buttons.forEach((button, index) => {
  button.addEventListener('click', () => choose(button.dataset.system));
  button.addEventListener('keydown', event => {
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next !== null) { event.preventDefault(); buttons[next].focus(); choose(buttons[next].dataset.system); }
  });
});
document.querySelectorAll('[data-view-system]').forEach(a => a.addEventListener('click', () => choose(a.dataset.viewSystem)));
overview.addEventListener('click', () => choose(null));
replay.addEventListener('click', () => { if (current) choose(current); });
function fallback() {
  failed = true; api?.dispose(); api = null; window.systemExplorer = null;
  $('heroMedia').classList.remove('is-3d');
  $('explorerLoadStatus').textContent = '층별 시스템의 사진과 도면을 확인하세요.';
  buttons.forEach(button => { button.disabled = false; });
  overview.disabled = false; replay.disabled = true;
  $('systemTimeline').hidden = true;
  $('explorerHint').textContent = '3D를 사용할 수 없어 실제 사진과 인정도면으로 안내합니다.';
}
$('hero3d').addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
details(null);
try {
  api = await initHero3D($('hero3d'), $('heroMedia'), { onUpdate: update });
  window.systemExplorer = api;
  buttons.forEach(button => { button.disabled = false; });
  overview.disabled = false;
  if (current) api.select(current);
} catch (error) {
  console.warn('DOENC system explorer is unavailable:', error);
  fallback();
}
