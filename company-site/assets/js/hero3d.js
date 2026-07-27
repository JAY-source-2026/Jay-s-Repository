// ===== 히어로 3D — 관통부 화재차단 장면 (사실적) =====
// 실내(흰 벽·바닥, 검은 천장 보이드)에서 배관이 벽체를 관통하고, 화재측에서
// 연기가 새어 나온다. 우리의 하얀 내화보드가 날아와 그 개구부를 막아 차단한다.
// 마가켐 홈페이지의 사실적 톤을 참조하되, 우리 제품(하얀 보드)의 시공 순간을 연출.

export async function initHero3D(canvas, host) {
  const THREE = await import("./vendor/three.module.min.js");

  // ---- 개구부/배관 배치 (오른쪽에 두어 좌측은 문구용으로 비운다) ----
  const OPEN = { x: 3.4, y: 1.4, hw: 1.3, hh: 1.3 }; // 사각 개구부 중심·반폭
  const PIPE_R = 0.58;
  const WALL_Z = -3.6, WALL_T = 0.5; // 벽 중심 z, 두께
  const WALL_FRONT = WALL_Z + WALL_T / 2; // 실내측 벽면

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance",
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9ebef);
  scene.fog = new THREE.Fog(0xe7e9ee, 8, 34);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const TARGET = new THREE.Vector3(3.2, 1.7, WALL_Z);

  // ---- 재질 ----
  const matWall = new THREE.MeshStandardMaterial({ color: 0xf3f2ef, roughness: 0.94, metalness: 0.0 });
  const matWallSide = new THREE.MeshStandardMaterial({ color: 0xe4e4e2, roughness: 0.96 });
  const matFloor = new THREE.MeshStandardMaterial({ color: 0xd5d6da, roughness: 0.9 });
  const matCeil = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 1.0 });
  const matPipe = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.6, metalness: 0.12 });
  const matBand = new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.5, metalness: 0.5 });
  const matDuct = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, roughness: 0.45, metalness: 0.55 });
  const matBoard = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.02, emissive: 0x222428, emissiveIntensity: 0.25 });

  const world = new THREE.Group();
  scene.add(world);

  function box(w, h, d, mat, x, y, z, cast, rec) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast !== false; m.receiveShadow = rec !== false;
    world.add(m); return m;
  }

  // ---- 벽체: 사각 개구부를 남기고 4장으로 쌓는다 ----
  const WX0 = -16, WX1 = 16, WY0 = -4.5, WY1 = 13;
  const ox0 = OPEN.x - OPEN.hw, ox1 = OPEN.x + OPEN.hw, oy0 = OPEN.y - OPEN.hh, oy1 = OPEN.y + OPEN.hh;
  const slab = (x0, x1, y0, y1) => box(x1 - x0, y1 - y0, WALL_T, matWall, (x0 + x1) / 2, (y0 + y1) / 2, WALL_Z);
  slab(WX0, WX1, WY0, oy0);   // 개구부 아래
  slab(WX0, WX1, oy1, WY1);   // 개구부 위
  slab(WX0, ox0, oy0, oy1);   // 좌
  slab(ox1, WX1, oy0, oy1);   // 우

  // ---- 바닥 ----
  box(WX1 - WX0, 0.5, 22, matFloor, (WX0 + WX1) / 2, WY0 - 0.25, WALL_Z + 9, false, true);
  // ---- 천장 보이드(검은 plenum) ----
  box(WX1 - WX0, 0.4, 22, matCeil, (WX0 + WX1) / 2, 7.6, WALL_Z + 9, false, false);
  // ---- 좌측 리턴 벽(코너감) ----
  box(0.5, WY1 - WY0, 22, matWallSide, WX0 + 6.5, (WY0 + WY1) / 2, WALL_Z + 9, false, true);

  // ---- 관통 배관 (벽을 뚫고 실내로) ----
  function pipe() {
    const len = 12;
    const cz = WALL_Z + 0.9; // 실내쪽으로 적당히
    const g = new THREE.CylinderGeometry(PIPE_R, PIPE_R, len, 44);
    const m = new THREE.Mesh(g, matPipe);
    m.rotation.x = Math.PI / 2;
    m.position.set(OPEN.x, OPEN.y, cz);
    m.castShadow = true; m.receiveShadow = true;
    world.add(m);
    // 금속 밴드 2개
    [-1.4, 1.0].forEach((dz) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R + 0.03, PIPE_R + 0.03, 0.16, 44), matBand);
      b.rotation.x = Math.PI / 2; b.position.set(OPEN.x, OPEN.y, cz + dz);
      b.castShadow = true; world.add(b);
    });
  }
  pipe();

  // ---- 천장 배관/덕트 (맥락용) ----
  (function ceilingRuns() {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 36), matPipe);
    p.rotation.z = Math.PI / 2; p.position.set(0, 6.6, -1.2); p.castShadow = true; world.add(p);
    const d = box(30, 1.0, 1.4, matDuct, 0, 5.2, 1.6); d.castShadow = true;
  })();

  // ---- 우리 자재: 하얀 내화보드 (사각판 + 배관 통과 원형홀) ----
  const HALF = 1.62; // 개구부(1.35)보다 큰 보드
  const board = (function () {
    const shape = new THREE.Shape();
    shape.moveTo(-HALF, -HALF); shape.lineTo(HALF, -HALF);
    shape.lineTo(HALF, HALF); shape.lineTo(-HALF, HALF); shape.lineTo(-HALF, -HALF);
    const hole = new THREE.Path();
    hole.absarc(0, 0, PIPE_R + 0.14, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, steps: 1, curveSegments: 56,
    });
    geo.center();
    const m = new THREE.Mesh(geo, matBoard);
    m.castShadow = true; m.receiveShadow = true;
    world.add(m); return m;
  })();
  const SEAT = new THREE.Vector3(OPEN.x, OPEN.y, WALL_FRONT + 0.09); // 실내측 벽면에 밀착
  const START = new THREE.Vector3(OPEN.x - 2.8, OPEN.y + 2.4, WALL_Z + 6.2); // 앞·좌상단에서 진입
  board.position.copy(SEAT);

  // ---- 연기 (캔버스 텍스처 스프라이트) ----
  function smokeTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grd.addColorStop(0, "rgba(138,140,147,0.8)");
    grd.addColorStop(0.5, "rgba(118,120,128,0.38)");
    grd.addColorStop(1, "rgba(108,110,120,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  }
  const smokeTex = smokeTexture();
  const puffs = [];
  const smokeGroup = new THREE.Group(); scene.add(smokeGroup);
  // 개구부 주변에서 피어오르는 연기 + 천장 배관을 타고 번지는 연기
  for (let i = 0; i < 24; i++) {
    const ceil = i >= 16; // 일부는 천장쪽
    const mat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const p = {
      sp: s,
      x: ceil ? (Math.random() - 0.5) * 12 : OPEN.x + (Math.random() - 0.5) * 2.6,
      z: WALL_Z + 0.3 + Math.random() * (ceil ? 3.5 : 2.6),
      y0: ceil ? 5.2 + Math.random() * 1.6 : OPEN.y - 0.9 + Math.random() * 1.4,
      rise: ceil ? 2.6 : 5.6,
      scale: (ceil ? 2.6 : 1.8) + Math.random() * 2.0,
      phase: Math.random(),
      life: 3.2 + Math.random() * 2.8,
      max: ceil ? 0.62 : 0.9,
    };
    s.position.set(p.x, p.y0, p.z);
    smokeGroup.add(s); puffs.push(p);
  }

  // ---- 불꽃 글로우(스프라이트) ----
  function glowTexture(inner) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grd.addColorStop(0, inner); grd.addColorStop(1, "rgba(255,120,30,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  }
  const fireSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("rgba(255,150,50,0.9)"), transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  fireSprite.position.set(OPEN.x + 0.2, OPEN.y - 2.4, WALL_Z - 3.0);
  fireSprite.scale.set(5, 5, 1); scene.add(fireSprite);
  // 개구부 바로 뒤(화재측)에서 새어나오는 글로우 — 보드가 밀착하면 가려진다
  const openGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("rgba(255,180,90,0.95)"), transparent: true, opacity: 0.75,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  openGlow.position.set(OPEN.x, OPEN.y, WALL_Z - 0.35);
  openGlow.scale.set(3.4, 3.4, 1); scene.add(openGlow);

  // ---- 조명 ----
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9aa0, 1.0));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.2);
  key.position.set(9, 11, 8); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.camera.left = -14; key.shadow.camera.right = 14;
  key.shadow.camera.top = 12; key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0012; scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(-6, 4, 6); scene.add(fill);
  // 화재측 따뜻한 빛 (벽 뒤 낮은 곳)
  const fire = new THREE.PointLight(0xff6a1e, 42, 22, 2);
  fire.position.set(OPEN.x + 0.5, OPEN.y - 2.2, WALL_Z - 5.5); scene.add(fire);

  // ---- 리사이즈 ----
  function resize() {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    dollyPull = w / h < 1 ? 4.5 : w / h < 1.5 ? 2.0 : 0;
    camera.updateProjectionMatrix();
  }
  let dollyPull = 0;
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // ---- 카메라 ----
  function place(t) {
    const x = 0.4 + Math.sin(t * 0.085) * 0.55;
    const y = 2.4 + Math.sin(t * 0.065) * 0.22;
    const z = 9.6 + dollyPull + Math.sin(t * 0.05) * 0.4;
    camera.position.set(x, y, z);
    camera.lookAt(TARGET);
  }

  // ---- 보드 애니메이션: 날아 들어옴 → 밀착 유지 → 빠지며 리셋 ----
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  let boardSeat = 1; // 0=멀리, 1=밀착 (개구부 글로우 가림 계산용)
  function animateBoard(t) {
    const PERIOD = 7.0, p = (t % PERIOD) / PERIOD;
    let e, op;
    if (p < 0.28) { e = easeOut(p / 0.28); op = Math.min(1, (p / 0.28) * 2.2); }
    else if (p < 0.85) { e = 1; op = 1; }
    else { const k = (p - 0.85) / 0.15; e = 1 - k * k; op = 1 - k; }
    boardSeat = e;
    board.position.set(
      SEAT.x + (START.x - SEAT.x) * (1 - e),
      SEAT.y + (START.y - SEAT.y) * (1 - e),
      SEAT.z + (START.z - SEAT.z) * (1 - e)
    );
    board.rotation.set(0.14 * (1 - e), -0.18 * (1 - e), 0.05 * (1 - e));
    matBoard.opacity = op; matBoard.transparent = op < 1;
  }

  // ---- 연기 애니메이션 ----
  function animateSmoke(t) {
    for (const p of puffs) {
      const tt = (t * (1 / p.life) + p.phase) % 1;
      p.sp.position.set(
        p.x + Math.sin((t + p.phase * 10) * 0.5) * 0.4,
        p.y0 + tt * p.rise,
        p.z
      );
      const sc = p.scale * (0.7 + tt * 1.3);
      p.sp.scale.set(sc, sc, 1);
      p.sp.material.opacity = Math.sin(tt * Math.PI) * p.max;
    }
  }

  // ---- 재생 제어 ----
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = null, running = false, t0 = null, t = 0;
  function frame(now) {
    if (t0 === null) t0 = now;
    t = (now - t0) / 1000;
    place(t); animateBoard(t); animateSmoke(t);
    fire.intensity = 42 + Math.sin(t * 3.2) * 8 + Math.sin(t * 9.1) * 4;
    fireSprite.material.opacity = 0.5 + Math.sin(t * 4.0) * 0.12;
    // 보드가 밀착할수록 개구부 글로우가 가려진 것처럼 약해진다
    openGlow.material.opacity = (0.55 + Math.sin(t * 5.3) * 0.18) * (1 - boardSeat * 0.75);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reduce) return; running = true; t0 = null; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  place(0); animateSmoke(0); renderer.render(scene, camera);
  host.classList.add("is-3d");
  if (reduce) return { start: function () {}, stop: stop };

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (isVisible) start();
  });
  let isVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        isVisible = e.isIntersecting;
        if (isVisible && !document.hidden) start(); else stop();
      });
    }, { threshold: 0 }).observe(host);
  }
  start();
  return { start: start, stop: stop };
}
