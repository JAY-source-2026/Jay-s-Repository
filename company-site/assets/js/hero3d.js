// ===== 히어로 3D — 관통부 화재차단 시스템 (밝은 톤) =====
// 벽체 단면에 원형 배관과 사각 덕트가 지나가고, 세 번째 개구부(사각 타공)는
// 우리 내화보드가 날아와 밀착되며 막힌다. 영상이 아니라 브라우저가 매 프레임
// 렌더링하므로 해상도 손실이 없고, 치수·배치는 아래 LAYOUT 값만 고치면 바뀐다.

const LAYOUT = {
  // 벽은 화면 밖까지 이어지게 잡는다 — 서 있는 판이 아니라 '잘라 본 벽'으로 읽히도록
  wall: { x0: -8.5, x1: 8.5, y0: -2.2, y1: 7.5, z: 0.62 },
  // 관통 개구부 3곳 (y 오름차순) — 이 영역만 벽이 비고, 그 자리를 자재가 채운다
  holeBoard: { x0: 0.35, x1: 2.05, y0: -0.55, y1: 1.15 }, // 사각 타공 → 내화보드가 날아와 막음
  holeDuct: { x0: 0.20, x1: 2.10, y0: 1.75, y1: 3.15 }, //   사각 덕트
  holePipe: { x0: 0.50, x1: 1.90, y0: 3.70, y1: 5.00 }, //   원형 배관
};

