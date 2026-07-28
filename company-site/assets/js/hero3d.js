// ===== 히어로 3D — 하나의 연속된 공간, 카메라가 이동하는 1테이크 =====
//  ① 확립샷: 건물 내부. 벽 전체를 멀리서. 배관·덕트 관통부와 넓은 개구부 모두에서
//     불이 개구부 밖으로 삐져나와 벽면을 핥는다. 앞쪽에는 사람들이 지나다닌다.
//  ② 시선이 관통부로 다가가고 → 하얀 내화보드가 상·하로 날아와 배관과 덕트를 각각 감싸며 밀착.
//     보드가 밀착된 뒤에야 그쪽 불이 꺼진다.
//  ③ 시선이 벽을 따라 넓은 개구부로 이동하고 → 스크린셔터가 한 장으로 쭉 내려와 막는다.
//     셔터가 다 닫힌 뒤에야 그쪽 불이 꺼진다.
//  ④ 다시 뒤로 빠지며 전부 막힌 벽을 보여주고 루프.
// 매 프레임 렌더 — 영상 아님. 배치·타이밍은 상단 상수로 조정.

export async function initHero3D(canvas, host) {
  const THREE = await import("./vendor/three.module.min.js");

  // ---- 배치 (1 단위 = 1m) ----
  const WALL_Z = -4.0, WALL_T = 0.5, WALL_FRONT = WALL_Z + WALL_T / 2;
  const WX0 = -46, WX1 = 34, WY0 = -5, WY1 = 13;           // 벽 범위
  const PEN  = { x: 9.0, y: 1.7, hw: 1.35, hh: 1.35 };     // 가까운 쪽 — 원형 배관 관통부
  const DUCT = { x: 4.6, y: 1.9, hw: 1.95, hh: 1.25 };     // 그 옆 — 사각덕트 관통부
  const BIG  = { x: -13, y: 0.6, hw: 4.6,  hh: 5.2 };      // 먼 쪽 — 셔터가 막을 대형 개구부(바닥까지)
  const OPENINGS = [PEN, DUCT, BIG];
  const PIPE_R = 0.58, RH = PIPE_R + 0.02;                 // 보드 반원 노치 — 배관에 꼭 맞게
  const DUCT_W = 3.0, DUCT_H = 1.75;                       // 사각덕트 단면
  const NW = DUCT_W / 2 + 0.03, NH = DUCT_H / 2 + 0.03;    // 보드 사각 노치

  // ---- 타임라인(초) ----
  const LOOP = 30.0;
  const BOARD_IN = 10.0, BOARD_DUR = 2.6;    // 배관 내화보드 진입
  const DKB_IN   = 11.0, DKB_DUR   = 2.6;    // 덕트 내화보드 진입(살짝 뒤따라온다)
  const PEN_OUT  = 13.9, PEN_OUT_D = 1.7;    // 보드 밀착 후 진화
  const SHUT_IN  = 21.0, SHUT_DUR  = 4.0;    // 셔터 하강
  const BIG_OUT  = 25.3, BIG_OUT_D = 1.9;    // 셔터 닫힌 후 진화

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // 노출은 낮게 — 벽이 흰색으로 날아가면 하얀 내화보드도 크림색 셔터 원단도 안 보인다
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe2e8);
  scene.fog = new THREE.Fog(0xd9dce3, 46, 155); // 넓은 씬 — 안개는 아주 먼 배경에만

  // 간이 환경맵 — 금속(배관·덕트·레일)에 또렷한 은빛 반사를 준다
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
  // 벽체 = 노출 콘크리트 톤의 건축 마감. 하얀 내화보드가 확실히 대비되도록 중간 명도의 웜그레이
  const matWall     = new THREE.MeshStandardMaterial({ color: 0x8b8479, roughness: 0.94 });
  const matWallSide = new THREE.MeshStandardMaterial({ color: 0x7f7971, roughness: 0.96 });
  const matCol      = new THREE.MeshStandardMaterial({ color: 0xa69f96, roughness: 0.9 });  // 기둥(빛 받는 면)
  const matBeam     = new THREE.MeshStandardMaterial({ color: 0x8b857c, roughness: 0.92 }); // 보·인방
  const matReveal   = new THREE.MeshStandardMaterial({ color: 0x6b6660, roughness: 0.97 }); // 패널 줄눈
  const matFloor    = new THREE.MeshStandardMaterial({ color: 0x9a9ba1, roughness: 0.9 });
  const matFJoint   = new THREE.MeshStandardMaterial({ color: 0x7f8086, roughness: 0.95 });
  const matCeil     = new THREE.MeshStandardMaterial({ color: 0x676460, roughness: 1.0 });  // 완전 검정은 멀리서 화면을 눌러버린다
  const matCeilBeam = new THREE.MeshStandardMaterial({ color: 0x55524e, roughness: 1.0 });
  const matDark     = new THREE.MeshStandardMaterial({ color: 0x161210, roughness: 1.0 });
  // 반짝이는 은빛 스테인리스 배관 / 아연도 사각덕트
  const matPipe = new THREE.MeshStandardMaterial({ color: 0xccd3dc, roughness: 0.13, metalness: 1.0, envMapIntensity: 2.4 });
  const matDuct = new THREE.MeshStandardMaterial({ color: 0xbcc3cb, roughness: 0.3,  metalness: 0.92, envMapIntensity: 1.8 });
  const matBand = new THREE.MeshStandardMaterial({ color: 0xa8b0ba, roughness: 0.2,  metalness: 1.0, envMapIntensity: 2.0 });
  const matBoard = new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.72, metalness: 0.0, emissive: 0x22242a, emissiveIntensity: 0.1 });

  function box(w, h, d, mat, x, y, z, parent, cast, rec) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = cast !== false; m.receiveShadow = rec !== false;
    (parent || scene).add(m); return m;
  }
  // 어떤 x가 개구부(또는 그 주변 여유)에 걸리는지 — 기둥·줄눈을 피해 배치하기 위한 판정
  function nearOpening(x, margin) {
    for (const o of OPENINGS) if (x > o.x - o.hw - margin && x < o.x + o.hw + margin) return true;
    return false;
  }

  // =====================================================================
  //  불·연기 — 수명 기반 파티클. 개구부에서 **밖으로 뿜어져 나와** 위로 핥고 올라간다
  // =====================================================================
  function softDraw(S, paint, blur) {
    const c = document.createElement("canvas"); c.width = c.height = S;
    paint(c.getContext("2d"), S);
    const c2 = document.createElement("canvas"); c2.width = c2.height = S;
    const g2 = c2.getContext("2d");
    try { g2.filter = "blur(" + (blur === undefined ? 4 : blur) + "px)"; } catch (e) { /* 미지원 브라우저는 그대로 */ }
    g2.drawImage(c, 0, 0);
    return new THREE.CanvasTexture(c2);
  }
  // 화염 혀 실루엣. 밝은 벽 위에서 additive만 쓰면 흰 얼룩이 된다 →
  // **본체는 일반 블렌딩의 진한 주황**, 그 위에 작은 **additive 코어**만 얹는다.
  function flameShape(g, S) {
    g.beginPath();
    g.moveTo(S * 0.50, S * 0.02);
    g.bezierCurveTo(S * 0.76, S * 0.30, S * 0.94, S * 0.58, S * 0.84, S * 0.80);
    g.bezierCurveTo(S * 0.72, S * 0.99, S * 0.28, S * 0.99, S * 0.16, S * 0.80);
    g.bezierCurveTo(S * 0.06, S * 0.58, S * 0.24, S * 0.30, S * 0.50, S * 0.02);
    g.closePath(); g.clip();
  }
  const flameBodyTex = softDraw(256, (g, S) => {
    const grd = g.createRadialGradient(S * 0.5, S * 0.74, 1, S * 0.5, S * 0.66, S * 0.54);
    grd.addColorStop(0.00, "rgba(255,214,116,0.98)");
    grd.addColorStop(0.20, "rgba(255,158,40,0.96)");
    grd.addColorStop(0.46, "rgba(236,88,14,0.82)");
    grd.addColorStop(0.74, "rgba(172,36,6,0.36)");
    grd.addColorStop(1.00, "rgba(108,18,3,0)");
    flameShape(g, S); g.fillStyle = grd; g.fillRect(0, 0, S, S);
  }, 5);
  const flameCoreTex = softDraw(256, (g, S) => {
    const grd = g.createRadialGradient(S * 0.5, S * 0.76, 1, S * 0.5, S * 0.70, S * 0.42);
    grd.addColorStop(0.00, "rgba(255,250,224,1)");
    grd.addColorStop(0.26, "rgba(255,206,96,0.8)");
    grd.addColorStop(0.62, "rgba(255,128,24,0.24)");
    grd.addColorStop(1.00, "rgba(200,50,8,0)");
    flameShape(g, S); g.fillStyle = grd; g.fillRect(0, 0, S, S);
  }, 5);
  // 불티 — 작고 아주 밝은 점
  const emberTex = softDraw(64, (g, S) => {
    const grd = g.createRadialGradient(S / 2, S / 2, 0.5, S / 2, S / 2, S * 0.44);
    grd.addColorStop(0.00, "rgba(255,246,214,1)");
    grd.addColorStop(0.30, "rgba(255,186,72,0.9)");
    grd.addColorStop(1.00, "rgba(230,90,16,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2); g.fill();
  });
  // 밝은 배경에서 흰 연무로 번지지 않도록 진한 회색
  const smokeTex = softDraw(128, (g, S) => {
    const grd = g.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S * 0.48);
    grd.addColorStop(0.00, "rgba(66,68,74,0.74)");
    grd.addColorStop(0.42, "rgba(84,86,94,0.3)");
    grd.addColorStop(1.00, "rgba(96,98,108,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(S / 2, S / 2, S * 0.48, 0, Math.PI * 2); g.fill();
  });

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clampFire = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // cfg: x,y,z 발생 중심 / w,h,dz 발생 범위 / out 개구부 밖으로 나오는 거리 / rise 상승 / size / life / max
  function makeFire(cfg, tex, additive) {
    const arr = [];
    for (let i = 0; i < cfg.n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false, fog: false,
        // 톤매핑을 태우면 주황이 흐린 베이지로 죽는다 — 불만은 원색 그대로 낸다
        toneMapped: false,
        blending: additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
      }));
      s.position.set(cfg.x, cfg.y, cfg.z);
      scene.add(s);
      arr.push({
        sp: s,
        x: cfg.x + rnd(-0.5, 0.5) * cfg.w,
        y0: cfg.y + rnd(-0.5, 0.5) * cfg.h,
        z0: cfg.z + rnd(-0.5, 0.5) * (cfg.dz || 0.5),
        out: cfg.out * rnd(0.3, 1.0),
        rise: cfg.rise * rnd(0.6, 1.35),
        size: cfg.size * rnd(0.55, 1.25),
        life: cfg.life * rnd(0.7, 1.35),
        ph: Math.random(),
        wob: rnd(0.4, 1.4),
        max: cfg.max,
        rot: rnd(-0.15, 0.15),
        tall: cfg.tall === undefined ? 1.75 : cfg.tall,
        wide: cfg.wide === undefined ? 0.62 : cfg.wide,
      });
    }
    return arr;
  }
  // on: 세기(0~1) / reach: 밖으로 나오는 정도(보드·셔터가 막을수록 0으로)
  // maxY: 이 높이 위로는 불이 보이지 않는다 — 셔터가 내려오면 불꽃이 아래로 눌려 사라진다
  function animFire(arr, t, on, reach, maxY) {
    const vis = on > 0.012;
    const rc = reach === undefined ? 1 : Math.max(0, reach);
    const lim = maxY === undefined ? Infinity : maxY;
    for (const p of arr) {
      p.sp.visible = vis;
      if (!vis) continue;
      const u = (t / p.life + p.ph) % 1;
      const k = Math.pow(u, 1.25);                            // 아래쪽에 불덩이가 남고 일부만 위로 솟는다
      const flick = 0.82 + Math.sin(t * (7 + p.wob * 6) + p.ph * 21) * 0.18;
      p.sp.position.set(
        p.x + Math.sin(t * 1.9 + p.ph * 13) * 0.3 * p.wob * k,
        p.y0 + k * p.rise,
        p.z0 + k * p.out * rc
      );
      p.sp.material.rotation = p.rot * (1 - k * 0.4) + Math.sin(t * 1.7 + p.ph * 9) * 0.07 * p.wob;
      const sc = p.size * (0.62 + k * 1.0) * flick;
      p.sp.scale.set(sc * p.wide * (1 - k * 0.38), sc * p.tall, 1); // 위로 갈수록 가늘어지는 혀
      // 아래는 밝고 두껍게, 위로 갈수록 사그라지며 사라진다
      const cut = lim === Infinity ? 1 : clampFire((lim - p.sp.position.y) / 1.4);
      p.sp.material.opacity = on * p.max * Math.sin(Math.PI * Math.min(1, u * 1.14)) * (1 - u * 0.4) * flick * cut;
    }
  }
  // 개구부 안쪽 배광 — 아래는 벌겋게 달아오르고 위로 갈수록 사그라진다(평평한 주황 판이 되지 않게)
  const glowTex = softDraw(128, (g, S) => {
    const grd = g.createLinearGradient(0, S, 0, 0);
    grd.addColorStop(0.00, "rgba(255,152,46,0.98)");
    grd.addColorStop(0.32, "rgba(255,92,16,0.66)");
    grd.addColorStop(0.72, "rgba(184,42,8,0.2)");
    grd.addColorStop(1.00, "rgba(116,22,4,0)");
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    // 가장자리 페이드 — 개구부 테두리에서 딱 끊기면 붙여넣은 판처럼 보인다
    const mask = g.createRadialGradient(S * 0.5, S * 0.7, S * 0.08, S * 0.5, S * 0.7, S * 0.64);
    mask.addColorStop(0.00, "rgba(0,0,0,1)");
    mask.addColorStop(0.62, "rgba(0,0,0,0.9)");
    mask.addColorStop(1.00, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = mask; g.fillRect(0, 0, S, S);
  }, 5);
  function openingGlow(o, inset) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2 * o.hw - inset, 2 * o.hh - inset),
      new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })
    );
    m.position.set(o.x, o.y, WALL_Z - 0.32); scene.add(m); return m;
  }

  // =====================================================================
  //  벽체 — 개구부 세 곳을 남기고 슬래브로 채운 뒤, 기둥·보·줄눈으로 건축을 만든다
  // =====================================================================
  (function buildWall() {
    const rects = OPENINGS.map((o) => ({ x0: o.x - o.hw, x1: o.x + o.hw, y0: o.y - o.hh, y1: o.y + o.hh }));
    const slab = (x0, x1, y0, y1) => {
      if (x1 - x0 > 0.001 && y1 - y0 > 0.001)
        box(x1 - x0, y1 - y0, WALL_T, matWall, (x0 + x1) / 2, (y0 + y1) / 2, WALL_Z, scene);
    };
    // 개구부들의 y 경계로 가로 띠를 나누고, 각 띠에서 그 높이에 걸린 개구부만 비운다
    const bands = [WY0, WY1];
    rects.forEach((r) => { bands.push(r.y0, r.y1); });
    bands.sort((a, b) => a - b);
    for (let i = 0; i < bands.length - 1; i++) {
      const y0 = bands[i], y1 = bands[i + 1];
      if (y1 - y0 < 0.001) continue;
      const mid = (y0 + y1) / 2;
      const gaps = rects.filter((r) => mid > r.y0 && mid < r.y1).map((r) => [r.x0, r.x1]).sort((a, b) => a[0] - b[0]);
      let x = WX0;
      for (const [g0, g1] of gaps) { slab(x, g0, y0, y1); x = Math.max(x, g1); }
      slab(x, WX1, y0, y1);
    }

    // 인방보(스팬드럴) — 벽 상부를 가로지르는 구조체. 벽이 색면이 아니라 건물로 읽히게 한다
    const BEAM_Y = 11.3, BEAM_H = 1.15;
    box(WX1 - WX0, BEAM_H, 0.9, matBeam, (WX0 + WX1) / 2, BEAM_Y, WALL_FRONT + 0.42, scene, true, true);
    box(WX1 - WX0, 0.14, 1.0, matReveal, (WX0 + WX1) / 2, BEAM_Y - BEAM_H / 2 - 0.07, WALL_FRONT + 0.44, scene, false, false);

    // 기둥(필라스터) — 바닥에서 인방보까지. 사람과 함께 공간의 스케일을 만든다
    const colTop = BEAM_Y - BEAM_H / 2;
    for (let cx = WX0 + 5; cx < WX1; cx += 8) {
      if (nearOpening(cx, 2.2)) continue;
      if (cx > BIG.x - BIG.hw - 3.2 && cx < BIG.x + BIG.hw + 3.2) continue; // 셔터 소핏 자리
      box(1.7, colTop - WY0, 0.95, matCol, cx, (WY0 + colTop) / 2, WALL_FRONT + 0.48, scene, true, true);
      box(2.0, 0.28, 1.08, matBeam, cx, colTop - 0.14, WALL_FRONT + 0.5, scene, true, true);   // 주두
      box(2.0, 0.3, 1.1, matBeam, cx, WY0 + 0.15, WALL_FRONT + 0.5, scene, true, true);        // 주각
    }

    // 콘크리트 패널 줄눈 — 세로 리빌 + 허리 라인. 스케일감을 준다
    for (let jx = WX0 + 4; jx < WX1; jx += 4) {
      if (nearOpening(jx, 1.2)) continue;
      if (jx > BIG.x - BIG.hw - 2.2 && jx < BIG.x + BIG.hw + 2.2) continue; // 셔터 소핏 자리
      box(0.13, colTop - WY0, 0.05, matReveal, jx, (WY0 + colTop) / 2, WALL_FRONT + 0.03, scene, false, false);
    }
    box(WX1 - WX0, 0.26, 0.12, matCol, (WX0 + WX1) / 2, 6.6, WALL_FRONT + 0.07, scene, false, false);
    // 걸레받이
    box(WX1 - WX0, 0.34, 0.1, matWallSide, (WX0 + WX1) / 2, WY0 + 0.17, WALL_FRONT + 0.06, scene, false, true);

    // ---- 실내 바닥 ----
    box(WX1 - WX0, 0.5, 52, matFloor, (WX0 + WX1) / 2, WY0 - 0.25, WALL_Z + 24, scene, false, true);
    for (let fx = WX0 + 6; fx < WX1; fx += 6) box(0.07, 0.03, 48, matFJoint, fx, WY0 + 0.012, WALL_Z + 22, scene, false, false);
    for (let fz = 4; fz < 46; fz += 6)        box(WX1 - WX0, 0.03, 0.07, matFJoint, (WX0 + WX1) / 2, WY0 + 0.012, WALL_Z + fz, scene, false, false);

    // ---- 천장 슬래브 + 보 ---- (큰 검은 판은 멀리서 화면을 눌러버린다 → 콘크리트 톤으로)
    box(WX1 - WX0, 0.8, 8.0, matCeil, (WX0 + WX1) / 2, 12.6, WALL_Z + 4.2, scene, false, false);
    for (let bx = WX0 + 4; bx < WX1; bx += 8) box(0.75, 0.85, 8.0, matCeilBeam, bx, 11.85, WALL_Z + 4.2, scene, false, false);

    // 측벽
    box(0.5, WY1 - WY0, 52, matWallSide, WX0 + 0.25, (WY0 + WY1) / 2, WALL_Z + 24, scene, false, true);

    // ---- 화재측(벽 뒤) — 어두운 방. 개구부 너머로 밝은 배경이 새면 흰 후광이 생긴다 ----
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
  })();

  // ---- 관통 사각덕트 + 플랜지 ----
  (function buildDuct() {
    const cz = WALL_Z + 1.4, len = 8.4;
    box(DUCT_W, DUCT_H, len, matDuct, DUCT.x, DUCT.y, cz, scene, true, true);
    [-1.6, 1.2].forEach((dz) => {
      box(DUCT_W + 0.2, DUCT_H + 0.2, 0.14, matBand, DUCT.x, DUCT.y, cz + dz, scene, true, true);
    });
    // 덕트 상단 접합 리브 — 판금 덕트처럼 보이게
    box(DUCT_W + 0.04, 0.05, len * 0.9, matBand, DUCT.x, DUCT.y + DUCT_H / 2, cz, scene, false, false);
  })();

  // =====================================================================
  //  내화보드 — 배관·덕트 모두 상·하 두 장이 관통재를 감싸며 밀착한다
  // =====================================================================
  const BD = 0.16;
  function extrudeBoard(shape) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: BD, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045, bevelSegments: 2, steps: 1, curveSegments: 48 });
    geo.translate(0, 0, -BD / 2);
    const m = new THREE.Mesh(geo, matBoard.clone()); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }
  // 배관용 — 반원 노치
  const HALF = 1.66;
  function pipeBoard(top) {
    const s = new THREE.Shape();
    if (top) {
      s.moveTo(-HALF, 0); s.lineTo(-RH, 0);
      s.absarc(0, 0, RH, Math.PI, 0, true);
      s.lineTo(HALF, 0); s.lineTo(HALF, HALF); s.lineTo(-HALF, HALF);
    } else {
      s.moveTo(-HALF, 0); s.lineTo(-HALF, -HALF); s.lineTo(HALF, -HALF); s.lineTo(HALF, 0); s.lineTo(RH, 0);
      s.absarc(0, 0, RH, 0, Math.PI, true);
    }
    return extrudeBoard(s);
  }
  // 덕트용 — 사각 노치
  const DHW = 2.35, DHH = 1.72;
  function ductBoard(top) {
    const s = new THREE.Shape();
    if (top) {
      s.moveTo(-DHW, 0); s.lineTo(-NW, 0); s.lineTo(-NW, NH); s.lineTo(NW, NH); s.lineTo(NW, 0);
      s.lineTo(DHW, 0); s.lineTo(DHW, DHH); s.lineTo(-DHW, DHH);
    } else {
      s.moveTo(-DHW, 0); s.lineTo(-DHW, -DHH); s.lineTo(DHW, -DHH); s.lineTo(DHW, 0);
      s.lineTo(NW, 0); s.lineTo(NW, -NH); s.lineTo(-NW, -NH); s.lineTo(-NW, 0);
    }
    return extrudeBoard(s);
  }
  const boardTop = pipeBoard(true), boardBot = pipeBoard(false);
  const dboardTop = ductBoard(true), dboardBot = ductBoard(false);
  const SEATZ = WALL_FRONT + 0.1;

  // =====================================================================
  //  스크린셔터 — 실제 구동 영상(docs/사진/셔터 영상.mp4) 기준.
  //   · 원단은 **크림색 유리섬유 직물**, 가로 이음매가 1m 간격
  //   · 중앙 기둥 없이 **한 장이 개구부 전폭을 한 번에** 내려온다
  //   · 하부 마감바는 **가운데가 처지는 완만한 곡선**(카테너리) — 이게 제일 큰 특징
  //   · 서더박스는 노출 강판 박스가 아니라 상부 소핏(내림벽) 안에 숨고 슬롯만 보인다
  //   · 뒤가 화재실이라 원단이 은은하게 배광된다
  // =====================================================================
  const SHUT_SAG = 0.52, BAR_SEGS = 30;
  const SHZ = WALL_FRONT + 0.55;
  let shPanel = null, shTopY, shH;
  (function buildShutter() {
    const b0 = BIG.x - BIG.hw, b1 = BIG.x + BIG.hw, bt = BIG.y + BIG.hh, bb = BIG.y - BIG.hh;
    const trim = new THREE.MeshStandardMaterial({ color: 0x53585f, roughness: 0.4, metalness: 0.8, envMapIntensity: 1.0 });

    // 상부 소핏(내림벽) — 영상처럼 원단이 벽 속 슬롯에서 나온다
    box(2 * BIG.hw + 3.0, 1.7, 0.62, matWall, BIG.x, bt + 0.95, WALL_FRONT + 0.31, scene, true, true);
    box(2 * BIG.hw + 3.0, 0.12, 0.66, trim, BIG.x, bt + 0.12, WALL_FRONT + 0.33, scene);        // 슬롯 하단 마감
    box(2 * BIG.hw + 2.6, 0.1, 0.16, matDark, BIG.x, bt + 0.13, WALL_FRONT + 0.55, scene);     // 인출 슬롯(어두운 틈)

    // 가이드레일 — 영상에선 벽에 붙은 얇은 트랙 수준(두꺼운 기둥처럼 보이면 안 된다)
    [b0 - 0.09, b1 + 0.09].forEach((x) => box(0.18, bt - bb + 0.3, 0.2, trim, x, (bt + bb) / 2, SHZ, scene, true, true));

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

    shTopY = bt + 0.1; shH = shTopY - WY0 - SHUT_SAG; // 처진 가운데가 정확히 바닥에 닿는 높이
    const pw = 2 * BIG.hw - 0.14;   // 개구부 전폭을 덮는 한 장

    const mat = new THREE.MeshStandardMaterial({
      map: stex, bumpMap: stex, bumpScale: 0.05,
      color: 0xd6cdb8, roughness: 0.97, metalness: 0.0, envMapIntensity: 0.35,
      emissive: 0xff7a2a, emissiveIntensity: 0.0, // 뒤 화재실 배광 — 애니에서 조절
      side: THREE.DoubleSide,
    });
    mat.map.repeat.set(3.4, 1); // 폭이 넓어졌으니 결 밀도를 맞춘다

    // 아래로 갈수록 가운데가 처지는 카테너리 — 상단은 팽팽, 하단이 최대 SHUT_SAG
    const geo = new THREE.PlaneGeometry(pw, shH, 36, 44);
    geo.translate(0, -shH / 2, 0); // 상단이 y=0
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vy = pos.getY(i);
      const k = Math.min(1, -vy / shH);                       // 0(상단) → 1(하단)
      const u = Math.min(1, Math.abs(vx) / (pw / 2));         // 0(가운데) → 1(가장자리)
      pos.setY(i, vy - SHUT_SAG * k * (1 - u * u));
      pos.setZ(i, pos.getZ(i) - 0.07 * k * (1 - u * u));      // 처지면서 살짝 앞으로 배부름
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.set(BIG.x, shTopY, SHZ); mesh.scale.y = 0.0001; scene.add(mesh);

    // 하부 마감바 — 처짐 곡선을 따라가도록 여러 토막으로 나눠 배치
    const barGroup = new THREE.Group(); scene.add(barGroup);
    const segW = pw / BAR_SEGS + 0.02, segs = [];
    for (let i = 0; i < BAR_SEGS; i++) {
      const t = (i + 0.5) / BAR_SEGS, sx = BIG.x - pw / 2 + t * pw;
      const u = Math.min(1, Math.abs(sx - BIG.x) / (pw / 2));
      const seg = box(segW, 0.26, 0.3, trim, sx, shTopY, SHZ, barGroup, true, true);
      segs.push({ mesh: seg, sag: SHUT_SAG * (1 - u * u), dz: -0.07 * (1 - u * u) });
    }
    barGroup.visible = false;
    shPanel = { mesh, mat, barGroup, segs };
  })();

  // =====================================================================
  //  화염·연기 — 개구부 세 곳 모두 불이 밖으로 삐져나온다
  // =====================================================================
  const FZ = WALL_FRONT + 0.05; // 불이 시작되는 면(개구부 앞면)
  // 개구부 하나당 한 세트: 화염 본체 + 고온 코어 + 불티 + 연기 + 안쪽 배광 + 광원
  function makeFireRig(o, s, inset, lightPow, tune) {
    const q = tune || {};
    const w = 2 * o.hw * 0.86, yb = o.y - o.hh * 0.88, out = 1.0 + 0.35 * s;
    // 발생 높이 띠 — 넓은 개구부에서도 불은 바닥에서 난다.
    // 개구부가 커질수록 혀 개수·크기를 함께 키워야 흩어진 알맹이가 아니라 하나의 불덩이로 읽힌다
    const hb = q.hb || Math.min(o.hh * 0.4, 1.5);
    const n = q.n || Math.round(22 * s), sz = q.size || 0.66 * s, rise = q.rise || 3.1 * s;
    const rig = {
      body:  makeFire({ n: n,                  x: o.x, y: yb,               z: FZ,        w: w,        h: hb, dz: 0.4, out: out, rise: rise, size: sz, life: 1.3, max: 0.95 }, flameBodyTex, false),
      core:  makeFire({ n: Math.round(n * 0.45), x: o.x, y: yb,             z: FZ + 0.14, w: w * 0.78, h: hb * 0.7, dz: 0.3, out: out * 0.72, rise: rise * 0.66, size: sz * 0.66, life: 1.15, max: 0.6 }, flameCoreTex, true),
      ember: makeFire({ n: Math.round(6 * s),  x: o.x, y: o.y,              z: FZ + 0.22, w: w * 0.9,  h: o.hh,       dz: 0.4, out: out * 0.8, rise: 5.2 * s, size: 0.2 * s,  life: 1.9,  max: 0.8, tall: 1.0, wide: 1.0 }, emberTex, true),
      smoke: makeFire({ n: Math.round(6 * s),  x: o.x, y: o.y + o.hh * 0.5, z: FZ + 0.3,  w: w,        h: o.hh * 0.8, dz: 0.5, out: out * 0.95,  rise: 6.2 * s, size: 1.15 * s, life: 4.2,  max: 0.32, tall: 1.05, wide: 1.0 }, smokeTex, false),
      glow:  openingGlow(o, inset),
      light: new THREE.PointLight(0xff6a1e, 0, 9 + 9 * s, 2),
      seed:  o.x * 0.37,
    };
    rig.light.position.set(o.x, o.y - o.hh * 0.4, WALL_FRONT + 0.3);
    scene.add(rig.light);
    rig.update = function (t, on, reach, maxY) {
      animFire(rig.body, t, on, reach, maxY);
      animFire(rig.core, t, on, reach, maxY);
      animFire(rig.ember, t, on, reach, maxY);
      animFire(rig.smoke, t, on * 0.92 + 0.05, reach, maxY);
      const fl = Math.abs(Math.sin(t * 2.6 + rig.seed)) * 0.55 + Math.abs(Math.sin(t * 7.1 + rig.seed)) * 0.2;
      rig.glow.material.opacity = on * (0.34 + fl * 0.26);
      // 막히면 벽면으로 새어나오던 불빛도 함께 사라진다(셔터 원단 앞면이 달아오르지 않게)
      const spill = Math.pow(reach === undefined ? 1 : Math.max(0, reach), 1.5);
      rig.light.intensity = lightPow * on * spill * (0.72 + fl * 0.5);
    };
    return rig;
  }
  const rigPen = makeFireRig(PEN, 1.0, 0.25, 34);
  const rigDkt = makeFireRig(DUCT, 1.1, 0.25, 36);
  // 대형 개구부(9m×10m)는 기본 배율로는 불꽃이 듬성듬성 떠 보인다 → 굵고 촘촘하게, 낮게
  const rigBig = makeFireRig(BIG, 2.4, 0.0, 62, { n: 48, size: 1.75, rise: 4.4, hb: 1.9 });

  // ---- 조명 ----
  scene.add(new THREE.HemisphereLight(0xeef1f6, 0x74747a, 0.62));
  const key = new THREE.DirectionalLight(0xfff3e6, 1.3); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 1; key.shadow.camera.far = 70;
  key.shadow.camera.left = -16; key.shadow.camera.right = 16; key.shadow.camera.top = 13; key.shadow.camera.bottom = -11; key.shadow.bias = -0.0012;
  scene.add(key); scene.add(key.target); // 그림자 카메라가 시선을 따라다니게(넓은 씬에서 해상도 확보)
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.3); fill.position.set(-6, 4, 6); scene.add(fill);
  // 카메라 쪽 스펙큘러 — 은빛 배관·덕트 위로 길게 흐르는 하이라이트를 만든다
  const spec = new THREE.DirectionalLight(0xffffff, 1.0); spec.position.set(7, 6, 14); scene.add(spec);
  // =====================================================================
  //  사람 — 앞쪽을 오가는 사람들. 벽이 '건물'로 읽히게 하는 스케일 기준이 된다
  // =====================================================================
  const matHelmet = new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.42, metalness: 0.05 });
  const matSkin   = new THREE.MeshStandardMaterial({ color: 0xc59d84, roughness: 0.85 });
  const matShade  = new THREE.MeshBasicMaterial({ color: 0x3d4045, transparent: true, opacity: 0.2, depthWrite: false, fog: false });
  function buildPerson(clothC, vestC, helmet) {
    const g = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: clothC, roughness: 0.88 });
    const vest = new THREE.MeshStandardMaterial({ color: vestC, roughness: 0.7, emissive: vestC, emissiveIntensity: 0.1 });
    const limb = (parent, x, y, len, w, mat) => {
      const piv = new THREE.Group(); piv.position.set(x, y, 0); parent.add(piv);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w * 1.15), mat);
      m.position.y = -len / 2; m.castShadow = true; piv.add(m); return piv;
    };
    const legL = limb(g, -0.11, 0.9, 0.9, 0.17, cloth);
    const legR = limb(g,  0.11, 0.9, 0.9, 0.17, cloth);
    const armL = limb(g, -0.29, 1.44, 0.66, 0.13, cloth);
    const armR = limb(g,  0.29, 1.44, 0.66, 0.13, cloth);
    box(0.46, 0.66, 0.26, cloth, 0, 1.2, 0, g, true, false);        // 몸통
    box(0.5, 0.46, 0.31, vest, 0, 1.2, 0, g, true, false);          // 안전조끼
    box(0.15, 0.13, 0.15, matSkin, 0, 1.6, 0, g, true, false);      // 목
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), matSkin);
    head.position.y = 1.72; head.castShadow = true; g.add(head);
    if (helmet) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), matHelmet);
      h.position.y = 1.75; h.castShadow = true; g.add(h);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.03, 18), matHelmet);
      brim.position.y = 1.745; g.add(brim);
    }
    // 접지 그림자 — 그림자맵 범위 밖에서도 바닥에 붙어 보이게
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20), matShade);
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
    scene.add(g);
    return { g, legL, legR, armL, armR };
  }
  // x0→x1 왕복. 주역(오른쪽 개구부)을 가리지 않도록 z·구간을 배치했다
  const PEOPLE = [
    { x0: -32, x1: -19, z: 4.5,  sp: 0.055, ph: 0.10, cloth: 0x39404a, vest: 0xd6d94a, hat: 1 },
    { x0: -6,  x1:  8,  z: 9.0,  sp: 0.042, ph: 0.55, cloth: 0x2f3540, vest: 0xcfd644, hat: 1 },
    { x0:  16, x1:  30, z: 3.0,  sp: 0.05,  ph: 0.80, cloth: 0x434a54, vest: 0xe08a3c, hat: 1 },
    { x0: -24, x1: -12, z: 12.0, sp: 0.035, ph: 0.30, cloth: 0x2b303a, vest: 0x8f97a4, hat: 0 },
    { x0:  19, x1:  32, z: 10.5, sp: 0.046, ph: 0.65, cloth: 0x3a4048, vest: 0xd6d94a, hat: 1 },
    { x0: -40, x1: -28, z: 7.0,  sp: 0.04,  ph: 0.92, cloth: 0x353b45, vest: 0xcfd644, hat: 1 },
  ].map((c) => Object.assign({ o: buildPerson(c.cloth, c.vest, c.hat) }, c));

  function animPeople(t) {
    for (const p of PEOPLE) {
      const u = (t * p.sp + p.ph) % 1;
      const tri = u < 0.5 ? u * 2 : 2 - u * 2;              // 왕복
      const dir = u < 0.5 ? 1 : -1;
      const g = p.o.g;
      g.position.set(p.x0 + (p.x1 - p.x0) * tri, WY0, p.z);
      g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      const gait = t * 4.6 + p.ph * 12;
      const sw = Math.sin(gait) * 0.5;
      p.o.legL.rotation.x = sw; p.o.legR.rotation.x = -sw;
      p.o.armL.rotation.x = -sw * 0.7; p.o.armR.rotation.x = sw * 0.7;
      g.position.y = WY0 + Math.abs(Math.cos(gait)) * 0.045;  // 걸음 반동
    }
  }

  // ---- 리사이즈 ----
  let fovK = 1, lookK = 0;
  function resize() {
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const a = w / h;
    fovK = a < 0.8 ? 1.58 : a < 1.2 ? 1.32 : a < 1.6 ? 1.12 : 1; // 세로 화면일수록 화각을 넓힌다
    // 가로 화면은 왼쪽이 헤드라인 자리라 주역을 오른쪽으로 밀지만,
    // 세로 화면은 헤드라인이 아래로 내려가므로 주역을 화면 가운데로 되돌린다
    lookK = a < 0.8 ? 1 : a < 1.2 ? 0.62 : a < 1.6 ? 0.22 : 0;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true }); resize();

  // =====================================================================
  //  카메라 — 키프레임 사이를 부드럽게 이동하는 1테이크
  // =====================================================================
  // 주역(개구부)은 늘 화면 오른쪽 — 왼쪽은 헤드라인 자리다. 그래서 시선 지점을 주역보다 왼쪽에 둔다
  // f = 화각. 확립샷은 넓게(개구부가 다 들어오게), 클로즈업은 좁게 — 줌 자체가 연출이 된다
  const PENC = (PEN.x + DUCT.x) / 2; // 배관+덕트를 한 프레임에 담는 중심
  const KEYS = [
    { t: 0.0,  p: [17, 7.0, 32],     l: [-11, 4.2, WALL_Z], f: 56, sx: -2.5 },                    // 확립샷 — 벽 전체, 세 곳에서 불
    { t: 5.8,  p: [16, 6.3, 27],     l: [-7, 4.0, WALL_Z], f: 51, sx: -1.0 },                     // 천천히 다가가기 시작
    { t: 9.8,  p: [13.6, 4.0, 17.4], l: [PENC - 4.6, PEN.y + 0.5, WALL_Z], f: 40, sx: PENC },     // 관통부 클로즈업 도착
    { t: 16.2, p: [13.2, 3.9, 16.8], l: [PENC - 4.6, PEN.y + 0.5, WALL_Z], f: 40, sx: PENC },     // 시공·진화 지켜보기
    { t: 20.8, p: [-7.6, 4.5, 21.5], l: [BIG.x - 4.0, BIG.y + 1.0, WALL_Z], f: 46, sx: BIG.x },    // 벽을 따라 대형 개구부로
    { t: 26.8, p: [-8.4, 4.2, 22.1], l: [BIG.x - 4.0, BIG.y + 1.0, WALL_Z], f: 46, sx: BIG.x },    // 셔터 닫히는 것 보기
    { t: 30.0, p: [17, 7.0, 32],     l: [-11, 4.2, WALL_Z], f: 56, sx: -2.5 },                    // 다시 뒤로 빠지며 루프
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
    camLook.set(a.l[0] + (a.sx - a.l[0]) * lookK, a.l[1], a.l[2])
      .lerp(tmpB.set(b.l[0] + (b.sx - b.l[0]) * lookK, b.l[1], b.l[2]), k);
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
  let seatPen = 0, seatDkt = 0, coverBig = 0;
  // 보드의 로컬 원점은 관통재 중심선 — 밀착하면 그대로 개구부 중심에 앉는다
  function seatBoards(top, bot, o, e) {
    top.position.set(o.x, o.y + (1 - e) * 4.6, SEATZ);
    bot.position.set(o.x, o.y - (1 - e) * 4.6, SEATZ);
    top.rotation.z = (1 - e) * -0.1; bot.rotation.z = (1 - e) * 0.1;
  }
  function animBoards(cycle) {
    seatPen = cycle < BOARD_IN ? 0 : easeOut(clamp01((cycle - BOARD_IN) / BOARD_DUR));
    seatDkt = cycle < DKB_IN ? 0 : easeOut(clamp01((cycle - DKB_IN) / DKB_DUR));
    // 확립샷에서 보드가 공중에 떠 있으면 이상하다 — 시공 직전에만 등장
    const onP = cycle > BOARD_IN - 1.0, onD = cycle > DKB_IN - 1.0;
    boardTop.visible = boardBot.visible = onP;
    dboardTop.visible = dboardBot.visible = onD;
    if (onP) seatBoards(boardTop, boardBot, PEN, seatPen);
    if (onD) seatBoards(dboardTop, dboardBot, DUCT, seatDkt);
  }
  function animShutter(cycle, t) {
    // 실제 셔터는 등속에 가깝게 내려온다 — 마지막만 살짝 감속
    const raw = cycle < SHUT_IN ? 0 : clamp01((cycle - SHUT_IN) / SHUT_DUR);
    const c = raw < 0.85 ? raw : 0.85 + easeOut((raw - 0.85) / 0.15) * 0.15;
    coverBig = c;
    const p = shPanel;
    p.mesh.scale.y = Math.max(0.0001, c);
    // 스케일로 내리면 직물 무늬가 늘어난다 → UV를 상단 기준으로 잘라 원래 결을 유지
    p.mat.map.repeat.y = Math.max(0.0001, c);
    p.mat.map.offset.y = 1 - Math.max(0.0001, c);
    p.mat.emissiveIntensity = (0.05 + 0.1 * Math.abs(Math.sin(t * 2.4))) * c; // 뒤 화재실 배광
    const bottom = shTopY - c * shH;
    for (const s of p.segs) { s.mesh.position.y = bottom - s.sag * c; s.mesh.position.z = SHZ + s.dz * c; }
    p.barGroup.visible = c > 0.015;
  }

  // ---- 재생 제어 ----
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = null, running = false, t0 = null;

  function step(t) {
    const cycle = ((t % LOOP) + LOOP) % LOOP;
    animBoards(cycle); animShutter(cycle, t); animPeople(t);
    placeCamera(cycle, t);

    // 불은 보드가 다 밀착된 **뒤에** 꺼진다 — 진화 순서가 눈에 보이게.
    // reach = 개구부 밖으로 삐져나오는 정도. 보드가 밀착할수록 불이 안으로 밀려 들어간다
    rigPen.update(t, 1 - clamp01((cycle - PEN_OUT) / PEN_OUT_D), 1 - seatPen * 0.92);
    rigDkt.update(t, 1 - clamp01((cycle - (PEN_OUT + 0.35)) / PEN_OUT_D), 1 - seatDkt * 0.92);
    // 셔터는 다 닫힌 **뒤에** 꺼진다. 닫히는 동안은 불꽃이 셔터 하단 아래로 눌려 사라질 뿐이다
    rigBig.update(
      t,
      (1 - clamp01((cycle - BIG_OUT) / BIG_OUT_D)) * (1 - coverBig * 0.35),
      1 - coverBig * 0.9,
      coverBig > 0.008 ? shTopY - coverBig * shH : undefined
    );
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
