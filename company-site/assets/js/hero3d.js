// ===== 히어로 3D — 2막 구성 (사실적) =====
// 1막: 벽 뒤에서 화염·연기가 번지고, 배관이 벽을 관통한 개구부를 우리 하얀 내화보드가
//      상·하 두 장으로 배관 위아래에서 날아와 시공되며 막는다.
// 2막: 화면이 전환되어, 불이 난 공간을 뒤로하고 스크린셔터가 위에서 아래로 내려와 차단한다.
// 매 프레임 렌더 — 영상 아님. 배치는 상단 상수로 조정.

export async function initHero3D(canvas, host) {
  const THREE = await import("./vendor/three.module.min.js");

  const WALL_Z = -3.6, WALL_T = 0.5, WALL_FRONT = WALL_Z + WALL_T / 2;
  const OPEN = { x: 3.4, y: 1.4, hw: 1.3, hh: 1.3 };
  const PIPE_R = 0.58, RH = PIPE_R + 0.02; // 보드 반원 노치 — 배관에 꼭 맞게(빈틈 최소)
  const OFFB = -60; // 2막(셔터) 월드 오프셋

  const ACT_A = 11.0, ACT_B = 9.0, LOOP = ACT_A + ACT_B, FADE = 0.7;
  // 1막 타이밍 — 개구부 화염을 충분히 보여준 뒤 보드가 들어온다
  const A_FIRE = 4.2, A_IN = 2.6; // 화염만 4.2s → 2.6s 동안 상·하 보드 시공 → 나머지 밀착 유지

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.96;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9ebef);
  scene.fog = new THREE.Fog(0xe7e9ee, 16, 62); // 뿌옇지 않게 — 안개는 먼 배경에만
  // 간이 환경맵 — 금속(배관·셔터 레일)에 은빛 반사를 준다.
  // 밝은 하늘 / 밝은 수평 스트라이프 / 어두운 바닥 → 배관에 또렷한 하이라이트 띠가 생긴다
  (function () {
    const W = 256, H = 128;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0.00, "#ffffff");
    grd.addColorStop(0.42, "#dfe5ec");
    grd.addColorStop(0.52, "#6e747d");
    grd.addColorStop(1.00, "#20232a"); // 어두운 바닥 — 금속에 명암 대비를 만든다
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // 스튜디오 소프트박스 — 배관 표면에 또렷한 은빛 하이라이트 띠를 남긴다
    g.fillStyle = "#ffffff"; g.fillRect(0, Math.round(H * 0.30), W, Math.round(H * 0.05));
    g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(0, Math.round(H * 0.46), W, 2);
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(Math.round((i + 0.15) * W / 6), 0, Math.round(W / 26), Math.round(H * 0.42)); }
    const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(tex).texture;
  })();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

  // 전환용 페이드 오버레이
  const fade = document.createElement("div");
  fade.style.cssText = "position:absolute;inset:0;background:#eef0f3;opacity:0;pointer-events:none;z-index:2;transition:none;";
  host.appendChild(fade);

  // ---- 재질 ----
  // 벽체 = 방화석고보드(핑크 면지). 하얀 내화보드가 확실히 대비되도록 KCC 방화석고 톤을 쓴다
  const matWall = new THREE.MeshStandardMaterial({ color: 0xdca393, roughness: 0.95 });
  const matWallSide = new THREE.MeshStandardMaterial({ color: 0xc9907f, roughness: 0.96 });
  const matFloor = new THREE.MeshStandardMaterial({ color: 0xcfd0d4, roughness: 0.9 });
  const matCeil = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 1.0 });
  // 반짝이는 은빛 스테인리스 배관
  const matPipe = new THREE.MeshStandardMaterial({ color: 0xccd3dc, roughness: 0.13, metalness: 1.0, envMapIntensity: 2.4 });
  const matBand = new THREE.MeshStandardMaterial({ color: 0xa8b0ba, roughness: 0.2, metalness: 1.0, envMapIntensity: 2.0 });
  const matBoard = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.0, emissive: 0x2a2c31, emissiveIntensity: 0.16 });

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
  // 밝은 배경에서 흰 연무로 번지지 않도록 진한 회색으로 — 가장자리는 빠르게 투명
  const smokeTex = radialTex([[0, "rgba(74,76,82,0.72)"], [0.42, "rgba(88,90,98,0.3)"], [1, "rgba(96,98,108,0)"]]);
  // 흰 덩어리가 아니라 불꽃으로 읽히게 — 코어는 주황, 가장자리는 붉게
  const flameTex = radialTex([[0, "rgba(255,206,110,0.92)"], [0.26, "rgba(255,124,26,0.88)"], [0.58, "rgba(226,52,10,0.44)"], [1, "rgba(150,26,4,0)"]]);

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
      p.sp.material.opacity = on * (0.24 + fl * 0.2); // 겹쳐도 흰색으로 날아가지 않게
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
    // 개구부 뒤 화재실(어두운 뒷벽) — 개구부가 흰색이 아니라 화염/연기로 보이게
    box(14, 14, 0.3, new THREE.MeshStandardMaterial({ color: 0x150f0a, roughness: 1 }), OPEN.x, OPEN.y, WALL_Z - 6, A, false, false);
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
  // 연기는 개구부 주변에만 — 화면 전체를 덮으면 보드·벽 대비가 죽는다
  const smokeA = makeSmoke(A, { n: 10, x: OPEN.x, y: OPEN.y + 0.3, z: WALL_Z - 0.4, sx: 1.8, sy: 1.4, sz: 1.0, rise: 5.4, scale: 1.25, max: 0.4 });
  const smokeCeilA = makeSmoke(A, { n: 5, x: 1.5, y: 5.9, z: WALL_Z + 0.6, sx: 8, sy: 1.0, sz: 2, rise: 1.8, scale: 2.0, max: 0.18 });

  // =====================================================================
  //  2막 — 스크린셔터 하강 차단
  // =====================================================================
  const B = new THREE.Group(); B.position.x = OFFB; scene.add(B);
  const BO = { x: 2.4, y: 3.3, hw: 3.7, hh: 3.5 }; // 대형 개구부(로컬)
  let shutter, shutterMat, shutterBar, shTopY, shH, clipPlane, fireB, emberB;
  (function buildB() {
    const WX0 = -18, WX1 = 18, WY0 = -4.5, WY1 = 16;
    const ox0 = BO.x - BO.hw, ox1 = BO.x + BO.hw, oy0 = BO.y - BO.hh, oy1 = BO.y + BO.hh;
    const slab = (x0, x1, y0, y1) => box(x1 - x0, y1 - y0, WALL_T, matWall, (x0 + x1) / 2, (y0 + y1) / 2, WALL_Z, B);
    slab(WX0, WX1, WY0, oy0); slab(WX0, WX1, oy1, WY1); slab(WX0, ox0, oy0, oy1); slab(ox1, WX1, oy0, oy1);
    box(WX1 - WX0, 0.5, 24, matFloor, 0, WY0 - 0.25, WALL_Z + 10, B, false, true);
    box(WX1 - WX0, 0.4, 24, matCeil, 0, 9.5, WALL_Z + 10, B, false, false);
    // 개구부 안쪽(화재실) — 어두운 뒷벽. 개구부보다 훨씬 크게 잡아야 배경(밝은 회색)이 새지 않는다
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 1 });
    box(34, 30, 0.3, darkMat, BO.x, BO.y, WALL_Z - 7, B, false, false);
    box(34, 0.4, 14, darkMat, BO.x, BO.y - 8, WALL_Z - 3.5, B, false, false); // 화재실 바닥
    box(34, 0.4, 14, darkMat, BO.x, BO.y + 8, WALL_Z - 3.5, B, false, false); // 화재실 천장
    // 가이드레일(좌우) — 실제 스크린셔터 구조(가이드레일 120x75)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x2f3237, roughness: 0.42, metalness: 0.82, envMapIntensity: 1.1 });
    const railH = oy1 + 1.0 - WY0, railCY = (oy1 + 1.0 + WY0) / 2;
    box(0.36, railH, 0.58, railMat, ox0 - 0.04, railCY, WALL_FRONT + 0.36, B, true, true);
    box(0.36, railH, 0.58, railMat, ox1 + 0.04, railCY, WALL_FRONT + 0.36, B, true, true);
    // 서더박스(상부 하우징)
    const housMat = new THREE.MeshStandardMaterial({ color: 0x484c52, roughness: 0.38, metalness: 0.88, envMapIntensity: 1.1 });
    box(2 * BO.hw + 1.3, 0.9, 1.05, housMat, BO.x, oy1 + 0.6, WALL_FRONT + 0.34, B, true, true);
    // 스크린 — 짙은 차콜 패브릭 + 미세 가로 리브 + 세로 심 (실제 사진 참조)
    const sc = document.createElement("canvas"); sc.width = 48; sc.height = 512;
    const gg = sc.getContext("2d"); gg.fillStyle = "#544f48"; gg.fillRect(0, 0, 48, 512);
    for (let y = 0; y < 512; y += 7) { gg.fillStyle = "rgba(26,23,19,0.55)"; gg.fillRect(0, y, 48, 1); gg.fillStyle = "rgba(126,120,112,0.22)"; gg.fillRect(0, y + 1, 48, 1); }
    gg.fillStyle = "rgba(22,19,16,0.42)"; gg.fillRect(15, 0, 1, 512); gg.fillRect(32, 0, 1, 512);
    const stex = new THREE.CanvasTexture(sc);
    shH = 2 * BO.hh + 0.2; const sw = 2 * BO.hw + 0.06; shTopY = oy1 + 0.06;
    clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -shTopY); // y >= bottom 만 표시
    shutterMat = new THREE.MeshStandardMaterial({ map: stex, color: 0x3c382f, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.3, side: THREE.DoubleSide, clippingPlanes: [clipPlane] });
    const sg = new THREE.PlaneGeometry(sw, shH, 1, 20); sg.translate(0, -shH / 2, 0); // 상단이 y=0
    shutter = new THREE.Mesh(sg, shutterMat); shutter.castShadow = true; shutter.receiveShadow = true;
    shutter.position.set(BO.x, shTopY, WALL_FRONT + 0.38); B.add(shutter);
    // 하단 마감바
    const barMat = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.38, metalness: 0.78, envMapIntensity: 1.05 });
    shutterBar = box(sw + 0.12, 0.2, 0.18, barMat, BO.x, shTopY, WALL_FRONT + 0.4, B, true, true); shutterBar.visible = false;
    // 화재실 화염·연기
    fireB = makeFlames(B, BO.x, BO.y - 2.6, WALL_Z - 3.0, 13, 6.4, 2.3);
    emberB = makeFlames(B, BO.x, BO.y - 3.2, WALL_Z - 1.2, 6, 4.8, 1.5);
  })();
  const smokeB = makeSmoke(B, { n: 12, x: BO.x, y: BO.y - 0.5, z: WALL_Z - 2.5, sx: 5, sy: 2.6, sz: 2.6, rise: 6.2, scale: 1.9, max: 0.38 });

  // ---- 조명 ----
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9aa0, 1.0));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.2); key.position.set(9, 12, 9); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 60;
  key.shadow.camera.left = -16; key.shadow.camera.right = 16; key.shadow.camera.top = 14; key.shadow.camera.bottom = -8; key.shadow.bias = -0.0012; scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45); fill.position.set(-6, 4, 6); scene.add(fill);
  // 카메라 쪽 스펙큘러 — 은빛 배관 위로 길게 흐르는 하이라이트를 만든다
  const spec = new THREE.DirectionalLight(0xffffff, 1.6); spec.position.set(7, 6, 14); scene.add(spec);
  // 화재 광원 — 도달 거리를 짧게 잡아 벽 앞면까지 하얗게 태우지 않는다(핑크 벽이 살아야 함)
  const fireLightA = new THREE.PointLight(0xff6a1e, 40, 11, 2); fireLightA.position.set(OPEN.x + 0.4, OPEN.y - 1.4, WALL_Z - 3); scene.add(fireLightA);
  const fireLightB = new THREE.PointLight(0xff6420, 60, 15, 2); fireLightB.position.set(OFFB + BO.x, BO.y - 1.5, WALL_Z - 3.5); scene.add(fireLightB);

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
    // la: 0..ACT_A. 0~A_FIRE 화염만 노출 → A_IN 동안 상·하 보드 진입 → 이후 밀착 유지
    let e;
    if (la < A_FIRE) e = 0; else if (la < A_FIRE + A_IN) e = easeOut((la - A_FIRE) / A_IN); else e = 1;
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
    if (lb < 2.4) c = 0; else if (lb < 6.8) c = easeOut((lb - 2.4) / 4.4); else c = 1;
    coverB = c;
    const bottom = shTopY - c * shH;
    clipPlane.constant = -bottom; // y >= bottom 인 부분만 렌더 → 위에서부터 내려온다
    shutterBar.position.y = bottom;
    shutterBar.visible = c > 0.02;
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
      fireLightB.intensity = (38 + Math.sin(t * 3) * 8 + Math.sin(t * 8.5) * 4) * (0.25 + fireOn * 0.75);
    }
  }

  function frame(now) { if (t0 === null) t0 = now; t = (now - t0) / 1000; step(t); renderer.render(scene, camera); raf = requestAnimationFrame(frame); }
  function start() { if (running || reduce) return; running = true; t0 = null; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  step(8.5); renderer.render(scene, camera); // 초기(및 reduced-motion): 1막 보드 밀착 상태
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
