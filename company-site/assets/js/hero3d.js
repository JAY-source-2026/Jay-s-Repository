// ===== 히어로 3D — 하나의 연속된 공간, 카메라가 이동하는 1테이크 =====
//  ① 확립샷: 벽 전체를 멀리서. 가까운 쪽 배관 관통 개구부와 먼 쪽 넓은 개구부 양쪽에서 불이 보인다.
//  ② 시선이 배관 쪽으로 다가가고 → 하얀 내화보드가 상·하로 날아와 관통부를 시공한다.
//  ③ 시선이 벽을 따라 넓은 개구부로 이동하고 → 스크린셔터가 내려와 개구부를 막는다.
//  ④ 다시 뒤로 빠지며 양쪽 다 막힌 벽을 보여주고 루프.
// 매 프레임 렌더 — 영상 아님. 배치·타이밍은 상단 상수로 조정.

export async function initHero3D(canvas, host) {
  const THREE = await import("./vendor/three.module.min.js");

  // ---- 배치 ----
  const WALL_Z = -4.0, WALL_T = 0.5, WALL_FRONT = WALL_Z + WALL_T / 2;
  const WX0 = -46, WX1 = 34, WY0 = -5, WY1 = 13;          // 벽 범위(확립샷 카메라가 벽 안쪽에 들어오도록 오른쪽으로 넉넉히)
  const PEN = { x: 9, y: 1.7, hw: 1.35, hh: 1.35 };        // 가까운 쪽 — 배관 관통부
  const BIG = { x: -13, y: 0.6, hw: 4.6, hh: 5.2 };        // 먼 쪽 — 셔터가 막을 넓은 개구부(바닥까지 내려오는 대형 개구부)
  const PIPE_R = 0.58, RH = PIPE_R + 0.02;                 // 보드 반원 노치 — 배관에 꼭 맞게

  // ---- 타임라인(초) ----
  const LOOP = 26.0;
  const BOARD_IN = 9.4, BOARD_DUR = 2.6;   // 내화보드 진입
  const SHUT_IN = 18.2, SHUT_DUR = 3.8;    // 셔터 하강

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.96;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9ebef);
  scene.fog = new THREE.Fog(0xe7e9ee, 34, 145); // 넓은 씬 — 안개는 아주 먼 배경에만

  // 간이 환경맵 — 금속(배관·레일·셔터 하우징)에 또렷한 은빛 반사를 준다
  (function () {
    const W = 256, H = 128;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0.00, "#ffffff");
    grd.addColorStop(0.42, "#dfe5ec");
    grd.addColorStop(0.52, "#6e747d");
    grd.addColorStop(1.00, "#20232a"); // 어두운 바닥 — 금속에 명암 대비를 만든다
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffffff"; g.fillRect(0, Math.round(H * 0.30), W, Math.round(H * 0.05));
    g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(0, Math.round(H * 0.46), W, 2);
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(Math.round((i + 0.15) * W / 6), 0, Math.round(W / 26), Math.round(H * 0.42)); }
    const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(tex).texture;
  })();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 320);

  // ---- 재질 ----
  // 벽체 = 방화석고보드(핑크 면지). 하얀 내화보드가 확실히 대비되도록 KCC 방화석고 톤
  const matWall = new THREE.MeshStandardMaterial({ color: 0xdca393, roughness: 0.95 });
  const matWallSide = new THREE.MeshStandardMaterial({ color: 0xc9907f, roughness: 0.96 });
  const matFloor = new THREE.MeshStandardMaterial({ color: 0xcfd0d4, roughness: 0.9 });
  const matCeil = new THREE.MeshStandardMaterial({ color: 0x2b2e34, roughness: 1.0 }); // 완전 검정은 멀리서 화면을 눌러버린다
  const matDark = new THREE.MeshStandardMaterial({ color: 0x161210, roughness: 1.0 });
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

  function makeFlames(cx, cy, cz, count, spread, size) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      const p = { sp: s, bx: cx + (Math.random() - 0.5) * spread, by: cy + Math.random() * spread * 0.4, cz: cz + (Math.random() - 0.5) * spread * 0.6, base: size * (0.7 + Math.random() * 0.7), ph: Math.random() * 6.28, sp2: 5 + Math.random() * 5 };
      s.position.set(p.bx, p.by, p.cz); scene.add(s); arr.push(p);
    }
    return arr;
  }
  function makeSmoke(cfg) {
    const arr = [];
    for (let i = 0; i < cfg.n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
      const p = {
        sp: s, x: cfg.x + (Math.random() - 0.5) * cfg.sx, z: cfg.z + (Math.random() - 0.5) * cfg.sz,
        y0: cfg.y + (Math.random() - 0.5) * cfg.sy, rise: cfg.rise, scale: cfg.scale + Math.random() * cfg.scale,
        phase: Math.random(), life: 3 + Math.random() * 3, max: cfg.max,
      };
      s.position.set(p.x, p.y0, p.z); scene.add(s); arr.push(p);
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
      p.sp.visible = on > 0.01;
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
  //  벽체 — 개구부 두 곳(가까운 관통부 / 먼 넓은 개구부)을 남기고 슬래브로 채운다
  // =====================================================================
  (function buildWall() {
    const p0 = PEN.x - PEN.hw, p1 = PEN.x + PEN.hw, pb = PEN.y - PEN.hh, pt = PEN.y + PEN.hh;
    const b0 = BIG.x - BIG.hw, b1 = BIG.x + BIG.hw, bb = BIG.y - BIG.hh, bt = BIG.y + BIG.hh;
    const slab = (x0, x1, y0, y1) => { if (x1 - x0 > 0.001 && y1 - y0 > 0.001) box(x1 - x0, y1 - y0, WALL_T, matWall, (x0 + x1) / 2, (y0 + y1) / 2, WALL_Z, scene); };
    // 두 개구부의 y 경계로 가로 띠를 나누고, 각 띠에서 그 높이에 걸린 개구부만 비운다
    const bands = [WY0, bb, pb, pt, bt, WY1].sort((a, b) => a - b);
    for (let i = 0; i < bands.length - 1; i++) {
      const y0 = bands[i], y1 = bands[i + 1];
      if (y1 - y0 < 0.001) continue;
      const mid = (y0 + y1) / 2;
      const gaps = [];
      if (mid > bb && mid < bt) gaps.push([b0, b1]);
      if (mid > pb && mid < pt) gaps.push([p0, p1]);
      gaps.sort((a, b) => a[0] - b[0]);
      let x = WX0;
      for (const [g0, g1] of gaps) { slab(x, g0, y0, y1); x = g1; }
      slab(x, WX1, y0, y1);
    }

    // 석고보드 조인트 — 멀리서 볼 때 벽이 그냥 색면이 아니라 건축으로 읽히게 스케일을 준다
    const matJoint = new THREE.MeshStandardMaterial({ color: 0xcb9384, roughness: 0.97 });
    for (let jx = WX0 + 6; jx < WX1; jx += 6) {
      const inPen = jx > p0 - 0.2 && jx < p1 + 0.2, inBig = jx > b0 - 0.2 && jx < b1 + 0.2;
      if (inPen || inBig) continue;
      box(0.07, WY1 - WY0, 0.04, matJoint, jx, (WY0 + WY1) / 2, WALL_FRONT + 0.03, scene, false, false);
    }
    box(WX1 - WX0, 0.09, 0.04, matJoint, (WX0 + WX1) / 2, 7.4, WALL_FRONT + 0.03, scene, false, false);
    // 걸레받이
    box(WX1 - WX0, 0.34, 0.1, matWallSide, (WX0 + WX1) / 2, WY0 + 0.17, WALL_FRONT + 0.06, scene, false, true);

    // 실내 바닥·천장·측벽
    box(WX1 - WX0, 0.5, 52, matFloor, (WX0 + WX1) / 2, WY0 - 0.25, WALL_Z + 24, scene, false, true);
    // 천장은 벽에 붙은 얇은 보이드 띠로만 — 큰 검은 판은 멀리서 화면을 눌러버린다
    box(WX1 - WX0, 1.0, 2.2, matCeil, (WX0 + WX1) / 2, 12.4, WALL_Z + 1.2, scene, false, false);
    box(0.5, WY1 - WY0, 52, matWallSide, WX0 + 0.25, (WY0 + WY1) / 2, WALL_Z + 24, scene, false, true);

    // 화재측(벽 뒤) — 어두운 방. 개구부 너머로 밝은 배경이 새면 흰 후광이 생긴다
    const bkTop = WY1 + 0.3, bkBot = WY0 - 10; // 벽 위로 삐져나오면 하늘 자리에 검은 판이 생긴다
    box(WX1 - WX0 + 30, bkTop - bkBot, 0.4, matDark, (WX0 + WX1) / 2, (bkTop + bkBot) / 2, WALL_Z - 17, scene, false, false);
    box(WX1 - WX0 + 30, 0.4, 34, matDark, (WX0 + WX1) / 2, WY0 - 0.4, WALL_Z - 17, scene, false, false); // 화재실 바닥
    box(WX1 - WX0 + 30, 0.4, 34, matDark, (WX0 + WX1) / 2, 10.0, WALL_Z - 17, scene, false, false);      // 화재실 천장
  })();

  // ---- 관통 배관 + 밴드 ----
  (function buildPipe() {
    const cz = WALL_Z + 1.4, len = 8.4; // 클로즈업에서 배관이 화면을 가로지르지 않도록 짧게
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R, PIPE_R, len, 44), matPipe);
    pipe.rotation.x = Math.PI / 2; pipe.position.set(PEN.x, PEN.y, cz); pipe.castShadow = true; pipe.receiveShadow = true; scene.add(pipe);
    [-1.5, 1.1].forEach((dz) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R + 0.03, PIPE_R + 0.03, 0.16, 44), matBand);
      b.rotation.x = Math.PI / 2; b.position.set(PEN.x, PEN.y, cz + dz); b.castShadow = true; scene.add(b);
    });
    // 천장 배관 — 공간감
    const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 44, 32), matPipe);
    cp.rotation.z = Math.PI / 2; cp.position.set(-6, 9.4, WALL_Z + 3.2); cp.castShadow = true; scene.add(cp);
  })();

  // ---- 상·하 반쪽 내화보드 (배관 반원 노치) ----
  const HALF = 1.66, BD = 0.16;
  function halfBoard(top) {
    const s = new THREE.Shape();
    if (top) {
      s.moveTo(-HALF, 0); s.lineTo(-RH, 0);
      s.absarc(0, 0, RH, Math.PI, 0, true);
      s.lineTo(HALF, 0); s.lineTo(HALF, HALF); s.lineTo(-HALF, HALF);
    } else {
      s.moveTo(-HALF, 0); s.lineTo(-HALF, -HALF); s.lineTo(HALF, -HALF); s.lineTo(HALF, 0); s.lineTo(RH, 0);
      s.absarc(0, 0, RH, 0, Math.PI, true);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: BD, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, steps: 1, curveSegments: 48 });
    geo.translate(0, 0, -BD / 2);
    const m = new THREE.Mesh(geo, matBoard.clone()); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }
  const boardTop = halfBoard(true), boardBot = halfBoard(false);
  const SEATZ = WALL_FRONT + 0.1;

  // =====================================================================
  //  스크린셔터 — 실제 구동 영상(docs/사진/셔터 영상.mp4) 기준으로 재현
  //   · 원단은 짙은 회색이 아니라 **크림색 유리섬유 직물**, 가로 이음매가 1m 간격
  //   · 중앙 스테인리스 기둥이 개구부를 둘로 나누고 패널도 좌·우 두 장
  //   · 하부 마감바는 **가운데가 처지는 완만한 곡선**(카테너리) — 이게 제일 큰 특징
  //   · 서더박스는 노출 강판 박스가 아니라 상부 소핏(내림벽) 안에 숨고 슬롯만 보인다
  //   · 뒤가 화재실이라 원단이 은은하게 배광된다
  // =====================================================================
  const SHUT_SAG = 0.4, BAR_SEGS = 22;
  let shPanels = [], shTopY, shH;
  (function buildShutter() {
    const b0 = BIG.x - BIG.hw, b1 = BIG.x + BIG.hw, bt = BIG.y + BIG.hh, bb = BIG.y - BIG.hh;
    const steel = new THREE.MeshStandardMaterial({ color: 0xb6bcc4, roughness: 0.22, metalness: 0.95, envMapIntensity: 1.7 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x53585f, roughness: 0.4, metalness: 0.8, envMapIntensity: 1.0 });
    const SZ = WALL_FRONT + 0.55; // 셔터가 걸리는 면

    // 상부 소핏(내림벽) — 영상처럼 원단이 벽 속 슬롯에서 나온다
    box(2 * BIG.hw + 3.0, 1.6, 1.25, matWall, BIG.x, bt + 0.9, WALL_FRONT + 0.62, scene, true, true);
    box(2 * BIG.hw + 3.0, 0.12, 1.3, trim, BIG.x, bt + 0.12, WALL_FRONT + 0.62, scene);        // 슬롯 하단 마감
    box(2 * BIG.hw + 2.6, 0.1, 0.16, matDark, BIG.x, bt + 0.13, WALL_FRONT + 0.55, scene);     // 인출 슬롯(어두운 틈)

    // 중앙 스테인리스 기둥 — 개구부를 좌·우 두 패널로 나눈다
    const COLW = 0.52;
    box(COLW, bt - bb + 0.6, 0.62, steel, BIG.x, (bt + bb) / 2, SZ + 0.16, scene, true, true);

    // 가이드레일 — 영상에선 벽에 붙은 얇은 트랙 수준(두꺼운 기둥처럼 보이면 안 된다)
    [b0 - 0.09, b1 + 0.09].forEach((x) => box(0.18, bt - bb + 0.3, 0.2, trim, x, (bt + bb) / 2, SZ, scene, true, true));

    // 원단 텍스처 — 크림색 유리섬유. 1m 간격 가로 이음매 + 세로 주름
    const W = 128, H = 1024;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    g.fillStyle = "#e9e3d3"; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) { // 직물 결
      g.fillStyle = y % 4 === 0 ? "rgba(255,255,255,0.05)" : "rgba(120,112,96,0.05)";
      g.fillRect(0, y, W, 1);
    }
    for (let x = 0; x < W; x += 7) { // 세로 주름
      g.fillStyle = "rgba(146,138,120,0.09)"; g.fillRect(x, 0, 2, H);
      g.fillStyle = "rgba(255,255,250,0.09)"; g.fillRect(x + 2, 0, 1, H);
    }
    for (let y = 0; y < H; y += 128) { // 가로 이음매(약 1m 간격)
      g.fillStyle = "rgba(255,253,246,0.5)"; g.fillRect(0, y - 2, W, 2);
      g.fillStyle = "rgba(128,120,104,0.42)"; g.fillRect(0, y, W, 3);
    }
    const stex = new THREE.CanvasTexture(c);
    stex.wrapS = stex.wrapT = THREE.RepeatWrapping; stex.anisotropy = 4;

    shH = bt - bb + 0.7; shTopY = bt + 0.1;
    const pw = (2 * BIG.hw - COLW) / 2 - 0.06;          // 패널 한 장 폭
    const px = [BIG.x - COLW / 2 - pw / 2 - 0.03, BIG.x + COLW / 2 + pw / 2 + 0.03];

    for (const cx of px) {
      const mat = new THREE.MeshStandardMaterial({
        map: stex.clone(), bumpMap: stex, bumpScale: 0.05,
        color: 0xefe9da, roughness: 0.97, metalness: 0.0, envMapIntensity: 0.35,
        emissive: 0xff7a2a, emissiveIntensity: 0.0, // 뒤 화재실 배광 — 애니에서 조절
        side: THREE.DoubleSide,
      });
      mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;

      // 아래로 갈수록 가운데가 처지는 카테너리 — 상단은 팽팽, 하단이 최대 SHUT_SAG
      const geo = new THREE.PlaneGeometry(pw, shH, 20, 40);
      geo.translate(0, -shH / 2, 0); // 상단이 y=0
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i), vy = pos.getY(i);
        const k = Math.min(1, -vy / shH);                       // 0(상단) → 1(하단)
        const u = Math.min(1, Math.abs(vx) / (pw / 2));         // 0(가운데) → 1(가장자리)
        pos.setY(i, vy - SHUT_SAG * k * (1 - u * u));
        pos.setZ(i, pos.getZ(i) - 0.06 * k * (1 - u * u));      // 처지면서 살짝 앞으로 배부름
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.position.set(cx, shTopY, SZ); mesh.scale.y = 0.0001; scene.add(mesh);

      // 하부 마감바 — 처짐 곡선을 따라가도록 여러 토막으로 나눠 배치
      const barGroup = new THREE.Group(); scene.add(barGroup);
      const segW = pw / BAR_SEGS + 0.02, segs = [];
      for (let i = 0; i < BAR_SEGS; i++) {
        const t = (i + 0.5) / BAR_SEGS, sx = cx - pw / 2 + t * pw;
        const u = Math.min(1, Math.abs(sx - cx) / (pw / 2));
        const seg = box(segW, 0.26, 0.3, trim, sx, shTopY, SZ, barGroup, true, true);
        segs.push({ mesh: seg, sag: SHUT_SAG * (1 - u * u), dz: -0.06 * (1 - u * u) });
      }
      barGroup.visible = false;
      shPanels.push({ mesh, mat, barGroup, segs });
    }
  })();

  // ---- 화염·연기 ----
  // 가까운 쪽: 관통부 뒤 화재
  const firePen = makeFlames(PEN.x, PEN.y - 1.2, WALL_Z - 2.0, 12, 3.0, 2.0);
  const emberPen = makeFlames(PEN.x, PEN.y - 0.2, WALL_Z - 0.8, 7, 2.0, 1.4);
  const smokePen = makeSmoke({ n: 9, x: PEN.x, y: PEN.y + 0.4, z: WALL_Z - 0.4, sx: 1.8, sy: 1.4, sz: 1.0, rise: 5.4, scale: 1.25, max: 0.4 });
  // 먼 쪽: 넓은 개구부 너머의 큰 화재
  const fireBig = makeFlames(BIG.x, BIG.y - 2.4, WALL_Z - 4.0, 15, 7.0, 2.6);
  const emberBig = makeFlames(BIG.x, BIG.y - 3.0, WALL_Z - 1.4, 7, 5.2, 1.7);
  const smokeBig = makeSmoke({ n: 12, x: BIG.x, y: BIG.y - 0.3, z: WALL_Z - 3.0, sx: 5.4, sy: 2.6, sz: 2.6, rise: 7.0, scale: 2.1, max: 0.38 });

  // ---- 조명 ----
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9aa0, 1.0));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.2); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 1; key.shadow.camera.far = 70;
  key.shadow.camera.left = -14; key.shadow.camera.right = 14; key.shadow.camera.top = 12; key.shadow.camera.bottom = -10; key.shadow.bias = -0.0012;
  scene.add(key); scene.add(key.target); // 그림자 카메라가 시선을 따라다니게(넓은 씬에서 해상도 확보)
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45); fill.position.set(-6, 4, 6); scene.add(fill);
  // 카메라 쪽 스펙큘러 — 은빛 배관 위로 길게 흐르는 하이라이트를 만든다
  const spec = new THREE.DirectionalLight(0xffffff, 1.6); spec.position.set(7, 6, 14); scene.add(spec);
  // 화재 광원 — 도달 거리를 짧게 잡아 벽 앞면까지 하얗게 태우지 않는다(핑크 벽이 살아야 함)
  const fireLightPen = new THREE.PointLight(0xff6a1e, 40, 11, 2); fireLightPen.position.set(PEN.x + 0.4, PEN.y - 1.4, WALL_Z - 3); scene.add(fireLightPen);
  const fireLightBig = new THREE.PointLight(0xff6420, 60, 16, 2); fireLightBig.position.set(BIG.x, BIG.y - 1.5, WALL_Z - 3.5); scene.add(fireLightBig);

  // ---- 리사이즈 ----
  let fovK = 1;
  function resize() {
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const a = w / h;
    fovK = a < 0.8 ? 1.45 : a < 1.2 ? 1.26 : a < 1.6 ? 1.1 : 1; // 세로 화면일수록 화각을 넓힌다
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true }); resize();

  // =====================================================================
  //  카메라 — 키프레임 사이를 부드럽게 이동하는 1테이크
  // =====================================================================
  // 주역(개구부)은 늘 화면 오른쪽 — 왼쪽은 헤드라인 자리다. 그래서 시선 지점을 주역보다 왼쪽에 둔다
  // f = 화각. 확립샷은 넓게(두 개구부가 다 들어오게), 클로즈업은 좁게 — 줌 자체가 연출이 된다
  const KEYS = [
    { t: 0.0,  p: [17, 7.0, 30], l: [-11, 4.0, WALL_Z], f: 56 },  // 확립샷 — 벽 전체, 양쪽에서 불
    { t: 5.2,  p: [16, 6.4, 27], l: [-9, 3.8, WALL_Z], f: 52 },  // 천천히 다가가기 시작
    { t: 9.0,  p: [13.6, 3.4, 12.0], l: [PEN.x - 3.2, PEN.y + 0.6, WALL_Z], f: 36 }, // 관통부 클로즈업 도착
    { t: 13.6, p: [13.2, 3.3, 11.4], l: [PEN.x - 3.2, PEN.y + 0.6, WALL_Z], f: 36 }, // 시공 지켜보기
    { t: 17.8, p: [-8.0, 4.2, 20.0], l: [BIG.x - 3.8, BIG.y + 0.8, WALL_Z], f: 46 }, // 벽을 따라 넓은 개구부로
    { t: 22.6, p: [-8.6, 4.0, 20.6], l: [BIG.x - 3.8, BIG.y + 0.8, WALL_Z], f: 46 }, // 셔터 닫히는 것 보기
    { t: 26.0, p: [17, 7.0, 30], l: [-11, 4.0, WALL_Z], f: 56 },  // 다시 뒤로 빠지며 루프
  ];
  const smooth = (k) => k * k * (3 - 2 * k);
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function placeCamera(cycle, t) {
    let i = 0; while (i < KEYS.length - 2 && cycle >= KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const k = smooth(Math.min(1, Math.max(0, (cycle - a.t) / (b.t - a.t))));
    camPos.set(a.p[0], a.p[1], a.p[2]).lerp(tmpA.set(b.p[0], b.p[1], b.p[2]), k);
    const fov = (a.f + (b.f - a.f) * k) * fovK;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camLook.set(a.l[0], a.l[1], a.l[2]).lerp(tmpB.set(b.l[0], b.l[1], b.l[2]), k);
    // 미세한 손떨림 — 정지 구간에서도 살아있게
    camPos.x += Math.sin(t * 0.21) * 0.22; camPos.y += Math.sin(t * 0.17) * 0.12;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    // 키라이트·그림자 카메라를 현재 시선 지점으로 이동
    key.target.position.copy(camLook);
    key.position.set(camLook.x + 9, camLook.y + 12, camLook.z + 11);
  }

  // ---- 보드·셔터 애니메이션 ----
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const clamp01 = (k) => Math.min(1, Math.max(0, k));
  let seatPen = 0, coverBig = 0;
  function animBoards(cycle) {
    const e = cycle < BOARD_IN ? 0 : easeOut(clamp01((cycle - BOARD_IN) / BOARD_DUR));
    seatPen = e;
    // 확립샷에서 보드가 공중에 떠 있으면 이상하다 — 시공 직전에만 등장
    const on = cycle > BOARD_IN - 1.0;
    boardTop.visible = boardBot.visible = on;
    if (!on) return;
    boardTop.position.set(PEN.x, PEN.y + (1 - e) * 6.5, SEATZ);
    boardBot.position.set(PEN.x, PEN.y - (1 - e) * 6.5, SEATZ);
    boardTop.rotation.z = (1 - e) * -0.12; boardBot.rotation.z = (1 - e) * 0.12;
  }
  function animShutter(cycle, t) {
    // 실제 셔터는 등속에 가깝게 내려온다 — 마지막만 살짝 감속
    const raw = cycle < SHUT_IN ? 0 : clamp01((cycle - SHUT_IN) / SHUT_DUR);
    const c = raw < 0.85 ? raw : 0.85 + easeOut((raw - 0.85) / 0.15) * 0.15;
    coverBig = c;
    const glow = (0.05 + 0.1 * Math.abs(Math.sin(t * 2.4))) * c;
    for (const p of shPanels) {
      p.mesh.scale.y = Math.max(0.0001, c);
      // 스케일로 내리면 직물 무늬가 늘어난다 → UV를 상단 기준으로 잘라 원래 결을 유지
      p.mat.map.repeat.y = Math.max(0.0001, c);
      p.mat.map.offset.y = 1 - Math.max(0.0001, c);
      p.mat.emissiveIntensity = glow; // 뒤 화재실이 원단을 은은하게 배광
      const bottom = shTopY - c * shH;
      for (const s of p.segs) { s.mesh.position.y = bottom - s.sag * c; s.mesh.position.z = WALL_FRONT + 0.55 + s.dz * c; }
      p.barGroup.visible = c > 0.015;
    }
  }

  // ---- 재생 제어 ----
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = null, running = false, t0 = null;

  function step(t) {
    const cycle = ((t % LOOP) + LOOP) % LOOP;
    animBoards(cycle); animShutter(cycle, t);
    placeCamera(cycle, t);

    const penOn = 1 - seatPen * 0.94;
    animFlames(firePen, t, penOn); animFlames(emberPen, t, penOn);
    animSmoke(smokePen, t, 0.25 + penOn * 0.75);
    fireLightPen.intensity = (36 + Math.sin(t * 3.2) * 8 + Math.sin(t * 9) * 4) * (1 - seatPen * 0.8);

    const bigOn = 1 - coverBig * 0.9;
    animFlames(fireBig, t, bigOn); animFlames(emberBig, t, bigOn);
    animSmoke(smokeBig, t, 0.3 + bigOn * 0.7);
    fireLightBig.intensity = (38 + Math.sin(t * 3) * 8 + Math.sin(t * 8.5) * 4) * (0.2 + bigOn * 0.8);
  }

  function frame(now) { if (t0 === null) t0 = now; const t = (now - t0) / 1000; step(t); renderer.render(scene, camera); raf = requestAnimationFrame(frame); }
  function start() { if (running || reduce) return; running = true; t0 = null; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  step(0); renderer.render(scene, camera); // 초기(및 reduced-motion): 확립샷
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
