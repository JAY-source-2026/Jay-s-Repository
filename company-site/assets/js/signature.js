// Start with the board/jacket pair; an explicit choice brings one product to center.
const hero = document.querySelector('.signature-hero');
const showcase = document.getElementById('signatureShowcase');
const categories = [...document.querySelectorAll('.signature-category')];
const productScene = document.getElementById('signatureProductScene');
const products = document.getElementById('signatureProducts');
const shutter = document.getElementById('signatureShutter');
const productButtons = [...document.querySelectorAll('[data-product-select]')];
const productTargets = [...document.querySelectorAll('[data-product-hover]')];
const shutterScene = document.getElementById('signatureShutterScene');
const shutterButtons = [...document.querySelectorAll('[data-shutter-select]')];
const shutterTargets = [...document.querySelectorAll('[data-shutter-photo]')];
const shutterVideo = document.getElementById('signatureShutterVideo');
const shutterWatch = document.getElementById('signatureShutterWatch');
const shutterBack = document.getElementById('signatureShutterBack');
const video = document.getElementById('signatureVideo');
const videoPlay = document.getElementById('signatureVideoPlay');
const videoError = document.getElementById('signatureVideoError');
const announcement = document.getElementById('signatureAnnouncement');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const names = Object.fromEntries(productButtons.map(button => [button.dataset.productSelect, button.textContent.trim()]));
const keys = productTargets.map(target => target.dataset.productHover);
const shutterNames = Object.fromEntries(shutterButtons.map(button => [button.dataset.shutterSelect, button.textContent.trim()]));
const footage = {
  standard: { src: 'assets/media/hero/shutter-operation.mp4', poster: 'assets/media/hero/shutter-operation-poster.jpg', title: '일반 방화셔터' },
  wire: { src: 'assets/media/hero/wire-shutter-operation.mp4', poster: 'assets/media/hero/wire-shutter-poster.jpg', title: '와이어 권취형 방화셔터' }
};
const rad = Math.PI / 180;
const normalize = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const clamp = value => Math.max(0, Math.min(1, value));
let selectedProduct = null;
let selectedShutter = null;
let selectedVideo = null;
let playRequest = 0;
hero.dataset.scene = 'products';

