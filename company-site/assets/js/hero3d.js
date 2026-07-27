// ===== 히어로 3D — 2막 구성 (사실적) =====
// 1막: 벽 뒤에서 화염·연기가 번지고, 배관이 벽을 관통한 개구부를 우리 하얀 내화보드가
//      상·하 두 장으로 배관 위아래에서 날아와 시공되며 막는다.
// 2막: 화면이 전환되어, 불이 난 공간을 뒤로하고 스크린셔터가 위에서 아래로 내려와 차단한다.
// 매 프레임 렌더 — 영상 아님. 배치는 상단 상수로 조정.

export async function initHero3D(canvas, host) {
  const THREE = await import("./vendor/three.module.min.js");

  const WALL_Z = -3.6, WALL_T = 0.5, WALL_FRONT = WALL_Z + WALL_T / 2;
  const OPEN = { x: 3.4, y: 1.4, hw: 1.3, hh: 1.3 };
  const PIPE_R = 0.58, RH = PIPE_R + 0.16; // 보드 반원 노치 반지름
  const OFFB = -60; // 2막(셔터) 월드 오프셋

  const ACT_A = 9.0, ACT_B = 9.0, LOOP = ACT_A + ACT_B, FADE = 0.7;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9ebef);
  scene.fog = new THREE.Fog(0xe7e9ee, 9, 40);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

  // 전환용 페이드 오버레이
  const fade = document.createElement("div");
  fade.style.cssText = "position:absolute;inset:0;background:#eef0f3;opacity:0;pointer-events:none;z-index:2;transition:none;";
  host.appendChild(fade);

  // ---- 재질 ----
  const matWall = new THREE.MeshStandardMaterial({ color: 0xd0d2d7, roughness: 0.94 });
  const matWallSide = new THREE.MeshStandardMaterial({ color: 0xc2c4c8, roughness: 0.96 });
  const matFloor = new THREE.MeshStandardMaterial({ color: 0xd5d6da, roughness: 0.9 });
  const matCeil = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 1.0 });
  const matPipe = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.6, metalness: 0.12 });
  const matBand = new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.5, metalness: 0.5 });
  const matBoard = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.02, emissive: 0x222428, emissiveIntensity: 0.22 });

  function box(w, h, d, mat, x, y, z, parent, cast, rec) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = cast !== false; m.receiveShadow = rec !== false;
    (parent || scene).add(m); return m;
  }

  // ---- 스프라이트 텍스처 ----
  function radialTex(stops) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    stops.forEach((s) => grd.addColorStop(s[0], s[1]));
    g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  }
  const smokeTex = radialTex([[0, "rgba(140,142,148,0.8)"], [0.5, "rgba(118,120,128,0.38)"], [1, "rgba(108,110,120,0)"]]);
  const flameTex = radialTex([[0, "rgba(255,232,170,0.95)"], [0.3, "rgba(255,138,38,0.9)"], [0.62, "rgba(238,66,14,0.45)"], [1, "rgba(170,32,6,0)"]]);

  // 화염 무리 생성
  function makeFlames(parent, cx, cy, cz, count, spread, size) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      const p = { sp: s, bx: cx + (Math.random() - 0.5) * spread, by: cy + Math.random() * spread * 0.4, cz: cz + (Math.random() - 0.5) * spread * 0.6, base: size * (0.7 + Math.random() * 0.7), ph: Math.random() * 6.28, sp2: 5 + Math.random() * 5 };
      s.position.set(p.bx, p.by, p.cz); parent.add(s); arr.push(p);
    }
    return arr;
  }
  function makeSmoke(parent, cfg) {
    const arr = [];
    for (let i = 0; i < cfg.n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
      const p = {
        sp: s, x: cfg.x + (Math.random() - 0.5) * cfg.sx, z: cfg.z + (Math.random() - 0.5) * cfg.sz,
        y0: cfg.y + (Math.random() - 0.5) * cfg.sy, rise: cfg.rise, scale: cfg.scale + Math.random() * cfg.scale,
        phase: Math.random(), life: 3 + Math.random() * 3, max: cfg.max,
      };
      s.position.set(p.x, p.y0, p.z); parent.add(s); arr.push(p);
    }
    return arr;
  }
  function animFlames(arr, t, on) {
    for (const p of arr) {
      const fl = 0.6 + Math.abs(Math.sin(t * p.sp2 + p.ph)) * 0.6;
      const sc = p.base * (0.8 + fl * 0.5);
      p.sp.scale.set(sc * 0.8, sc, 1);
      p.sp.position.y = p.by + Math.sin(t * (p.sp2 * 0.5) + p.ph) * 0.15;
      p.sp.material.opacity = on * (0.4 + fl * 0.32);
    }
  }
  function animSmoke(arr, t, on) {
    for (const p of arr) {
      const tt = (t * (1 / p.life) + p.phase) % 1;
      p.sp.position.set(p.x + Math.sin((t + p.phase * 10) * 0.5) * 0.4, p.y0 + tt * p.rise, p.z);
      const sc = p.scale * (0.7 + tt * 1.3); p.sp.scale.set(sc, sc, 1);
      p.sp.material.opacity = Math.sin(tt * Math.PI) * p.max * on;
    }
  }

  // =====================================================================
  //  1막 — 관통부 실링
  // =====================================================================
  const A = new THREE.Group(); scene.add(A);
  (function buildA() {
    const WX0 = -16, WX1 = 16, WY0 = -4.5, WY1 = 13;
    const ox0 = OPEN.x - OPEN.hw, ox1 = OPEN.x + OPEN.hw, oy0 = OPEN.y - OPEN.hh, oy1 = OPEN.y + OPEN.hh;
    const slab = (x0, x1, y0, y1) => box(x1 - x0, y1 - y0, WALL_T, matWall, (x0 + x1) / 2, (y0 + y1) / 2, WALL_Z, A);
    slab(WX0, WX1, WY0, oy0); slab(WX0, WX1, oy1, WY1); slab(WX0, ox0, oy0, oy1); slab(ox1, WX1, oy0, oy1);
    box(WX1 - WX0, 0.5, 22, matFloor, 0, WY0 - 0.25, WALL_Z + 9, A, false, true);
    box(WX1 - WX0, 0.4, 22, matCeil, 0, 7.6, WALL_Z + 9, A, false, false);
    box(0.5, WY1 - WY0, 22, matWallSide, WX0 + 6.5, (WY0 + WY1) / 2, WALL_Z + 9, A, false, true);
    // 관통 배관
    const cz = WALL_Z + 0.9, len = 12;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R, PIPE_R, len, 44), matPipe);
    pipe.rotation.x = Math.PI / 2; pipe.position.set(OPEN.x, OPEN.y, cz); pipe.castShadow = true; pipe.receiveShadow = true; A.add(pipe);
    [-1.4, 1.0].forEach((dz) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R + 0.03, PIPE_R + 0.03, 0.16, 44), matBand); b.rotation.x = Math.PI / 2; b.position.set(OPEN.x, OPEN.y, cz + dz); b.castShadow = true; A.add(b); });
    // 천장 배관
    const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 36), matPipe); cp.rotation.z = Math.PI / 2; cp.position.set(0, 6.6, -1.2); cp.castShadow = true; A.add(cp);
  })();

  // 상·하 반쪽 보드 (배관 반원 노치)
  const HALF = 1.62, BD = 0.16;
  function halfBoard(top) {
    const s = new THREE.Shape();
    if (top) {
      s.moveTo(-HALF, 0); s.lineTo(-RH, 0);
      s.absarc(0, 0, RH, Math.PI, 0, true); // 위쪽 반원(오목)
      s.lineTo(HALF, 0); s.lineTo(HALF, HALF); s.lineTo(-HALF, HALF);
    } else {
      s.moveTo(-HALF, 0); s.lineTo(-HALF, -HALF); s.lineTo(HALF, -HALF); s.lineTo(HALF, 0); s.lineTo(RH, 0);
      s.absarc(0, 0, RH, 0, Math.PI, true); // 아래쪽 반원(오목)
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: BD, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, steps: 1, curveSegments: 48 });
    geo.translate(0, 0, -BD / 2);
    const m = new THREE.Mesh(geo, matBoard.clone()); m.castShadow = true; m.receiveShadow = true; A.add(m); return m;
  }
  const boardTop = halfBoard(true), boardBot = halfBoard(false);
  const SEATZ = WALL_FRONT + 0.1;

  // 1막 화염·연기 (벽 뒤 화재측)
  const flamesA = makeFlames(A, OPEN.x, OPEN.y - 1.2, WALL_Z - 1.8, 14, 2.8, 2.2);
  const emberA = makeFlames(A, OPEN.x, OPEN.y - 0.2, WALL_Z - 0.7, 8, 1.9, 1.5); // 개구부 바로 뒤
  const smokeA = makeSmoke(A, { n: 14, x: OPEN.x, y: OPEN.y + 0.3, z: WALL_Z - 0.4, sx: 2.4, sy: 1.6, sz: 1.2, rise: 6.2, scale: 1.7, max: 0.7 });
  const smokeCeilA = makeSmoke(A, { n: 8, x: 0, y: 5.6, z: WALL_Z + 1.5, sx: 12, sy: 1.4, sz: 3, rise: 2.4, scale: 2.6, max: 0.5 });

  // =====================================================================
  //  2막 — 스크린셔터 하강 차단
  // =====================================================================
  const B = new THREE.Group(); B.position.x = OFFB; scene.add(B);
  const BO = { x: 2.4, y: 3.3, hw: 3.7, hh: 3.5 }; // 대형 개구부(로컬)
  let shutter, shutterMat, fireB, emberB;
  (function buildB() {
    const WX0 = -18, WX1 = 18, WY0 = -4.5, WY1 = 16;
    const ox0 = BO.x - BO.hw, ox1 = BO.x + BO.hw, oy0 = BO.y - BO.hh, oy1 = BO.y + BO.hh;
    const slab = (x0, x1, y0, y1) => box(x1 - x0, y1 - y0, WALL_T, matWall, (x0 + x1) / 2, (y0 + y1) / 2, WALL_Z, B);
    slab(WX0, WX1, WY0, oy0); slab(WX0, WX1, oy1, WY1); slab(WX0, ox0, oy0, oy1); slab(ox1, WX1, oy0, oy1);
    box(WX1 - WX0, 0.5, 24, matFloor, 0, WY0 - 0.25, WALL_Z + 10, B, false, true);
    box(WX1 - WX0, 0.4, 24, matCeil, 0, 9.5, WALL_Z + 10, B, false, false);
    // 개구부 안쪽(화재실) — 어두운 뒷벽
    box(ox1 - ox0, oy1 - oy0, 0.3, new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 1 }), BO.x, BO.y, WALL_Z - 6, B, false, false);
    // 셔터 하우징(개구부 위 박스)
    box(2 * BO.hw + 0.9, 0.7, 0.9, matBand, BO.x, oy1 + 0.45, WALL_FRONT + 0.3, B, true, true);
    // 셔터 스크린 — 위 가장자리 고정, scaleY로 하강
    const sc = document.createElement("canvas"); sc.width = 16; sc.height = 256;
    const gg = sc.getContext("2d"); gg.fillStyle = "#8f9299"; gg.fillRect(0, 0, 16, 256);
    gg.strokeStyle = "rgba(40,42,48,0.55)"; gg.lineWidth = 2;
    for (let y = 4; y < 256; y += 10) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(16, y); gg.stroke(); }
    const stex = new THREE.CanvasTexture(sc);
    const sw = 2 * BO.hw + 0.5, sh = 2 * BO.hh + 0.3;
    shutterMat = new THREE.MeshStandardMaterial({ map: stex, color: 0xcfd2d6, roughness: 0.7, metalness: 0.2, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
    const sg = new THREE.PlaneGeometry(sw, sh); sg.translate(0, -sh / 2, 0); // 상단이 y=0
    shutter = new THREE.Mesh(sg, shutterMat); shutter.castShadow = true; shutter.receiveShadow = true;
    shutter.position.set(BO.x, oy1 + 0.1, WALL_FRONT + 0.32); shutter.scale.y = 0.02; B.add(shutter);
    // 화재실 화염·연기
    fireB = makeFlames(B, BO.x, BO.y - 2.4, WALL_Z - 3.0, 22, 6.2, 3.4);
    emberB = makeFlames(B, BO.x, BO.y - 3.0, WALL_Z - 1.2, 9, 4.6, 2.1);
  })();
  const smokeB = makeSmoke(B, { n: 16, x: BO.x, y: BO.y - 0.5, z: WALL_Z - 2.5, sx: 6, sy: 3, sz: 3, rise: 7, scale: 2.4, max: 0.6 });

  // ---- 조명 ----
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9aa0, 1.0));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.2); key.position.set(9, 12, 9); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 60;
  key.shadow.camera.left = -16; key.shadow.camera.right = 16; key.shadow.camera.top = 14; key.shadow.camera.bottom = -8; key.shadow.bias = -0.0012; scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45); fill.position.set(-6, 4, 6); scene.add(fill);
  const fireLightA = new THREE.PointLight(0xff6a1e, 40, 22, 2); fireLightA.position.set(OPEN.x + 0.4, OPEN.y - 1.4, WALL_Z - 3); scene.add(fireLightA);
  const fireLightB = new THREE.PointLight(0xff6420, 60, 34, 2); fireLightB.position.set(OFFB + BO.x, BO.y - 1.5, WALL_Z - 3.5); scene.add(fireLightB);

  // ---- 리사이즈 ----
  function resize() {
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false); camera.aspect = w / h;
    dolly = w / h < 1 ? 5.5 : w / h < 1.5 ? 2.2 : 0; camera.updateProjectionMatrix();
  }
  let dolly = 0;
  window.addEventListener("resize", resize, { passive: true }); resize();

  // ---- 카메라 ----
  const tmp = new THREE.Vector3();
  function placeA(t) {
    camera.position.set(0.4 + Math.sin(t * 0.085) * 0.5, 2.4 + Math.sin(t * 0.065) * 0.2, 9.6 + dolly + Math.sin(t * 0.05) * 0.4);
    camera.lookAt(3.2, 1.7, WALL_Z);
  }
  function placeB(t) {
    camera.position.set(OFFB + 0.3 + Math.sin(t * 0.08) * 0.5, 3.3 + Math.sin(t * 0.06) * 0.2, 12.5 + dolly * 1.2 + Math.sin(t * 0.05) * 0.5);
    camera.lookAt(OFFB + BO.x, 3.0, WALL_Z);
  }

  // ---- 보드 애니메이션 (상·하 분리 시공) ----
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  let seatA = 1;
  function animBoards(la) {
    // la: 0..ACT_A. 0.6~2.8 진입, 이후 밀착 유지
    let e;
    if (la < 0.6) e = 0; else if (la < 2.8) e = easeOut((la - 0.6) / 2.2); else e = 1;
    seatA = e;
    boardTop.position.set(OPEN.x, OPEN.y + (1 - e) * 6.5, SEATZ);
    boardBot.position.set(OPEN.x, OPEN.y - (1 - e) * 6.5, SEATZ);
    boardTop.rotation.z = (1 - e) * -0.12; boardBot.rotation.z = (1 - e) * 0.12;
  }

  // ---- 셔터 애니메이션 ----
  let coverB = 0;
  function animShutter(lb) {
    // lb: 0..ACT_B. 0~2.4 화염 노출, 2.4~6.8 하강, 이후 닫힘 유지
    let c;
    if (lb < 2.4) c = 0.02; else if (lb < 6.8) c = 0.02 + easeOut((lb - 2.4) / 4.4) * 0.98; else c = 1;
    coverB = c; shutter.scale.y = c;
  }

  // ---- 재생 제어 ----
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = null, running = false, t0 = null, t = 0;

  function step(t) {
    const cycle = ((t % LOOP) + LOOP) % LOOP;
    const inA = cycle < ACT_A;
    A.visible = inA; B.visible = !inA;
    // 페이드(경계 근처)
    const dist = Math.min(cycle, Math.abs(cycle - ACT_A), LOOP - cycle);
    fade.style.opacity = String(dist < FADE ? Math.pow(1 - dist / FADE, 1.5) : 0);

    if (inA) {
      const la = cycle;
      placeA(t); animBoards(la);
      animFlames(flamesA, t, 1); animFlames(emberA, t, 1 - seatA * 0.9);
      animSmoke(smokeA, t, 1); animSmoke(smokeCeilA, t, 1);
      fireLightA.intensity = (36 + Math.sin(t * 3.2) * 8 + Math.sin(t * 9) * 4) * (1 - seatA * 0.55);
    } else {
      const lb = cycle - ACT_A;
      placeB(t); animShutter(lb);
      const fireOn = 1 - coverB * 0.82;
      animFlames(fireB, t, fireOn); animFlames(emberB, t, fireOn);
      animSmoke(smokeB, t, 0.6 + fireOn * 0.4);
      fireLightB.intensity = (52 + Math.sin(t * 3) * 10 + Math.sin(t * 8.5) * 5) * (0.25 + fireOn * 0.75);
    }
  }

  function frame(now) { if (t0 === null) t0 = now; t = (now - t0) / 1000; step(t); renderer.render(scene, camera); raf = requestAnimationFrame(frame); }
  function start() { if (running || reduce) return; running = true; t0 = null; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  step(2.0); renderer.render(scene, camera); // 초기: 1막 보드 밀착 상태
  host.classList.add("is-3d");
  if (reduce) return { start: function () {}, stop };

  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (isVisible) start(); });
  let isVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { isVisible = e.isIntersecting; if (isVisible && !document.hidden) start(); else stop(); }); }, { threshold: 0 }).observe(host);
  }
  start();
  return { start, stop };
}
