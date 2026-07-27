// ===== 히어로 3D — 관통부 화재차단 시스템 컷어웨이 =====
// 벽체 단면에 배관·케이블이 지나가고, 그 관통부를 내화채움구조가 채운 모습을
// 실시간 3D로 그린다. 영상 파일이 아니라 브라우저가 매 프레임 렌더링하므로
// 해상도 손실이 없고, 치수·배치는 아래 LAYOUT 값만 고치면 바뀐다.

const LAYOUT = {
  // 벽은 화면 밖까지 이어지게 잡는다 — 서 있는 판이 아니라 '잘라 본 벽'으로 읽히도록
  wall: { x0: -8.5, x1: 8.5, y0: -2.2, y1: 7.5, z: 0.62 },
  // 관통 개구부 2곳 — 이 영역만 벽이 비고, 그 자리를 자재가 채운다
  holeA: { x0: -2.0, x1: -0.1, y0: 0.45, y1: 1.95 }, // 배관
  holeB: { x0: 0.95, x1: 2.6, y0: -1.05, y1: 0.3 }, // 케이블 트레이
};

const COLOR = {
  concrete: 0x35353d,
  concreteDark: 0x212127,
  steel: 0x8d8d99,
  seal: 0x69b6fa,
  ember: 0xff8a3c,
  edge: 0xffffff,
};