// Share the product carousel motion with the shutter photographs.
function createOrbit(scene, targets, keyAttribute, openingPair) {
  const keys = targets.map(target => target.dataset[keyAttribute]);
  const step = 360 / keys.length;
  const frontAngle = step / 2;
  let selectedKey = null;
  let angle = openingPair ? 0 : frontAngle;
  let destination = angle;
  let spread = openingPair ? frontAngle : 0;
  let destinationSpread = spread;
  let animation = 0;
  let sceneWidth = scene.clientWidth;
  let sceneHeight = scene.clientHeight;
  function renderOrbit() {
    const radius = sceneWidth * .27 / Math.sin(frontAngle * rad);
    const pairWeight = spread / frontAngle;
    targets.forEach((target, i) => {
      const degrees = normalize(i * step - spread + angle);
      const theta = degrees * rad;
      const depth = Math.cos(theta) - Math.cos(spread * rad);
      const x = sceneWidth * .0056 * pairWeight + Math.sin(theta) * radius;
      const y = depth * sceneHeight * .18;
      const z = depth * Math.min(sceneWidth * .24, 190);
      const turn = (degrees - Math.sign(degrees) * spread) * .48;
      const opacity = clamp((58 + 22 * pairWeight - Math.abs(degrees)) / (36 - 4 * pairWeight));
      const front = opacity > .95 && (selectedKey ? target.dataset[keyAttribute] === selectedKey : Math.abs(degrees) <= frontAngle + .5);
      target.style.transform = `translateX(-50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${turn}deg)`;
      target.style.opacity = opacity;
      target.style.zIndex = String(Math.round((Math.cos(theta) + 1) * 100));
      target.style.pointerEvents = front ? 'auto' : 'none';
      target.inert = !front;
      target.setAttribute('aria-hidden', String(!front));
      target.dataset.front = String(front);
    });
  }
  function finishOrbit() {
    cancelAnimationFrame(animation);
    animation = 0;
    angle = destination = normalize(destination);
    spread = destinationSpread;
    scene.classList.remove('is-rolling');
    renderOrbit();
  }
  function rotateTo(key) {
    selectedKey = key;
    const wanted = -keys.indexOf(key) * step;
    if (Math.abs(normalize(wanted - destination)) < .01 && destinationSpread === 0) return;
    cancelAnimationFrame(animation);
    const from = angle;
    const fromSpread = spread;
    destination = angle + normalize(wanted - angle);
    destinationSpread = 0;
    if (reducedMotion.matches || document.hidden) { finishOrbit(); return; }
    const to = destination;
    const started = performance.now();
    const duration = 850 + Math.abs(to - from) * 1.4;
    scene.classList.add('is-rolling');
    function tick(now) {
      const progress = clamp((now - started) / duration);
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      angle = from + (to - from) * eased;
      spread = fromSpread * (1 - eased);
      renderOrbit();
      if (progress < 1) animation = requestAnimationFrame(tick);
      else finishOrbit();
    }
    animation = requestAnimationFrame(tick);
  }
  scene.classList.add('is-ready');
  renderOrbit();
  new ResizeObserver(() => {
    sceneWidth = scene.clientWidth;
    sceneHeight = scene.clientHeight;
    renderOrbit();
  }).observe(scene);
  return { rotateTo, finish: finishOrbit };
}
const productOrbit = createOrbit(productScene, productTargets, 'productHover', true);
const shutterOrbit = createOrbit(shutterScene, shutterTargets, 'shutterPhoto', false);
function finishOrbits() { productOrbit.finish(); shutterOrbit.finish(); }
function syncSelection() {
  const isProducts = hero.dataset.scene === 'products';
  productButtons.forEach(button => button.setAttribute('aria-pressed', String(isProducts && button.dataset.productSelect === selectedProduct)));
  productTargets.forEach(target => target.setAttribute('aria-pressed', String(isProducts && target.dataset.productHover === selectedProduct)));
  shutterButtons.forEach(button => button.setAttribute('aria-pressed', String(!isProducts && button.dataset.shutterSelect === selectedShutter)));
  shutterTargets.forEach(target => target.setAttribute('aria-pressed', String(!isProducts && target.dataset.shutterPhoto === selectedShutter)));
}
function showScene(name) {
  hero.dataset.scene = name;
  const isProducts = name === 'products';
  for (const [panel, active] of [[products, isProducts], [shutter, name === 'shutter'], [shutterVideo, name === 'video']]) {
    panel.classList.toggle('is-active', active);
    panel.setAttribute('aria-hidden', String(!active));
    panel.inert = !active;
  }
  categories.forEach(group => {
    const active = group.dataset.category === (isProducts ? 'firestop' : 'shutter');
    group.dataset.current = String(active);
    group.querySelector('.signature-category-trigger').setAttribute('aria-pressed', String(active));
  });
  if (name !== 'video') {
    playRequest++;
    video.pause();
    delete hero.dataset.video;
  }
  if (!isProducts) productOrbit.finish();
  if (name !== 'shutter') shutterOrbit.finish();
  syncSelection();
}
function clearProductFocus() {
  delete productScene.dataset.focus;
  productTargets.forEach(target => target.classList.remove('is-focused'));
}
function emphasizeProduct(key) {
  productScene.dataset.focus = key;
  productTargets.forEach(target => target.classList.toggle('is-focused', target.dataset.productHover === key));
}
function selectProduct(key) {
  if (!keys.includes(key)) return;
  selectedProduct = key;
  productScene.dataset.mode = 'single';
  showScene('products');
  clearProductFocus();
  productOrbit.rotateTo(key);
  document.getElementById('signatureProductCaption').textContent = `${names[key]} 단독 보기`;
  announcement.textContent = `${names[key]} 제품 이미지 단독 보기`;
}
function selectShutter(key) {
  if (!Object.hasOwn(shutterNames, key)) return;
  selectedShutter = key;
  clearProductFocus();
  showScene('shutter');
  shutterOrbit.rotateTo(key);
  shutterWatch.hidden = !Object.hasOwn(footage, key);
  shutterWatch.setAttribute('aria-label', `${shutterNames[key]} 작동 영상 보기`);
  document.getElementById('signatureShutterCaption').textContent = shutterNames[key];
  announcement.textContent = `${shutterNames[key]} 현장 사진 보기`;
}
function playSelected() {
  const request = ++playRequest;
  videoPlay.hidden = true;
  video.play().catch(error => {
    if (request !== playRequest || error.name === 'AbortError' || hero.dataset.scene !== 'video') return;
    if (!video.error) videoPlay.hidden = false;
  });
}
function selectVideo(key) {
  const clip = footage[key];
  if (!clip) return;
  playRequest++;
  video.pause();
  clearProductFocus();
  showScene('video');
  hero.dataset.video = key;
  videoError.hidden = true;
  videoPlay.hidden = true;
  if (selectedVideo !== key || video.error) {
    video.poster = clip.poster;
    video.src = clip.src;
    video.load();
  } else if (video.ended) video.currentTime = 0;
  selectedVideo = key;
  video.setAttribute('aria-label', `${clip.title} 실제 작동 영상`);
  document.getElementById('signatureVideoCaption').textContent = clip.title;
  document.getElementById('signatureVideoLink').href = clip.src;
  announcement.textContent = `${clip.title} 실제 작동 영상`;
  playSelected();
}
categories.forEach(group => {
  const trigger = group.querySelector('.signature-category-trigger');
  const children = [...group.querySelectorAll('.signature-submenu button')];
  trigger.addEventListener('click', () => {
    if (group.dataset.category === 'firestop') { showScene('products'); clearProductFocus(); }
    else selectShutter(selectedShutter || 'standard');
  });
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); children[0].focus(); }
  });
  children.forEach((button, i) => button.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (i + 1) % children.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (i + children.length - 1) % children.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = children.length - 1;
    if (next === undefined) return;
    event.preventDefault(); children[next].focus();
  }));
  group.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); trigger.focus(); clearProductFocus();
  });
});
productButtons.forEach(button => {
  const key = button.dataset.productSelect;
  button.addEventListener('click', () => selectProduct(key));
});
productTargets.forEach(target => {
  const key = target.dataset.productHover;
  target.setAttribute('aria-label', `${names[key]} 제품 보기`);
  target.addEventListener('focus', () => emphasizeProduct(key));
  target.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') emphasizeProduct(key);
  });
  target.addEventListener('click', () => selectProduct(key));
  target.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') clearProductFocus(); });
  target.addEventListener('blur', clearProductFocus);
  target.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); clearProductFocus(); }
  });
});
shutterButtons.forEach(button => button.addEventListener('click', () => selectShutter(button.dataset.shutterSelect)));
shutterTargets.forEach(target => target.addEventListener('click', () => selectShutter(target.dataset.shutterPhoto)));
shutterWatch.addEventListener('click', () => { selectVideo(selectedShutter); shutterBack.focus({ preventScroll: true }); });
shutterBack.addEventListener('click', () => { selectShutter(selectedShutter); shutterWatch.focus({ preventScroll: true }); });
videoPlay.addEventListener('click', playSelected);
video.addEventListener('playing', () => { videoPlay.hidden = true; videoError.hidden = true; });
video.addEventListener('error', () => {
  if (!selectedVideo) return;
  videoPlay.hidden = true;
  videoError.hidden = false;
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.signature-showcase')) clearProductFocus();
});
function pauseOffscreen() { playRequest++; video.pause(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseOffscreen(); finishOrbits(); } });
window.addEventListener('pagehide', pauseOffscreen);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishOrbits(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) { pauseOffscreen(); finishOrbits(); }
  }, { threshold: 0 }).observe(showcase);
}
syncSelection();