const COLOR = {
  concrete: 0xc3c7ce, // 밝지만 흰 배경과 구분되는 콘크리트
  concreteDark: 0xb4b8c1, // 바닥
  steel: 0x9aa1ac,
  seal: 0x3f93ec, // 우리 제품(파랑)
  board: 0x2f8bef, // 날아오는 내화보드(조금 더 진한 파랑)
  ember: 0xff8a3c,
  edge: 0x1b1c22, // 밝은 벽 위에서 읽히도록 어두운 도면 선
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
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  // 밝은 안개로 먼 부분이 흰 배경에 자연스럽게 녹아들게 한다
  scene.fog = new THREE.Fog(0xeef1f5, 22, 48);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  // 시선을 모델 왼쪽·개구부 스택 중앙에 두어 3개 관통부가 헤더에 안 걸리게 한다
  const TARGET = new THREE.Vector3(-2.35, 1.9, 0);

  // ----- 재질 -----
  const matConcrete = new THREE.MeshStandardMaterial({
    color: COLOR.concrete,
    roughness: 0.95,
    metalness: 0.02,
  });
  const matFloor = new THREE.MeshStandardMaterial({
    color: COLOR.concreteDark,
    roughness: 1,
    metalness: 0,
  });
  const matSteel = new THREE.MeshStandardMaterial({
    color: COLOR.steel,
    roughness: 0.35,
    metalness: 0.8,
  });
  const matSeal = new THREE.MeshStandardMaterial({
    color: COLOR.seal,
    roughness: 0.5,
    metalness: 0.04,
    emissive: 0x1b5c94,
    emissiveIntensity: 0.9,
  });
  const matEdge = new THREE.LineBasicMaterial({
    color: COLOR.edge,
    transparent: true,
    opacity: 0.38,
  });

  const world = new THREE.Group();
  scene.add(world);

  // 상자 + 외곽선 — 도면 같은 인상을 만드는 핵심
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

  // ----- 벽체: 개구부 3곳을 남기고 띠 단위로 쌓는다 -----
  const W = LAYOUT.wall;
  const holes = [LAYOUT.holeBoard, LAYOUT.holeDuct, LAYOUT.holePipe]; // y 오름차순
  let prevY = W.y0;
  holes.forEach(function (h) {
    slab(W.x0, W.x1, prevY, h.y0); // 개구부 아래 가로 띠
    slab(W.x0, h.x0, h.y0, h.y1); // 개구부 좌측
    slab(h.x1, W.x1, h.y0, h.y1); // 개구부 우측
    prevY = h.y1;
  });
  slab(W.x0, W.x1, prevY, W.y1); // 맨 위 가로 띠

  // ----- 바닥 슬래브 -----
  const floor = box(24, 0.5, 14, matFloor);
  floor.position.set(0, W.y0 - 0.25, 0);
  floor.castShadow = false;

  // ----- 관통 설비 -----
  // 원형 배관
  function pipe(cx, cy, radius, len) {
    const g = new THREE.CylinderGeometry(radius, radius, len, 40, 1, false);
    const m = new THREE.Mesh(g, matSteel);
    m.rotation.x = Math.PI / 2;
    m.position.set(cx, cy, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    world.add(m);
    return m;
  }
  const P = LAYOUT.holePipe;
  pipe((P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2, 0.5, 8.4);

  // 사각 덕트 (개구부보다 작게 — 둘레의 빈틈을 우리 자재가 채운다)
  function duct(cx, cy, w, h, len) {
    const m = box(w, h, len, matSteel);
    m.position.set(cx, cy, 0);
    // 덕트 표면 리브 느낌의 가는 선 몇 줄
    return m;
  }
  const D = LAYOUT.holeDuct;
  duct((D.x0 + D.x1) / 2, (D.y0 + D.y1) / 2, 1.15, 0.95, 8.4);

  // ----- 우리 자재: 배관·덕트 개구부를 채운 내화채움구조 (정적) -----
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
  seal(LAYOUT.holePipe);
  seal(LAYOUT.holeDuct);

  // ----- 우리 자재: 날아와 사각 타공을 막는 내화보드 (애니메이션) -----
  const B = LAYOUT.holeBoard;
  const bx = (B.x0 + B.x1) / 2;
  const by = (B.y0 + B.y1) / 2;
  const openW = B.x1 - B.x0;
  const openH = B.y1 - B.y0;
  // 개구부보다 살짝 큰 사각 보드
  const boardW = openW + 0.42;
  const boardH = openH + 0.42;
  const boardT = 0.18;
  const zLand = LAYOUT.wall.z / 2 + boardT / 2 + 0.02; // 벽 앞면에 밀착
  const zStart = 6.8; // 카메라 쪽에서 날아 들어온다
  const driftX = 1.5;
  const driftY = 1.0;
  const tilt = 0.2;

  const matBoard = new THREE.MeshStandardMaterial({
    color: COLOR.board,
    roughness: 0.42,
    metalness: 0.05,
    emissive: 0x1c66c4,
    emissiveIntensity: 1.05,
    transparent: true,
    opacity: 1,
  });
  const matBoardEdge = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
  });
  const boardGeo = new THREE.BoxGeometry(boardW, boardH, boardT);
  const board = new THREE.Mesh(boardGeo, matBoard);
  board.castShadow = true;
  board.receiveShadow = true;
  board.add(new THREE.LineSegments(new THREE.EdgesGeometry(boardGeo), matBoardEdge));
  board.position.set(bx, by, zLand); // 기본값 = 밀착 상태(모션 없는 환경 대비)
  world.add(board);

  function easeOutCubic(k) {
    return 1 - Math.pow(1 - k, 3);
  }
  // 날아 들어와 → 밀착 유지 → 빠지며 리셋 (반복)
  function animateBoard(time) {
    const PERIOD = 6.2;
    const p = (time % PERIOD) / PERIOD;
    let e, op;
    if (p < 0.3) {
      // 날아 들어옴
      e = easeOutCubic(p / 0.3);
      op = Math.min(1, (p / 0.3) * 2.2);
    } else if (p < 0.84) {
      // 밀착 유지
      e = 1;
      op = 1;
    } else {
      // 빠지며 사라짐
      const k = (p - 0.84) / 0.16;
      e = 1 - k * k;
      op = 1 - k;
    }
    board.position.set(
      bx + driftX * (1 - e),
      by + driftY * (1 - e),
      zLand + (zStart - zLand) * (1 - e)
    );
    board.rotation.z = tilt * (1 - e);
    matBoard.opacity = op;
    matBoardEdge.opacity = 0.5 * op;
  }

  // ----- 조명 (밝은 톤) -----
  scene.add(new THREE.HemisphereLight(0xffffff, 0xccd0d7, 1.15));

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
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

  const rim = new THREE.DirectionalLight(0x69b6fa, 1.2);
  rim.position.set(-6, 3, -5);
  scene.add(rim);

  // 벽 반대편(화염측)에서 새어 나오는 따뜻한 빛
  const ember = new THREE.PointLight(COLOR.ember, 16, 16, 2);
  ember.position.set(1.2, 0.2, -3.6);
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
    baseRadius = 15.5 * pull;
    camera.updateProjectionMatrix();
  }
  let baseRadius = 15.5;
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // ----- 카메라 궤도 -----
  const BASE_ANGLE = 0.5; // 정면에서 살짝 틀어 단면이 보이게
  function place(t) {
    const a = BASE_ANGLE + Math.sin(t * 0.11) * 0.18;
    const y = 3.7 + Math.sin(t * 0.078) * 0.4;
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
    animateBoard(t);
    ember.intensity = 16 + Math.sin(t * 3.1) * 4 + Math.sin(t * 7.7) * 2;
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
