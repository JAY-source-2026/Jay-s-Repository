import { SYSTEMS } from './systems.js?v=20261103r1';
import { buildSiteContext } from './site-context.js?v=20261103r1';
import { FACTORY, buildFactory } from './factory.js?v=20261103r1';
// Product-scale fire protection demonstrator. No people or full-screen film.
// All dimensions and timing are illustrative; this is not a fire-rating simulation.
export async function initHero3D(canvas, host, { onUpdate = () => {} } = {}) {
  const T = await import('./vendor/three.module.min.js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene();
  // Selected direction: B's deep navy studio with C's architectural gallery view.
  scene.background = new T.Color('#101c2a');
  scene.fog = new T.Fog('#101c2a', 80, 180);
  const camera = new T.PerspectiveCamera(34, 1, .1, 200);
  const target = new T.Vector3(0, 1.2, 0);
  const clock = { selected: null, mode: 'overview', elapsed: 0, duration: 18, phase: -1, running: false };
  let previewReturn = null;
  let raf = 0, last = null, visible = true, disposed = false;
  let transition = 1, transitionSeconds = 2.4, fromPosition = new T.Vector3(), fromTarget = new T.Vector3();
  let toPosition = new T.Vector3(), toTarget = new T.Vector3();
  const ids = ['metal', 'polymer', 'duct', 'shutter', 'firewall'];
  const models = {};
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const ramp = (t, start, end) => smooth((t - start) / (end - start));
  const mat = (color, roughness = .5, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });

  // Large studio softboxes in an environment map give metal a continuous reflection.
  const envScene = new T.Scene();
  envScene.background = new T.Color('#233039');
  const softbox = (w, h, pos, power) => {
    const p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color().setScalar(power), side: T.DoubleSide }));
    p.position.set(...pos); p.lookAt(0, 0, 0); envScene.add(p);
  };
  softbox(8, 14, [-8, 5, 5], 4);
  softbox(3, 12, [9, 2, 0], 2.5);
  softbox(16, 3, [0, 9, -5], 3);
  const pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, .025);
  scene.environment = env.texture;
  scene.environmentIntensity = .65;
  envScene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  pmrem.dispose();

  // Small-scale surface grain stays subtle at architectural scale.
  function surface(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = kind === 'fabric' ? '#e0dbcc' : '#d4d3ce'; g.fillRect(0, 0, 256, 256);
    let seed = 19;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 19000; i++) {
      const v = Math.floor(110 + random() * 120);
      g.fillStyle = `rgba(${v},${v},${v},${kind === 'fabric' ? .15 : .08})`;
      g.fillRect(random() * 256, random() * 256, 1, 1);
    }
    if (kind === 'fabric') {
      g.strokeStyle = 'rgba(70,60,44,.12)'; g.lineWidth = .6;
      for (let j = 0; j < 256; j += 3) { g.beginPath(); g.moveTo(j, 0); g.lineTo(j, 256); g.moveTo(0, j); g.lineTo(256, j); g.stroke(); }
    }
    if (kind === 'tile') {
      g.strokeStyle = 'rgba(75,76,72,.3)'; g.lineWidth = 1;
      g.strokeRect(.5, .5, 255, 255);
    }
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const concreteTex = surface('concrete'), fabricTex = surface('fabric'), tileTex = surface('tile');
  tileTex.repeat.set(10, 7);
  const concrete = new T.MeshStandardMaterial({ color: '#d4d0c7', map: concreteTex, bumpMap: concreteTex, bumpScale: .004, roughness: .88 });
  const cladding = new T.MeshStandardMaterial({ color: '#dedbd3', map: concreteTex, bumpMap: concreteTex, bumpScale: .002, roughness: .76 });
  const floorFinish = new T.MeshStandardMaterial({ color: '#d2cec4', map: tileTex, bumpMap: tileTex, bumpScale: .0015, roughness: .62 });
  const frameMetal = mat('#414b50', .32, .75), joint = mat('#465057', .9);
  const ceiling = mat('#deddd6', .88);
  const steel = mat('#d6e0e4', .23, .95);
  const zinc = mat('#9cabb2', .38, .8);
  const edgeMetal = mat('#65767d', .28, .88);
  const mineral = mat('#e9edef', .64);
  const pvc = mat('#eeeeea', .5, 0);
  const screwMat = mat('#d4dcd9', .2, .92);

  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const boxCache = new Map();
  function box(w, h, d, material, parent, x = 0, y = 0, z = 0) {
    const key = `${w}:${h}:${d}`;
    let geometry = boxCache.get(key);
    if (!geometry) {
      if (Math.min(w, h, d) > .12) {
        const b = .012;
        const s = new T.Shape(); s.moveTo(-w / 2 + b, -h / 2 + b); s.lineTo(w / 2 - b, -h / 2 + b); s.lineTo(w / 2 - b, h / 2 - b); s.lineTo(-w / 2 + b, h / 2 - b); s.closePath();
        geometry = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, steps: 1 });
        geometry.translate(0, 0, -d / 2 + b);
      } else geometry = new T.BoxGeometry(w, h, d);
      boxCache.set(key, geometry);
    }
    const item = mesh(geometry, material, parent, x, y, z);
    if (Math.min(w, h, d) < .012) item.castShadow = false;
    return item;
  }
  function ring(outer, inner, depth, material, parent, x, y, z) {
    const shape = new T.Shape(); shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new T.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 });
    return mesh(geometry, material, parent, x, y, z);
  }
  function tube(radius, inner, length, material, parent, x, y, z) { return ring(radius, inner, length, material, parent, x, y, z); }
  const boltGeometries = new Map();
  function bolt(parent, x, y, z, r = .035) {
    if (!boltGeometries.has(r)) boltGeometries.set(r, new T.CylinderGeometry(r, r, .035, 6));
    const b = mesh(boltGeometries.get(r), screwMat, parent, x, y, z);
    b.castShadow = r >= .02;
    b.rotation.x = Math.PI / 2; return b;
  }
  // A softly layered procedural flame, visible on the exposed side of the sample.
  const fireVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const fireFragment = `
    precision highp float; varying vec2 vUv; uniform float uTime; uniform float uStrength;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    float fbm(vec2 p){return noise(p)*.57+noise(p*2.13)*.28+noise(p*4.27)*.15;}
    void main(){
      vec2 p=vUv; float flow=uTime*1.25;
      float warp=fbm(vec2(p.x*6.,p.y*4.-flow))-.5;
      float tongues=fbm(vec2(p.x*9.+warp*2.,p.y*4.-flow*1.7));
      float core=(1.-p.y)*.9+tongues*.65;
      float edge=smoothstep(0.,.12,p.x)*(1.-smoothstep(.85,1.,p.x));
      float body=smoothstep(.58,.78,core)*edge*(1.-smoothstep(.82,1.,p.y));
      vec3 col=mix(vec3(.75,.12,.025),vec3(1.,.56,.12),clamp(core-.5,0.,1.)*2.);
      col=mix(col,vec3(1.,.88,.52),smoothstep(1.04,1.4,core));
      gl_FragColor=vec4(col,body*uStrength*.85);
    }`;
  function fire(parent, width, height, y, z) {
    const material = new T.ShaderMaterial({
      vertexShader: fireVertex, fragmentShader: fireFragment,
      uniforms: { uTime: { value: 0 }, uStrength: { value: 0 } },
      transparent: true, depthWrite: false, side: T.DoubleSide,
      blending: T.AdditiveBlending,
    });
    const m = mesh(new T.PlaneGeometry(width, height), material, parent, 0, y, z);
    m.castShadow = false; m.receiveShadow = false; m.visible = false;
    return m;
  }
  // Building is an architectural cutaway. Installation dimensions below are metres.
  // All three services connect the first and second floor; certified details are wall assemblies.
  const LEVEL = 3.3, WALL_Z = -.55, WALL_T = .15, CY = 1.65;
  const blue = mat('#435e77', .42, .3), white = mat('#a7b3bf', .72);
  const dark = mat('#344555', .38, .72), whiteSeal = mat('#f3f2ed', .85);
  const bandBlue = mat('#2d5682', .56, .1), bandCore = mat('#222529', .96);
  const glass = new T.MeshPhysicalMaterial({ color: '#9caeb4', metalness: .25, roughness: .09, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.3, transparent: true, opacity: .48, side: T.DoubleSide, depthWrite: false });
  const floors = [];
  const textures = [concreteTex, fabricTex, tileTex];
  // Unprinted foil retains the product's wrinkled aluminium surface without text.
  function foilSurface() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#c6ced4'; g.fillRect(0, 0, 512, 512);
    let seed = 31; const rand = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 950; i++) {
      const x = rand() * 512, y = rand() * 512;
      g.strokeStyle = `rgba(${i % 2 ? '255,255,255' : '65,75,84'},${.05 + rand() * .22})`;
      g.lineWidth = .3 + rand() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - .5) * 50, y + rand() * 13); g.stroke();
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; textures.push(t); return t;
  }
  const foilTex = foilSurface();
  const foil = new T.MeshStandardMaterial({ color: '#eef1f3', map: foilTex, bumpMap: foilTex, bumpScale: .0015, metalness: .55, roughness: .58 });
  const wool = mat('#eee9da', .99);
  function group(parent, x = 0, y = 0, z = 0) { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  function animated(model, object, start, end, offset = [0, 0, 0], mode = 'slide') {
    model.parts.push({ object, home: object.position.clone(), offset: new T.Vector3(...offset), start, end, mode, face: model.animationSide ?? 1 }); return object;
  }
  function sectionWall(parent, opening, width = 6.4) {
    const s = new T.Shape(); s.moveTo(-width / 2, .01); s.lineTo(width / 2, .01); s.lineTo(width / 2, 3.08); s.lineTo(-width / 2, 3.08); s.closePath();
    const h = new T.Path();
    if (opening.radius) h.absarc(0, CY, opening.radius, 0, 2 * Math.PI, true);
    else { const { w, h: height, y = CY } = opening; h.moveTo(-w / 2, y - height / 2); h.lineTo(-w / 2, y + height / 2); h.lineTo(w / 2, y + height / 2); h.lineTo(w / 2, y - height / 2); h.closePath(); }
    s.holes.push(h);
    return mesh(new T.ExtrudeGeometry(s, { depth: WALL_T, bevelEnabled: false, curveSegments: 48 }), concrete.clone(), parent, 0, 0, WALL_Z - WALL_T / 2);
  }
  // Thin factory-made half-boards: the semicircular notch is part of the supplied part.
  function halfBoard(parent, top, radius, z) {
    const s = new T.Shape();
    s.moveTo(-.35, 0); s.lineTo(-radius, 0); s.absarc(0, 0, radius, Math.PI, 0, true);
    s.lineTo(.35, 0); s.lineTo(.35, .35); s.lineTo(-.35, .35); s.closePath();
    const board = mesh(new T.ExtrudeGeometry(s, { depth: .00884, bevelEnabled: false, curveSegments: 64 }), mineral, parent, 0, CY, z);
    board.userData.component = 'metal-board';
    if (!top) board.rotation.z = Math.PI;
    return board;
  }
  function bead(parent, a, b, radius = .005) {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), mid = A.clone().add(B).multiplyScalar(.5);
    const m = mesh(new T.CylinderGeometry(radius, radius, A.distanceTo(B), 8), whiteSeal, parent, ...mid.toArray());
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.sub(A).normalize()); return m;
  }
  function metalSystem(m) {
    tube(.2032, .1953, 3.45, steel, m.service, 0, CY, -1.75);
    for (const sign of [1, -1]) {
      m.animationSide = sign;
      const face = sign * .075;
      const upper = halfBoard(m.service, true, .205, face + (sign < 0 ? -.009 : 0));
      const lower = halfBoard(m.service, false, .205, face + (sign < 0 ? -.009 : 0));
      upper.userData.half = 'upper'; lower.userData.half = 'lower';
      animated(m, upper, 1.8, 3, [0, .48, sign * .28]);
      animated(m, lower, 3.1, 4.3, [0, -.48, sign * .28]);
      const screwGroup = group(m.service);
      // Edge fixing pattern follows the drawing; tiny heads are enlarged for readability.
      for (const x of [-.33, -.11, .11, .33]) for (const dy of [-.33, .33]) bolt(screwGroup, x, CY + dy, face + sign * .012, .0045);
      for (const x of [-.33, .33]) for (const dy of [-.165, 0, .165]) bolt(screwGroup, x, CY + dy, face + sign * .012, .0045);
      animated(m, screwGroup, 4.4, 5.2);
      const caulk = group(m.service), z = face + sign * .013;
      for (const x of [-.35, .35]) bead(caulk, [x, CY - .35, z], [x, CY + .35, z]);
      for (const y of [CY - .35, CY + .35]) bead(caulk, [-.35, y, z], [.35, y, z]);
      bead(caulk, [-.35, CY, z], [-.205, CY, z], .0075); bead(caulk, [.205, CY, z], [.35, CY, z], .0075);
      ring(.211, .2032, .009, whiteSeal, caulk, 0, CY, z);
      animated(m, caulk, 5.2, 6.6);
      for (let layer = 0; layer < 2; layer++) for (let segment = 0; segment < 2; segment++) {
        const len = segment ? .3 : .7, inner = .2032 + layer * .025;
        const start = .085 + (segment ? .7 : 0), frontZ = sign > 0 ? start : -start - len;
        const wrap = group(m.service, 0, CY, frontZ);
        ring(inner + .025, inner, len, foil, wrap, 0, 0, 0);
        ring(inner + .0245, inner + .0005, .002, wool, wrap, 0, 0, sign > 0 ? len : -.002);
        const begin = 6.8 + layer * 2.6 + segment * 1.15;
        animated(m, wrap, begin, begin + 1, [0, .1, sign * .08]);
      }
      const finish = group(m.service);
      for (const dz of [.1, .37, .72, 1.04]) {
        const tor = mesh(new T.TorusGeometry(.2545, .0016, 6, 64), edgeMetal, finish, 0, CY, sign * dz);
        tor.rotation.z = .08;
      }
      for (const dz of [.085, .785, 1.055]) ring(.255, .2532, .03, steel, finish, 0, CY, sign * dz - (sign < 0 ? .03 : 0));
      animated(m, finish, 12, 13.8);
    }
  }
  function polymerSystem(m) {
    tube(.1335, .124, .85, pvc, m.service, 0, CY, -.925);
    m.softPipe = tube(.1335, .124, .85, pvc, m.service, 0, CY, .075);
    m.expansions = [];
    for (const sign of [1, -1]) {
      m.animationSide = sign;
      const jacket = group(m.service, 0, CY, sign > 0 ? .075 : -.207);
      jacket.userData.component = 'polymer-jacket';
      // SFBA-200 250A has a deep galvanized jacket and black intumescent lining.
      ring(.158, .1335, .13, bandCore, jacket, 0, 0, .001);
      for (let n = 0; n < 24; n++) {
        const a = n * Math.PI / 12;
        const plate = box(.042, .0014, .132, zinc, jacket, Math.cos(a) * .159, Math.sin(a) * .159, .066);
        plate.rotation.z = a - Math.PI / 2;
        const notch = box(.009, .0018, .025, dark, jacket, Math.cos(a) * .16, Math.sin(a) * .16, .015);
        notch.rotation.z = a - Math.PI / 2;
        // Folded fingers cover the rim of the deep jacket, visible in the actual photo.
        for (const z of [.002, .131]) {
          const lip = box(.036, .022, .0014, zinc, jacket, Math.cos(a) * .148, Math.sin(a) * .148, z);
          lip.rotation.z = a - Math.PI / 2;
        }
      }
      animated(m, jacket, 2, 5.1, [sign * .24, .12, sign * .18]);
      const clasp = group(jacket);
      box(.026, .014, .025, steel, clasp, .17, 0, .055);
      box(.009, .025, .008, dark, clasp, .18, 0, .057);
      animated(m, clasp, 5, 6.5, [.025, 0, 0]);
      const brackets = group(m.service, 0, CY, 0);
      for (let n = 0; n < 12; n++) {
        const a = n * Math.PI / 6, r = .185;
        const b = group(brackets, Math.cos(a) * r, Math.sin(a) * r, sign * .083); b.rotation.z = a - Math.PI / 2;
        b.userData.component = 'polymer-bracket';
        box(.0298, .06, .002, zinc, b, 0, 0, 0);
        box(.0298, .002, .0295, zinc, b, 0, -.029, sign * .014);
        bolt(b, 0, .017, sign * .004, .004);
      }
      animated(m, brackets, 7, 9.6, [0, 0, sign * .1]);
      const expansion = mesh(new T.RingGeometry(.1335, .1575, 64), bandCore, jacket, 0, 0, sign > 0 ? .134 : -.002);
      if (sign < 0) expansion.rotation.y = Math.PI;
      expansion.userData.vertices = expansion.geometry.attributes.position.array.slice(); m.expansions.push(expansion);
    }
  }
  function ductShell(parent, w, h, depth, thickness, material, z = 0) {
    const g = group(parent, 0, CY, z);
    box(w + thickness * 2, thickness, depth, material, g, 0, h / 2 + thickness / 2, depth / 2);
    box(w + thickness * 2, thickness, depth, material, g, 0, -h / 2 - thickness / 2, depth / 2);
    for (const sign of [-1, 1]) box(thickness, h, depth, material, g, sign * (w / 2 + thickness / 2), 0, depth / 2);
    return g;
  }
  function ductSystem(m) {
    ductShell(m.service, 2.6, .65, 3.8, .001, zinc, -1.9);
    m.damperBlades = [];
    for (let i = 0; i < 3; i++) {
      const blade = box(2.56, .21, .006, steel, m.service, 0, CY + (i - 1) * .21, .22);
      blade.rotation.x = Math.PI / 2; m.damperBlades.push(blade);
    }
    const motor = box(.17, .2, .2, blue, m.service, 1.39, CY, .3);
    for (const z of [-1.65, .45, 1.65]) {
      for (const y of [CY - .35, CY + .35]) box(2.71, .045, .035, steel, m.service, 0, y, z);
      for (const x of [-1.33, 1.33]) { box(.04, .73, .035, steel, m.service, x, CY, z); for (const y of [CY - .34, CY + .34]) bolt(m.service, x, y, z + .023, .008); }
    }
    // Continuous 2,150 mm first layer passing through the wall.
    animated(m, ductShell(m.service, 2.602, .652, 2.15, .025, foil, -1.075), 2, 3.8, [0, .12, 0]);
    const bands = group(m.service);
    for (let layer = 0; layer < 2; layer++) {
      const d = layer * .012;
      ductShell(bands, 2.652 + 2 * d, .702 + 2 * d, .14, .012, bandBlue, -.07);
    }
    animated(m, bands, 4, 5.7);
    for (const sign of [-1, 1]) {
      m.animationSide = sign;
      for (const dy of [.45, -.45]) for (let i = 0; i < 3; i++) {
        const board = box(.9, .15, .00886, mineral, m.service, (i - 1) * .9, CY + dy, sign * .083);
        board.userData.component = 'duct-board';
        const start = (dy > 0 ? 6 : 6.8) + i * .12;
        animated(m, board, start, start + .6, [0, Math.sign(dy) * .4, sign * .2]);
      }
      for (const x of [-1.425, 1.425]) for (const dy of [-.2625, .2625]) {
        const board = box(.15, .525, .00886, mineral, m.service, x, CY + dy, sign * .083);
        board.userData.component = 'duct-board';
        animated(m, board, 7.35, 8, [Math.sign(x) * .3, Math.sign(dy) * .15, sign * .2]);
      }
      const boards = group(m.service);
      for (const x of [-1.45, -1.32, 1.32, 1.45]) for (const dy of [-.49, -.25, 0, .25, .49]) bolt(boards, x, CY + dy, sign * .092, .004);
      for (const dy of [-.49, -.41, .41, .49]) for (let i = 0; i < 21; i++) bolt(boards, -1.3 + i * .13, CY + dy, sign * .092, .0035);
      animated(m, boards, 8, 8.35);
      const caulk = group(m.service);
      for (const dy of [-.525, .525]) bead(caulk, [-1.5, CY + dy, sign * .092], [1.5, CY + dy, sign * .092]);
      for (const x of [-1.5, 1.5]) bead(caulk, [x, CY - .525, sign * .092], [x, CY + .525, sign * .092]);
      for (const x of [-.45, .45]) for (const dy of [-1, 1]) bead(caulk, [x, CY + dy * .375, sign * .095], [x, CY + dy * .525, sign * .095], .0075);
      animated(m, caulk, 8.35, 9);
      const a = sign > 0 ? .085 : -.485;
      animated(m, ductShell(m.service, 2.652, .702, .4, .05, foil, a), 9, 10.7, [0, .12, sign * .08]);
      // Outer 25 mm blanket follows the stepped profile of the 400 mm inner layer.
      const cover = group(m.service);
      ductShell(cover, 2.752, .802, .4, .025, foil, a);
      ductShell(cover, 2.652, .702, .6, .025, foil, sign > 0 ? .485 : -1.085);
      animated(m, cover, 11, 12.8, [0, .12, sign * .08]);
      const channels = group(m.service);
      for (const distance of [.135, .585, 1.035]) {
        const wide = distance < .485, y = wide ? .446 : .396, z = sign * distance;
        for (const v of [-1, 1]) box(2.9, .04, .04, zinc, channels, 0, CY + v * y, z);
        for (const x of [-1.43, 1.43]) {
          mesh(new T.CylinderGeometry(.006, .006, y * 2 + .12, 8), steel, channels, x, CY, z);
          for (const v of [-1, 1]) box(.021, .018, .021, steel, channels, x, CY + v * (y + .035), z);
        }
      }
      animated(m, channels, 13, 14.6, [0, .05, sign * .05]);
    }
    motor.userData.component = 'damper-actuator';
  }
  function shutterSystem(m) {
    const frame = group(m.service);
    // Two smooth cream screens with a central double stainless guide, as in the video.
    box(4.15, .34, .55, white, frame, 0, 2.8, -.03);
    for (const x of [-2.025, 0, 2.025]) {
      box(x === 0 ? .11 : .085, 2.65, .12, steel, frame, x, 1.325, .075);
      if (x === 0) box(.014, 2.65, .012, dark, frame, 0, 1.325, .141);
    }
    const screenMaterial = new T.MeshStandardMaterial({ color: '#e4dfd0', map: fabricTex, bumpMap: fabricTex, bumpScale: .0006, roughness: .95, side: T.DoubleSide });
    m.screens = [];
    for (const x of [-1.015, 1.015]) {
      const curtain = mesh(new T.PlaneGeometry(1.95, 2.6, 4, 4), screenMaterial, frame, x, 1.33, .09);
      const rail = box(1.97, .034, .04, steel, frame, x, .03, .105);
      curtain.userData.component = 'shutter-screen';
      m.screens.push({ curtain, rail });
    }
    const switchBox = box(.07, .13, .04, white, frame, 2.18, 1.35, .085);
    box(.026, .014, .007, blue, frame, 2.18, 1.36, .111);
    switchBox.userData.component = 'operation-switch';
  }
  function buildBay(id) {
    const bay = FACTORY.bays[id];
    const root = group(scene, bay.x, 0, 0), room = group(root), service = group(root, 0, 0, WALL_Z);
    const m = { id, root, room, service, parts: [], alpha: 1, fadeFrom: 1 };
    let opening;
    if (id === 'metal') opening = { w: .5, h: .5 };
    else if (id === 'polymer') opening = { radius: .1385 };
    else if (id === 'duct') opening = { w: 2.7, h: .75 };
    else opening = { w: 4.07, h: 2.65, y: 1.335 };
    m.wall = sectionWall(room, opening, bay.width);
    if (id === 'metal') metalSystem(m);
    if (id === 'polymer') polymerSystem(m);
    if (id === 'duct') ductSystem(m);
    if (id === 'shutter') shutterSystem(m);
    if (id !== 'shutter') {
      m.upperWall = sectionWall(group(room, 0, LEVEL, 0), opening, bay.width);
      // Completed second-floor assembly; only the first-floor front face animates.
      m.upper = service.clone(true); m.upper.position.y = LEVEL; root.add(m.upper);
      m.upper.traverse(o => { if (o.isMesh && o.userData.vertices) o.geometry = o.geometry.clone(); });
    }
    m.glow = new T.PointLight('#ff8b43', 0, 3); m.glow.position.set(0, CY, WALL_Z - .4); root.add(m.glow);
    m.fire = fire(service, id === 'duct' ? 2.8 : 1.1, 1.7, CY, -.2);
    models[id] = m; floors.push(root);
  }
  ids.filter(id => id !== 'firewall').forEach(buildBay);
  const architecture = buildFactory({ T, scene, models, box, mesh, group, mat, concrete, cladding, steel, zinc, frameMetal, glass, pvc, WALL_Z, CY });
  const siteContext = buildSiteContext({ T, scene, box, mesh, group, mat, animated, concrete, zinc, steel, frameMetal, whiteSeal, textures, groundWidth: 32 });
  models.firewall = siteContext.model;
  // Batch repeated, static parts inside each animated group. Parent groups still
  // move independently, while hundreds of fixings and facade joints draw once.
  const moving = new Set();
  for (const m of Object.values(models)) {
    for (const p of m.parts) moving.add(p.object);
    for (const o of [m.softPipe, ...(m.expansions || []), ...(m.damperBlades || []), ...(m.screens || []).flatMap(s => [s.curtain, s.rail])]) if (o) moving.add(o);
  }
  function batchStatic(parent) {
    for (const child of [...parent.children]) if (!child.isMesh) batchStatic(child);
    const batches = new Map();
    for (const child of parent.children) {
      if (!child.isMesh || child.isInstancedMesh || moving.has(child) || child.material.isShaderMaterial || child.userData.component) continue;
      const key = `${child.geometry.uuid}/${child.material.uuid}/${child.castShadow}/${child.receiveShadow}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(child);
    }
    for (const items of batches.values()) {
      if (items.length < 3) continue;
      const first = items[0], instanced = new T.InstancedMesh(first.geometry, first.material, items.length);
      instanced.castShadow = first.castShadow; instanced.receiveShadow = first.receiveShadow;
      items.forEach((item, i) => { item.updateMatrix(); instanced.setMatrixAt(i, item.matrix); parent.remove(item); });
      parent.add(instanced);
    }
  }
  batchStatic(architecture);
  for (const m of Object.values(models)) batchStatic(m.root);
  // Fit the complete architecture independently of the ground and its shadow.
  const buildingBounds = new T.Box3().setFromObject(architecture);
  for (const floor of floors) buildingBounds.expandByObject(floor);
  buildingBounds.expandByObject(siteContext.terrain).expandByObject(models.firewall.root);
  // A shadow catcher keeps the navy studio continuous, without a visible horizon.
  const floor = mesh(new T.PlaneGeometry(160, 160), new T.ShadowMaterial({ color: '#000000', opacity: .32 }), scene, 0, -5.46, 0); floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  const contactCanvas = document.createElement('canvas'); contactCanvas.width = contactCanvas.height = 128;
  const contact = contactCanvas.getContext('2d');
  const gradient = contact.createRadialGradient(64, 64, 10, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,.48)'); gradient.addColorStop(.55, 'rgba(0,0,0,.25)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  contact.fillStyle = gradient; contact.fillRect(0, 0, 128, 128);
  const contactTex = new T.CanvasTexture(contactCanvas); textures.push(contactTex);
  const contactShadow = mesh(new T.PlaneGeometry(38, 17), new T.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }), architecture, 0, -5.452, .5);
  contactShadow.rotation.x = -Math.PI / 2; contactShadow.castShadow = false; contactShadow.receiveShadow = false;
  scene.add(new T.HemisphereLight('#f1f3f5', '#51585e', 1.15));
  const key = new T.DirectionalLight('#fff1db', 3); key.position.set(-9, 28, 16); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -22, right: 22, top: 20, bottom: -16, near: 1, far: 60 });
  key.shadow.normalBias = .012; key.shadow.bias = -.0001; key.shadow.radius = 4; key.target.position.set(0, 5, 0); scene.add(key, key.target);
  const rim = new T.DirectionalLight('#d2e5fa', 1.6); rim.position.set(6, 14, -9); scene.add(rim);
  const fill = new T.DirectionalLight('#e8f0ff', .9); fill.position.set(6, 9, 12); scene.add(fill);

  function modelState(m, t, active) {
    // Hide other floors at the start of the camera move. Fading every bolt and
    // transparent glass pane caused expensive overdraw on software/mobile GPUs.
    m.root.visible = !clock.selected || active;
    m.alpha = m.root.visible ? 1 : 0;
    if (!m.root.visible) return;
    const installing = active && clock.mode === 'install';
    if (m.contextSlabs) m.contextSlabs.visible = Boolean(clock.selected);
    // Show the full route on hover; isolate the certified wall detail on click
    // so the riser and slab do not cover boards, fixings or insulation.
    if (m.routeGroup) m.routeGroup.visible = !installing;
    if (m.upper) m.upper.visible = !installing;
    if (m.upperWall) m.upperWall.visible = !installing;
    if (m.contextSlabs) m.contextSlabs.children[1].visible = !installing;
    const constructionTime = installing ? t : SYSTEMS[m.id].duration;
    for (const p of m.parts) {
      // Only the camera-facing side is shown during installation, including
      // through the opening. The completed overview retains both certified faces.
      const partTime = p.face < 0 ? SYSTEMS[m.id].duration : constructionTime;
      const r = ramp(partTime, p.start, p.end);
      p.object.visible = p.face < 0 ? !installing || t >= SYSTEMS[m.id].duration : partTime >= p.start;
      p.object.position.copy(p.home).addScaledVector(p.offset, 1 - r);
    }
    if (m.id === 'firewall') {
      m.rear.visible = !installing || t >= SYSTEMS.firewall.duration;
      return;
    }
    const fireStart = m.id === 'metal' ? 14.5 : m.id === 'polymer' ? 11 : 15;
    const protection = installing ? ramp(t, fireStart + .5, 17) : 0;
    if (m.id === 'polymer') {
      m.softPipe.scale.set(1 - protection * .98, 1 - protection * .98, 1 - protection * .6);
      m.softPipe.visible = protection < .96;
      for (const e of m.expansions) {
        const pos = e.geometry.attributes.position, original = e.userData.vertices;
        for (let i = 0; i < pos.count; i++) { const x = original[i * 3], y = original[i * 3 + 1]; const r = Math.hypot(x, y) < .14 ? Math.max(.002, 1 - protection) : 1; pos.setXY(i, x * r, y * r); }
        pos.needsUpdate = true;
      }
    }
    if (m.id === 'duct') for (const blade of m.damperBlades) blade.rotation.x = Math.PI / 2 * (1 - protection);
    if (m.id === 'shutter') {
      const close = installing ? .012 + .988 * ramp(t, 3, 15.5) : .16;
      for (const { curtain, rail } of m.screens) { curtain.scale.y = close; curtain.position.y = 2.63 - 1.3 * close; rail.position.y = 2.63 - 2.6 * close; }
    }
    const heat = installing && m.id !== 'shutter' ? ramp(t, fireStart, fireStart + 1) * .6 : 0;
    m.fire.visible = heat > .01; m.fire.material.uniforms.uStrength.value = heat; m.fire.material.uniforms.uTime.value = t;
    m.glow.intensity = heat * 3;
    m.wall.material.opacity = 1; m.wall.material.depthWrite = true;
    m.wall.castShadow = true;
  }
  function frameScene() {
    for (const id of ids) modelState(models[id], clock.elapsed, id === clock.selected);
    architecture.visible = !clock.selected;
    siteContext.terrain.visible = !clock.selected;
    camera.lookAt(target);
    renderer.render(scene, camera);
  }
  function destination() {
    if (clock.selected) {
      const model = models[clock.selected], base = model.root.position.y;
      const baseX = model.root.position.x;
      if (clock.mode === 'preview' && model.route) {
        toTarget.set(baseX, 2.8, .2);
        const fit = Math.max(1, 1.2 / camera.aspect);
        toPosition.set(3.1, 2.6, 15).multiplyScalar(fit).add(toTarget);
        return;
      }
      const poses = {
        metal: [[1.65, 2.3, 2.55], [0, CY, -.3]],
        polymer: [[.85, 1.96, 1.6], [0, CY, -.42]],
        duct: [[3.2, 2.4, 5.3], [0, CY, -.25]],
        shutter: [[3.6, 2.7, 6.4], [0, 1.4, -.4]],
        firewall: [[.6, 1.9, 14.2], [0, 1.5, 4.2]],
      };
      const [pos, look] = poses[clock.selected];
      toTarget.set(look[0] + baseX, look[1] + base, look[2]);
      const fit = Math.max(1, (clock.selected === 'metal' ? 1.6 : 1.4) / camera.aspect);
      toPosition.set(pos[0] + baseX, pos[1] + base, pos[2]).sub(toTarget).multiplyScalar(fit).add(toTarget);
    } else {
      buildingBounds.getCenter(toTarget);
      const direction = new T.Vector3(10, 9, 32).normalize();
      const right = new T.Vector3().crossVectors(camera.up, direction).normalize();
      const up = new T.Vector3().crossVectors(direction, right).normalize();
      const tanV = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      const tanH = tanV * camera.aspect;
      let distance = 0;
      for (const x of [buildingBounds.min.x, buildingBounds.max.x]) {
        for (const y of [buildingBounds.min.y, buildingBounds.max.y]) {
          for (const z of [buildingBounds.min.z, buildingBounds.max.z]) {
            const corner = new T.Vector3(x, y, z).sub(toTarget);
            distance = Math.max(distance, corner.dot(direction) + Math.max(Math.abs(corner.dot(right)) / (tanH * .91), Math.abs(corner.dot(up)) / (tanV * .93)));
          }
        }
      }
      toPosition.copy(toTarget).addScaledVector(direction, distance);
    }
  }
  function inspect() {
    const components = {};
    scene.traverse(o => { const key = o.userData.component; if (key) components[key] = (components[key] || 0) + 1; });
    return {
      ...clock, drawCalls: renderer.info.render.calls, visible, transition, transitionSeconds, camera: camera.position.toArray(), target: target.toArray(), reduced: reduce.matches,
      components, factory: { storeys: 2, width: FACTORY.width, level: LEVEL, routes: Object.fromEntries(ids.filter(id => models[id].route).map(id => [id, models[id].route])) },
      routeVisibility: Object.fromEntries(ids.filter(id => models[id].routeGroup).map(id => [id, models[id].root.visible && models[id].routeGroup.visible])),
      visibleFloors: ids.filter(id => models[id].root.visible),
      floors: ids.map(id => ({ id, floor: SYSTEMS[id].floor, y: models[id].root.position.y, parts: models[id].parts.length,
        installed: models[id].parts.filter(p => p.object.visible).length })),
      shutter: models.shutter.screens.map(s => ({ scale: s.curtain.scale.y, bottom: s.rail.position.y })),
      polymer: { pipeVisible: models.polymer.softPipe.visible },
      damper: models.duct.damperBlades.map(b => b.rotation.x),
      wallsOpaque: ids.filter(id => models[id].wall).every(id => models[id].wall.material.opacity === 1 && !models[id].wall.material.transparent),
      metalBoards: models.metal.parts.filter(p => p.object.userData.component === 'metal-board').map(p => ({ half: p.object.userData.half, face: p.face, visible: p.object.visible, offset: p.object.position.clone().sub(p.home).toArray() })),
      firewall: { boardSize: siteContext.boardSize, thickness: siteContext.wallThickness, studXs: siteContext.studXs, rearVisible: models.firewall.rear.visible, installedFrontBoards: models.firewall.frontBoards.filter(o => o.visible).length },
    };
  }
  function emit() {
    const steps = clock.selected ? SYSTEMS[clock.selected].steps : [[0, '전체 보기']];
    let phase = 0;
    steps.forEach(([at], i) => { if (clock.elapsed >= at) phase = i; });
    clock.phase = phase;
    onUpdate({ selected: clock.selected, mode: clock.mode, progress: clock.elapsed / clock.duration, phase, complete: clock.elapsed >= clock.duration, reduced: reduce.matches });
  }
  function advance(now) {
    raf = 0;
    if (!clock.running || disposed || !visible || document.hidden) return;
    const dt = last === null ? 0 : Math.min((now - last) / 1000, .25); last = now;
    transition = Math.min(1, transition + dt / transitionSeconds);
    const e = smooth(transition);
    camera.position.lerpVectors(fromPosition, toPosition, e); target.lerpVectors(fromTarget, toTarget, e);
    if (clock.mode === 'install' && transition >= 1) clock.elapsed = Math.min(clock.duration, clock.elapsed + dt);
    frameScene(); emit();
    if ((clock.mode === 'install' && clock.elapsed < clock.duration) || transition < 1) raf = requestAnimationFrame(advance);
    else clock.running = false;
  }
  function resume() {
    if (disposed || !visible || document.hidden || raf || reduce.matches) return;
    if (clock.mode !== 'install' && transition >= 1) return;
    if (clock.mode === 'install' && clock.elapsed >= clock.duration && transition >= 1) return;
    clock.running = true; last = null; raf = requestAnimationFrame(advance);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = null; clock.running = false; }
  function moveTo(id, mode, elapsed = 0) {
    if (id !== null && !ids.includes(id)) return;
    stop();
    clock.selected = id; clock.mode = id ? mode : 'overview'; clock.duration = id ? SYSTEMS[id].duration : 18;
    clock.elapsed = mode === 'install' && reduce.matches ? clock.duration : elapsed;
    fromPosition.copy(camera.position); fromTarget.copy(target); destination(); transition = 0; transitionSeconds = mode === 'preview' || !id ? 2.4 : 1.8;
    if (reduce.matches) { camera.position.copy(toPosition); target.copy(toTarget); transition = 1; }
    frameScene(); emit(); resume();
  }
  function select(id) { previewReturn = null; moveTo(id, id ? 'install' : 'overview'); }
  function preview(id) {
    if (!ids.includes(id) || (clock.selected === id && clock.mode === 'preview')) return;
    if (clock.mode !== 'preview') previewReturn = { selected: clock.selected, mode: clock.mode, elapsed: clock.elapsed };
    moveTo(id, 'preview');
  }
  function clearPreview() {
    if (clock.mode !== 'preview') return;
    const saved = previewReturn || { selected: null, mode: 'overview', elapsed: 0 }; previewReturn = null;
    moveTo(saved.selected, saved.mode, saved.elapsed);
  }
  function seek(seconds) {
    stop(); clock.elapsed = Math.min(clock.duration, Math.max(0, seconds));
    camera.position.copy(toPosition); target.copy(toTarget); transition = 1; frameScene(); emit();
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    destination();
    if (transition < 1 && !reduce.matches) {
      // The caption changes the canvas height; keep the ongoing zoom smooth.
      fromPosition.copy(camera.position); fromTarget.copy(target); transition = 0;
    } else {
      camera.position.copy(toPosition); target.copy(toTarget);
      fromPosition.copy(camera.position); fromTarget.copy(target); transition = 1;
    }
    frameScene();
  }
  function visibility() { if (document.hidden) stop(); else resume(); }
  function reducedChange() { if (reduce.matches) seek(clock.mode === 'install' ? clock.duration : 0); else { frameScene(); resume(); } }
  const ro = new ResizeObserver(resize); ro.observe(host);
  const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) resume(); else stop(); }, { threshold: .05 }); io.observe(host);
  document.addEventListener('visibilitychange', visibility); reduce.addEventListener('change', reducedChange);
  resize(); host.classList.add('is-3d'); emit();
  function dispose() {
    disposed = true; stop(); ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', visibility); reduce.removeEventListener('change', reducedChange);
    const geometries = new Set(), materials = new Set();
    scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => { if (m.map && m.map !== concreteTex && m.map !== fabricTex) m.map.dispose(); m.dispose(); });
    textures.forEach(texture => texture.dispose()); env.dispose(); renderer.dispose();
  }
  return { select, preview, clearPreview, overview: () => select(null), replay: () => select(clock.selected), seek, stop, resume, dispose,
    getState: inspect };
}