export async function initHero3D(canvas, host) {
  const THREE = await import("./vendor/three.module.min.js");

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearAlpha(0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x101013, 18, 42);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  // 시선을 모델 왼쪽에 두어 관통부가 화면 오른쪽(문구 반대편)에 놓이게 한다
  const TARGET = new THREE.Vector3(-2.35, 0.35, 0);

  // ----- 재질 -----
  const matConcrete = new THREE.MeshStandardMaterial({
    color: COLOR.concrete,
    roughness: 0.92,
    metalness: 0.02,
  });
  const matFloor = new THREE.MeshStandardMaterial({
    color: COLOR.concreteDark,
    roughness: 1,
    metalness: 0,
  });
  const matSteel = new THREE.MeshStandardMaterial({
    color: COLOR.steel,
    roughness: 0.34,
    metalness: 0.85,
  });
  const matSeal = new THREE.MeshStandardMaterial({
    color: COLOR.seal,
    roughness: 0.55,
    metalness: 0.04,
    emissive: 0x1b5c94,
    emissiveIntensity: 1,
  });
  const matEdge = new THREE.LineBasicMaterial({
    color: COLOR.edge,
    transparent: true,
    opacity: 0.26,
  });

  const world = new THREE.Group();
  scene.add(world);

  // 상자 + 흰 외곽선 — 도면 같은 인상을 만드는 핵심
  function box(w, h, d, mat, edges) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    if (edges !== false) {
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), matEdge));
    }
    world.add(m);
    return m;
  }
  function slab(x0, x1, y0, y1, mat) {
    const m = box(x1 - x0, y1 - y0, LAYOUT.wall.z, mat || matConcrete);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    return m;
  }

  // ----- 벽체: 개구부를 남기고 띠 단위로 쌓는다 -----
  const W = LAYOUT.wall;
  const A = LAYOUT.holeA;
  const B = LAYOUT.holeB;
  slab(W.x0, W.x1, W.y0, B.y0); //   바닥쪽 띠
  slab(W.x0, B.x0, B.y0, B.y1); //   케이블 개구부 좌측
  slab(B.x1, W.x1, B.y0, B.y1); //   케이블 개구부 우측
  slab(W.x0, W.x1, B.y1, A.y0); //   두 개구부 사이 띠
  slab(W.x0, A.x0, A.y0, A.y1); //   배관 개구부 좌측
  slab(A.x1, W.x1, A.y0, A.y1); //   배관 개구부 우측
  slab(W.x0, W.x1, A.y1, W.y1); //   천장쪽 띠

  // ----- 바닥 슬래브 -----
  const floor = box(24, 0.5, 14, matFloor);
  floor.position.set(0, W.y0 - 0.25, 0);
  floor.castShadow = false;

  // ----- 관통 설비 -----
  function pipe(x, y, radius, len) {
    const g = new THREE.CylinderGeometry(radius, radius, len, 40, 1, false);
    const m = new THREE.Mesh(g, matSteel);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    world.add(m);
    return m;
  }
  pipe(-1.42, 1.22, 0.3, 8.4);
  pipe(-0.62, 0.92, 0.2, 8.4);

  // 케이블 트레이 (ㄷ 자 단면) + 케이블
  function tray(cx, cy) {
    const len = 8.4;
    const w = 1.1;
    const t = 0.06;
    const h = 0.42;
    const base = box(w, t, len, matSteel);
    base.position.set(cx, cy - h / 2, 0);
    const l = box(t, h, len, matSteel);
    l.position.set(cx - w / 2, cy, 0);
    const r = box(t, h, len, matSteel);
    r.position.set(cx + w / 2, cy, 0);
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x3c3c46,
      roughness: 0.8,
      metalness: 0.1,
    });
    for (let i = 0; i < 5; i++) {
      const g = new THREE.CylinderGeometry(0.085, 0.085, len, 20);
      const c = new THREE.Mesh(g, cableMat);
      c.rotation.x = Math.PI / 2;
      c.position.set(cx - 0.38 + (i % 4) * 0.25, cy - h / 2 + (i > 3 ? 0.25 : 0.1), 0);
      c.castShadow = true;
      world.add(c);
    }
  }
  tray(1.72, -0.32);

  // ----- 우리 자재: 관통부를 채운 내화채움구조 -----
  function seal(hole) {
    const m = box(
      hole.x1 - hole.x0,
      hole.y1 - hole.y0,
      LAYOUT.wall.z * 0.92,
      matSeal
    );
    m.position.set((hole.x0 + hole.x1) / 2, (hole.y0 + hole.y1) / 2, 0);
    return m;
  }
  seal(A);
  seal(B);

  // ----- 조명 -----
  scene.add(new THREE.HemisphereLight(0x9dc2e0, 0x08080b, 0.8));

  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(6.5, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0012;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x69b6fa, 1.9);
  rim.position.set(-6, 3, -5);
  scene.add(rim);

  // 벽 반대편(화염측)에서 새어 나오는 따뜻한 빛
  const ember = new THREE.PointLight(COLOR.ember, 26, 16, 2);
  ember.position.set(-2.2, -0.6, -3.6);
  scene.add(ember);

  // ----- 리사이즈 -----
  function resize() {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 화면이 좁아질수록 조금 물러나 전체가 담기게 한다
    const pull = w / h < 1 ? 1.45 : w / h < 1.5 ? 1.15 : 1;
    baseRadius = 14.5 * pull;
    camera.updateProjectionMatrix();
  }
  let baseRadius = 14.5;
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // ----- 카메라 궤도 -----
  const BASE_ANGLE = 0.5; // 정면에서 살짝 틀어 단면이 보이게
  function place(t) {
    const a = BASE_ANGLE + Math.sin(t * 0.11) * 0.2;
    const y = 3.1 + Math.sin(t * 0.078) * 0.42;
    camera.position.set(
      Math.sin(a) * baseRadius,
      y,
      Math.cos(a) * baseRadius
    );
    camera.lookAt(TARGET);
  }

  // ----- 재생 제어 -----
  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = null;
  let running = false;
  let t0 = null;
  let t = 0;

  function frame(now) {
    if (t0 === null) t0 = now;
    t = (now - t0) / 1000;
    place(t);
    ember.intensity = 26 + Math.sin(t * 3.1) * 5 + Math.sin(t * 7.7) * 2.5;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduce) return;
    running = true;
    t0 = null;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  // 첫 프레임을 그린 뒤에야 화면에 드러낸다 (빈 캔버스가 보이지 않도록)
  place(0);
  renderer.render(scene, camera);
  host.classList.add("is-3d");

  if (reduce) return { start: function () {}, stop: stop };

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (isVisible) start();
  });

  let isVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          isVisible = e.isIntersecting;
          if (isVisible && !document.hidden) start();
          else stop();
        });
      },
      { threshold: 0 }
    ).observe(host);
  }
  start();
  return { start: start, stop: stop };
}
