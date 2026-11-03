import { initHero3D } from './model.js?v=1';
import { SYSTEMS, SOURCES } from '../../assets/js/systems.js?v=20261023d';

const direction = document.documentElement.dataset.direction;
const directions = {
  a: { title: 'A · 클린 블루', headline: '기술을 만들고,<br>안전을<br><em>완성합니다.</em>' },
  b: { title: 'B · 딥 네이비', headline: '건물의 모든 층에,<br><em>안전의 기술을.</em>' },
  c: { title: 'C · 아키텍처 갤러리', headline: '공간마다 다른 기술,<br><em>하나로 이어지는 안전.</em>' },
};
document.title = `${directions[direction].title} | DOENC 디자인 시안`;
document.querySelector('#hero-title').innerHTML = directions[direction].headline;
document.querySelector(`[data-direction-link="${direction}"]`).setAttribute('aria-current', 'page');
const $ = id => document.getElementById(id);
const buttons = [...document.querySelectorAll('[data-system]')];
let api, selected = null, failed = false;
function link(text, href) {
  const a = document.createElement('a'); a.textContent = text; a.href = href;
  if (!href.startsWith('#')) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}
function details(id) {
  selected = id;
  const data = SYSTEMS[id];
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.system === id)));
  $('replay').disabled = !id || failed;
  $('progress').hidden = !id || failed;
  $('step').textContent = '';
  if (!data) {
    $('scene-number').textContent = 'DOENC SYSTEM BUILDING';
    $('scene-name').textContent = '건물 속 안전을 살펴보세요.';
    $('detail-kicker').textContent = 'A CLOSER LOOK AT SAFETY';
    $('detail-title').innerHTML = '보이지 않는 곳까지,<br>설계된 안전.';
    $('detail-copy').textContent = '배관과 덕트가 벽을 지나는 곳, 그리고 넓게 열린 공간. 각 층의 시스템을 선택해 실제 제품과 인정도면을 바탕으로 구성한 구조를 살펴보세요.';
    $('detail-links').replaceChildren(link('제품 카탈로그 ↗', SOURCES.catalog), link('기술자료 찾기 ↗', '../../archive.html'));
    $('status').textContent = '층을 선택하면 시공과 작동 과정을 보여드립니다.';
    return;
  }
  $('scene-number').textContent = `${data.floor}F / ${data.en}`;
  $('scene-name').textContent = data.name + ' · ' + data.code;
  $('detail-kicker').textContent = data.certificate || 'SCREEN SHUTTER';
  $('detail-title').textContent = data.title;
  $('detail-copy').textContent = data.description;
  $('detail-links').replaceChildren(...(data.certificate ? [link('인정도면 ↗', SOURCES[id] + '#page=' + data.drawingPage), link('시방서 ↗', SOURCES[id] + '#page=' + data.specPage)] : [link('실제 구동 영상 ↗', '../../index.html#shutter')]));
  $('status').textContent = data.name + ' 시공·작동 과정';
}
function select(id) {
  details(id);
  api?.select(id);
  if (failed) $('status').textContent = '3D를 사용할 수 없어 아래 제품 설명과 인정자료로 안내합니다.';
}
buttons.forEach((button, index) => {
  button.addEventListener('click', () => select(button.dataset.system));
  button.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next !== undefined) { event.preventDefault(); buttons[next].focus(); select(buttons[next].dataset.system); }
  });
});
$('overview').addEventListener('click', () => select(null));
$('replay').addEventListener('click', () => select(selected));
function fallback() {
  failed = true; api?.dispose(); api = null; window.designModel = null;
  $('model-stage').classList.remove('is-3d');
  $('model-loading').replaceChildren();
  const text = document.createElement('p'); text.textContent = '시스템을 선택해 제품과 인정자료를 확인하세요.';
  $('model-loading').append(text);
  buttons.forEach(button => button.disabled = false);
  $('overview').disabled = false; $('replay').disabled = true;
  $('progress').hidden = true;
  $('status').textContent = '3D를 사용할 수 없어 제품 설명과 인정자료로 안내합니다.';
}
$('model-canvas').addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
try {
  api = await initHero3D($('model-canvas'), $('model-stage'), {
    direction,
    onUpdate(state) {
      if (!selected) return;
      $('progress').firstElementChild.style.width = Math.round(state.progress * 100) + '%';
      const text = SYSTEMS[selected].steps[state.phase]?.[1] || '';
      $('step').textContent = text;
      $('status').textContent = state.complete ? '재생 완료 · 다른 층을 선택하거나 다시 재생해 보세요.' : text;
    },
  });
  window.designModel = api;
  buttons.forEach(button => button.disabled = false);
  $('overview').disabled = false;
} catch (error) { console.warn('Design preview fallback:', error); fallback(); }
