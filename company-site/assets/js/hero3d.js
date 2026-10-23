import { SYSTEMS } from './systems.js?v=20261023d';
// Product-scale fire protection demonstrator. No people or full-screen film.
// All dimensions and timing are illustrative; this is not a fire-rating simulation.
export async function initHero3D(canvas, host, { onUpdate = () => {} } = {}) {
  const T = await import('./vendor/three.module.min.js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color('#e6edf4');
  scene.fog = new T.Fog('#e6edf4', 45, 110);
  const camera = new T.PerspectiveCamera(34, 1, .1, 80);
  const target = new T.Vector3(0, 1.2, 0);
  const clock = { selected: null, elapsed: 0, duration: 18, phase: -1, running: false };
  let raf = 0, last = null, visible = true, disposed = false;
  let transition = 1, fromPosition = new T.Vector3(), fromTarget = new T.Vector3();
  let toPosition = new T.Vector3(), toTarget = new T.Vector3();
  const ids = ['metal', 'polymer', 'duct', 'shutter'];
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
  scene.environmentIntensity = .85;
  envScene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  pmrem.dispose();

  // Seeded surface maps: restrained grain on concrete and woven screen fabric.
  function surface(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = kind === 'concrete' ? '#c5c9c7' : '#e0dbcc'; g.fillRect(0, 0, 256, 256);
    let seed = 19;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 19000; i++) {
      const v = Math.floor(110 + random() * 120);
      g.fillStyle = `rgba(${v},${v},${v},.15)`;
      g.fillRect(random() * 256, random() * 256, 1, 1);
    }
    if (kind === 'fabric') {
      g.strokeStyle = 'rgba(70,60,44,.12)'; g.lineWidth = .6;
      for (let j = 0; j < 256; j += 3) { g.beginPath(); g.moveTo(j, 0); g.lineTo(j, 256); g.moveTo(0, j); g.lineTo(256, j); g.stroke(); }
    }
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const concreteTex = surface('concrete'), fabricTex = surface('fabric');
  const concrete = new T.MeshStandardMaterial({ color: '#d5dbe0', map: concreteTex, bumpMap: concreteTex, bumpScale: .012, roughness: .86 });
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
    return mesh(geometry, material, parent, x, y, z);
  }
  function ring(outer, inner, depth, material, parent, x, y, z) {
    const shape = new T.Shape(); shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new T.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 });
    return mesh(geometry, material, parent, x, y, z);
  }
  function tube(radius, inner, length, material, parent, x, y, z) { return ring(radius, inner, length, material, parent, x, y, z); }
  function bolt(parent, x, y, z, r = .035) {
    const b = mesh(new T.CylinderGeometry(r, r, .035, 6), screwMat, parent, x, y, z);
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
  // Each floor contains one wall assembly from the supplied certificates.
  const LEVEL = 3.3, WALL_Z = -.55, WALL_T = .15, CY = 1.65;
  const blue = mat('#2d5682', .34, .38), white = mat('#e1e7ec', .72);
  const dark = mat('#344555', .38, .72), whiteSeal = mat('#f3f2ed', .85);
  const bandBlue = mat('#2d5682', .56, .1), bandCore = mat('#222529', .96);
  const glass = new T.MeshStandardMaterial({ color: '#a2c3dc', metalness: .35, roughness: .12, transparent: true, opacity: .33, side: T.DoubleSide, depthWrite: false });
  const architecture = new T.Group(); scene.add(architecture);
  const floors = [];
  const textures = [concreteTex, fabricTex];
  function textPlate(text, w, h, color = '#2d5682', bg = '#e8edf2') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
    g.fillStyle = color; g.font = '600 62px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 68, 475);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; textures.push(tex);
    return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex }));
  }
  // Foil appearance is based on the supplied SFI-100 product photographs: wrinkled
  // aluminium with restrained blue DOENC printing, rather than plain white foam.
  function foilSurface() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#c6ced4'; g.fillRect(0, 0, 512, 512);
    let seed = 31; const rand = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 950; i++) {
      const x = rand() * 512, y = rand() * 512;
      g.strokeStyle = `rgba(${i % 2 ? '255,255,255' : '65,75,84'},${.05 + rand() * .22})`;
      g.lineWidth = .3 + rand() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - .5) * 50, y + rand() * 13); g.stroke();
    }
    g.fillStyle = 'rgba(45,86,130,.65)'; g.font = '13px sans-serif';
    for (let y = 45; y < 512; y += 110) for (let x = 20; x < 512; x += 170) { g.save(); g.translate(x, y); g.rotate(-.4); g.fillText('DOENC', 0, 0); g.restore(); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; textures.push(t); return t;
  }
  let foilTex = foilSurface();
  try {
    const photograph = await new T.TextureLoader().loadAsync(new URL('../images/products/blanket.webp', import.meta.url).href);
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const img = photograph.image;
    // Central foil area of the actual SFI-100 photograph, excluding the white background.
    c.getContext('2d').drawImage(img, img.width * .2, img.height * .22, img.width * .56, img.height * .44, 0, 0, 512, 512);
    foilTex = new T.CanvasTexture(c); foilTex.colorSpace = T.SRGBColorSpace;
    foilTex.wrapS = foilTex.wrapT = T.RepeatWrapping; textures.push(foilTex); photograph.dispose();
  } catch { /* The photo-inspired procedural texture remains available offline. */ }
  const foil = new T.MeshStandardMaterial({ color: '#eef1f3', map: foilTex, bumpMap: foilTex, bumpScale: .0015, metalness: .55, roughness: .58 });
  const wool = mat('#eee9da', .99);
  function group(parent, x = 0, y = 0, z = 0) { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  function animated(model, object, start, end, offset = [0, 0, 0], mode = 'slide') {
    model.parts.push({ object, home: object.position.clone(), offset: new T.Vector3(...offset), start, end, mode }); return object;
  }
  function sectionWall(parent, opening) {
    const s = new T.Shape(); s.moveTo(-3.2, .01); s.lineTo(3.2, .01); s.lineTo(3.2, 3.05); s.lineTo(-3.2, 3.05); s.closePath();
    const h = new T.Path();
    if (opening.radius) h.absarc(0, CY, opening.radius, 0, 2 * Math.PI, true);
    else { const { w, h: height, y = CY } = opening; h.moveTo(-w / 2, y - height / 2); h.lineTo(-w / 2, y + height / 2); h.lineTo(w / 2, y + height / 2); h.lineTo(w / 2, y - height / 2); h.closePath(); }
    s.holes.push(h);
    return mesh(new T.ExtrudeGeometry(s, { depth: WALL_T, bevelEnabled: false, curveSegments: 48 }), concrete.clone(), parent, 0, 0, WALL_Z - WALL_T / 2);
  }
  function mark(parent, text, x, y, z, w = .15) {
    const m = textPlate(text, w, w / 4, '#2d5682', '#e7ebec'); m.position.set(x, y, z); parent.add(m); return m;
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
      const face = sign * .075;
      const boards = group(m.service);
      halfBoard(boards, true, .205, face + (sign < 0 ? -.009 : 0));
      halfBoard(boards, false, .205, face + (sign < 0 ? -.009 : 0));
      animated(m, boards, 2, 3.25, [0, 0, sign * .23]);
      const screwGroup = group(m.service);
      // Edge fixing pattern follows the drawing; tiny heads are enlarged for readability.
      for (const x of [-.33, -.11, .11, .33]) for (const dy of [-.33, .33]) bolt(screwGroup, x, CY + dy, face + sign * .012, .0045);
      for (const x of [-.33, .33]) for (const dy of [-.165, 0, .165]) bolt(screwGroup, x, CY + dy, face + sign * .012, .0045);
      animated(m, screwGroup, 3.25, 4.2);
      const caulk = group(m.service), z = face + sign * .013;
      for (const x of [-.35, .35]) bead(caulk, [x, CY - .35, z], [x, CY + .35, z]);
      for (const y of [CY - .35, CY + .35]) bead(caulk, [-.35, y, z], [.35, y, z]);
      bead(caulk, [-.35, CY, z], [-.205, CY, z], .0075); bead(caulk, [.205, CY, z], [.35, CY, z], .0075);
      ring(.211, .2032, .009, whiteSeal, caulk, 0, CY, z);
      animated(m, caulk, 4.4, 6.1);
      for (let layer = 0; layer < 2; layer++) for (let segment = 0; segment < 2; segment++) {
        const len = segment ? .3 : .7, inner = .2032 + layer * .025;
        const start = .085 + (segment ? .7 : 0), frontZ = sign > 0 ? start : -start - len;
        const wrap = group(m.service, 0, CY, frontZ);
        ring(inner + .025, inner, len, foil, wrap, 0, 0, 0);
        ring(inner + .0245, inner + .0005, .002, wool, wrap, 0, 0, sign > 0 ? len : -.002);
        const begin = 6.4 + layer * 2.6 + segment * 1.15;
        animated(m, wrap, begin, begin + 1, [0, .1, sign * .08]);
      }
      const finish = group(m.service);
      for (const dz of [.1, .37, .72, 1.04]) {
        const tor = mesh(new T.TorusGeometry(.2545, .0016, 6, 64), edgeMetal, finish, 0, CY, sign * dz);
        tor.rotation.z = .08;
      }
      for (const dz of [.085, .785, 1.055]) ring(.255, .2532, .03, steel, finish, 0, CY, sign * dz - (sign < 0 ? .03 : 0));
      animated(m, finish, 11.8, 13.4);
      const label = mark(boards, 'SFB-100F', -.22, CY - .29, face + sign * .011, .13);
      if (sign < 0) label.rotation.y = Math.PI;
    }
  }
  function polymerSystem(m) {
    tube(.1335, .124, .85, pvc, m.service, 0, CY, -.925);
    m.softPipe = tube(.1335, .124, .85, pvc, m.service, 0, CY, .075);
    m.expansions = [];
    for (const sign of [1, -1]) {
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
      const boards = group(m.service);
      for (const dy of [-.45, .45]) for (let i = 0; i < 3; i++) box(.9, .15, .00886, mineral, boards, (i - 1) * .9, CY + dy, sign * .083).userData.component = 'duct-board';
      for (const x of [-1.425, 1.425]) for (const dy of [-.2625, .2625]) box(.15, .525, .00886, mineral, boards, x, CY + dy, sign * .083).userData.component = 'duct-board';
      for (const x of [-1.45, -1.32, 1.32, 1.45]) for (const dy of [-.49, -.25, 0, .25, .49]) bolt(boards, x, CY + dy, sign * .092, .004);
      for (const dy of [-.49, -.41, .41, .49]) for (let i = 0; i < 21; i++) bolt(boards, -1.3 + i * .13, CY + dy, sign * .092, .0035);
      animated(m, boards, 6, 7.3, [0, 0, sign * .18]);
      const caulk = group(m.service);
      for (const dy of [-.525, .525]) bead(caulk, [-1.5, CY + dy, sign * .092], [1.5, CY + dy, sign * .092]);
      for (const x of [-1.5, 1.5]) bead(caulk, [x, CY - .525, sign * .092], [x, CY + .525, sign * .092]);
      for (const x of [-.45, .45]) for (const dy of [-1, 1]) bead(caulk, [x, CY + dy * .375, sign * .095], [x, CY + dy * .525, sign * .095], .0075);
      animated(m, caulk, 7.3, 8.8);
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
  function buildFloor(id, index) {
    const root = group(scene, 0, index * LEVEL, 0), room = group(root), service = group(root, 0, 0, WALL_Z);
    const m = { id, root, room, service, parts: [], alpha: 1, fadeFrom: 1 };
    // Continuous slabs, finely edged columns and a glazed service bay establish a building.
    box(8.1, .2, 5.35, white, room, -.25, -.1, -.1);
    box(8.14, .045, .075, blue, room, -.25, -.045, 2.6);
    box(8.14, .018, .018, steel, room, -.25, .005, 2.63);
    for (const x of [-3.4, 3.4]) {
      box(.16, 3.1, .2, blue, room, x, 1.55, 2.3);
      box(.24, 3.1, .24, white, room, x, 1.55, -2.3);
    }
    // Full-height glazing on the side bay; the central facade is intentionally sectioned.
    for (const z of [-1.6, -.5, .6, 1.7]) {
      box(.045, 3.1, .045, blue, room, -4.15, 1.55, z);
      box(.012, 2.85, 1.05, glass, room, -4.16, 1.55, z + .52);
    }
    box(.065, 3.08, 4.7, white, room, 3.55, 1.54, -.1);
    box(7.55, 3.08, .1, white, room, -.25, 1.54, -2.65);
    const light = new T.MeshStandardMaterial({ color: '#edf5ff', emissive: '#b5d4ff', emissiveIntensity: .45 });
    box(5.5, .014, .045, light, room, 0, 3.04, .8);
    const number = textPlate(`${index + 1}F`, .7, .2, '#ffffff', '#2d5682'); number.position.set(-2.95, .31, 2.405); room.add(number);
    const systemLabel = textPlate(SYSTEMS[id].en, 1.45, .24, '#6d86a0', '#e8edf2'); systemLabel.position.set(1.85, 2.6, WALL_Z + .082); room.add(systemLabel); m.label = systemLabel;
    let opening;
    if (id === 'metal') opening = { w: .5, h: .5 };
    else if (id === 'polymer') opening = { radius: .1385 };
    else if (id === 'duct') opening = { w: 2.7, h: .75 };
    else opening = { w: 4.07, h: 2.65, y: 1.335 };
    m.wall = sectionWall(room, opening);
    if (id === 'metal') metalSystem(m);
    if (id === 'polymer') polymerSystem(m);
    if (id === 'duct') ductSystem(m);
    if (id === 'shutter') shutterSystem(m);
    m.glow = new T.PointLight('#ff8b43', 0, 3); m.glow.position.set(0, CY, WALL_Z - .4); root.add(m.glow);
    m.fire = fire(service, id === 'duct' ? 2.8 : 1.1, 1.7, CY, -.2);
    const materialCopies = new Map(); m.surfaces = [];
    root.traverse(o => {
      if (!o.isMesh || o.material.isShaderMaterial) return;
      if (!materialCopies.has(o.material)) {
        const copy = o.material.clone(); copy.userData.baseOpacity = copy.opacity;
        copy.userData.baseTransparent = copy.transparent; materialCopies.set(o.material, copy);
      }
      o.material = materialCopies.get(o.material); o.userData.castsShadow = o.castShadow; m.surfaces.push(o);
    });
    m.materials = [...materialCopies.values()]; models[id] = m; floors.push(root);
  }
  ids.forEach(buildFloor);
  // Architectural crown and brand plaque, without adding an extra storey.
  box(8.3, .22, 5.5, blue, architecture, -.25, LEVEL * 4 - .05, -.1);
  box(8.05, .1, 5.28, white, architecture, -.25, LEVEL * 4 + .1, -.1);
  box(3.3, .56, .14, white, architecture, .5, LEVEL * 4 + .32, 2.5);
  const name = textPlate('DOENC', 1.75, .44); name.position.set(.65, LEVEL * 4 + .32, 2.578); architecture.add(name);
  try {
    const logo = await new T.TextureLoader().loadAsync(new URL('../images/doenc_mark.png', import.meta.url).href);
    logo.colorSpace = T.SRGBColorSpace; textures.push(logo);
    const plane = mesh(new T.PlaneGeometry(.65, .38), new T.MeshBasicMaterial({ map: logo, transparent: true, depthWrite: false }), architecture, -.66, LEVEL * 4 + .32, 2.585);
    plane.castShadow = false;
  } catch { /* The wordmark still identifies the building if the optional mark cannot load. */ }
  for (let n = 0; n < 3; n++) box(9 + n * .5, .08, 6 + n * .5, white, architecture, -.25, -.25 - n * .08, -.1);
  const floor = mesh(new T.PlaneGeometry(160, 160), mat('#dce5ed', .93), scene, 0, -.5, 0); floor.rotation.x = -Math.PI / 2;
  scene.add(new T.HemisphereLight('#e4f0ff', '#93a0ad', 1.8));
  const key = new T.DirectionalLight('#fff7eb', 3.4); key.position.set(-10, 22, 14); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -13, right: 13, top: 15, bottom: -10, near: 1, far: 60 });
  key.shadow.normalBias = .012; key.shadow.bias = -.0001; key.shadow.radius = 3; key.target.position.set(0, 5, 0); scene.add(key, key.target);
  const rim = new T.DirectionalLight('#c3ddff', 2); rim.position.set(6, 14, -9); scene.add(rim);
  const fill = new T.DirectionalLight('#e8f0ff', .65); fill.position.set(3, 6, 8); scene.add(fill);

  function modelState(m, t, active) {
    // Hide other floors at the start of the camera move. Fading every bolt and
    // transparent glass pane caused expensive overdraw on software/mobile GPUs.
    m.root.visible = !clock.selected || active;
    m.alpha = m.root.visible ? 1 : 0;
    if (!m.root.visible) return;
    const constructionTime = active ? t : 18;
    m.label.visible = !active;
    for (const p of m.parts) {
      const r = ramp(constructionTime, p.start, p.end);
      p.object.visible = constructionTime >= p.start;
      p.object.position.copy(p.home).addScaledVector(p.offset, 1 - r);
    }
    const fireStart = m.id === 'metal' ? 14 : m.id === 'polymer' ? 11 : 15;
    const protection = active ? ramp(t, fireStart + .5, 17) : 0;
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
      const close = active ? .12 + .88 * ramp(t, 3, 15.5) : .22;
      for (const { curtain, rail } of m.screens) { curtain.scale.y = close; curtain.position.y = 2.63 - 1.3 * close; rail.position.y = 2.63 - 2.6 * close; }
    }
    const heat = active && m.id !== 'shutter' ? ramp(t, fireStart, fireStart + 1) * .6 : 0;
    m.fire.visible = heat > .01; m.fire.material.uniforms.uStrength.value = heat; m.fire.material.uniforms.uTime.value = t;
    m.glow.intensity = heat * 3;
    // During construction, a controlled cutaway exposes the mirrored back-side work.
    const wallCutaway = active && m.id !== 'shutter' && t > 1.5 && t < 17.4 ? .24 : 1;
    const wm = m.wall.material;
    const wallTransparent = m.alpha * wallCutaway < .999;
    if (wm.transparent !== wallTransparent) { wm.transparent = wallTransparent; wm.needsUpdate = true; }
    wm.opacity = m.alpha * wallCutaway; wm.depthWrite = wallCutaway === 1;
    for (const surface of m.surfaces) surface.castShadow = m.alpha > .95 && surface.userData.castsShadow;
    m.wall.castShadow = wallCutaway === 1 && m.alpha > .95;
  }
  function frameScene() {
    for (const id of ids) modelState(models[id], clock.elapsed, id === clock.selected);
    architecture.visible = !clock.selected || transition < .65;
    camera.lookAt(target);
    renderer.render(scene, camera);
  }
  function destination() {
    const portrait = camera.aspect < 1.15;
    if (clock.selected) {
      const base = (SYSTEMS[clock.selected].floor - 1) * LEVEL;
      const poses = {
        metal: [[1.65, 2.3, 2.55], [0, CY, -.3]],
        polymer: [[.85, 1.96, 1.6], [0, CY, -.42]],
        duct: [[3.2, 2.4, 5.3], [0, CY, -.25]],
        shutter: [[3.6, 2.7, 6.4], [0, 1.4, -.4]],
      };
      const [pos, look] = poses[clock.selected];
      toTarget.set(look[0], look[1] + base, look[2]);
      const fit = portrait ? Math.max(1, 1.4 / camera.aspect) : 1;
      toPosition.set(pos[0], pos[1] + base, pos[2]).sub(toTarget).multiplyScalar(fit).add(toTarget);
    } else {
      toTarget.set(-.35, 6.35, 0);
      const k = portrait ? 1.28 : 1.05;
      toPosition.set(15 * k, 11.5, 23 * k);
    }
  }
  function inspect() {
    const components = {};
    scene.traverse(o => { const key = o.userData.component; if (key) components[key] = (components[key] || 0) + 1; });
    return {
      ...clock, drawCalls: renderer.info.render.calls, visible, transition, camera: camera.position.toArray(), target: target.toArray(), reduced: reduce.matches,
      components, visibleFloors: ids.filter(id => models[id].root.visible),
      floors: ids.map(id => ({ id, floor: SYSTEMS[id].floor, y: models[id].root.position.y, parts: models[id].parts.length,
        installed: models[id].parts.filter(p => p.object.visible).length })),
      shutter: models.shutter.screens.map(s => ({ scale: s.curtain.scale.y, bottom: s.rail.position.y })),
      polymer: { pipeVisible: models.polymer.softPipe.visible },
      damper: models.duct.damperBlades.map(b => b.rotation.x),
    };
  }
  function emit() {
    const steps = clock.selected ? SYSTEMS[clock.selected].steps : [[0, '전체 보기']];
    let phase = 0;
    steps.forEach(([at], i) => { if (clock.elapsed >= at) phase = i; });
    clock.phase = phase;
    onUpdate({ selected: clock.selected, progress: clock.elapsed / clock.duration, phase, complete: clock.elapsed >= clock.duration, reduced: reduce.matches });
  }
  function advance(now) {
    raf = 0;
    if (!clock.running || disposed || !visible || document.hidden) return;
    const dt = last === null ? 0 : Math.min((now - last) / 1000, .1); last = now;
    transition = Math.min(1, transition + dt / 1.25);
    const e = smooth(transition);
    camera.position.lerpVectors(fromPosition, toPosition, e); target.lerpVectors(fromTarget, toTarget, e);
    if (clock.selected) clock.elapsed = Math.min(clock.duration, clock.elapsed + dt);
    frameScene(); emit();
    if ((clock.selected && clock.elapsed < clock.duration) || transition < 1) raf = requestAnimationFrame(advance);
    else clock.running = false;
  }
  function resume() {
    if (disposed || !visible || document.hidden || raf || reduce.matches) return;
    if (!clock.selected && transition >= 1) return;
    if (clock.selected && clock.elapsed >= clock.duration && transition >= 1) return;
    clock.running = true; last = null; raf = requestAnimationFrame(advance);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = null; clock.running = false; }
  function select(id) {
    if (id !== null && !ids.includes(id)) return;
    stop();
    for (const model of Object.values(models)) model.fadeFrom = model.alpha;
    clock.selected = id; clock.duration = id ? SYSTEMS[id].duration : 18; clock.elapsed = reduce.matches && id ? clock.duration : 0;
    fromPosition.copy(camera.position); fromTarget.copy(target); destination(); transition = 0;
    if (reduce.matches) { camera.position.copy(toPosition); target.copy(toTarget); transition = 1; }
    frameScene(); emit(); resume();
  }
  function seek(seconds) {
    stop(); clock.elapsed = Math.min(clock.duration, Math.max(0, seconds));
    camera.position.copy(toPosition); target.copy(toTarget); transition = 1; frameScene(); emit();
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    destination(); camera.position.copy(toPosition); target.copy(toTarget);
    fromPosition.copy(camera.position); fromTarget.copy(target); transition = 1;
    frameScene();
  }
  function visibility() { if (document.hidden) stop(); else resume(); }
  function reducedChange() { if (reduce.matches) seek(clock.duration); else frameScene(); }
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
  return { select, overview: () => select(null), replay: () => select(clock.selected), seek, stop, resume, dispose,
    getState: inspect };
}
