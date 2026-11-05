import { SYSTEMS } from './systems.js?v=20261105r6';
import { buildAssembly } from './assemblies.js?v=20261105r6';
import { buildSiteContext } from './site-context.js?v=20261105r6';
import { FACTORY, buildFactory } from './factory.js?v=20261105r6';
import { fitInstallation, applyAssemblyTime } from './installation-view.js?v=20261105r6';
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
  renderer.shadowMap.autoUpdate = false;
  let shadowState = '';
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
  let cameraSide = 0;
  const ids = ['metal', 'polymer', 'duct', 'bundle', 'firewall'];
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
    if (kind === 'fiber') {
      for(let i=0;i<6500;i++){
        const x=random()*256,y=random()*256,a=random()*Math.PI*2,len=2+random()*13;
        g.strokeStyle=i%3?'rgba(255,255,250,.35)':'rgba(147,144,129,.14)';g.lineWidth=.4;
        g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);g.stroke();
      }
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
    g.fillStyle = '#e0e3e5'; g.fillRect(0, 0, 512, 512);
    let seed = 31; const rand = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 1700; i++) {
      const x = rand() * 512, y = rand() * 512;
      g.strokeStyle = `rgba(${i % 2 ? '255,255,255' : '65,75,84'},${.1 + rand() * .35})`;
      g.lineWidth = .4 + rand() * 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - .5) * 50, y + rand() * 13); g.stroke();
    }
    g.lineWidth=.8;
    for(let d=-512;d<1024;d+=24){
      g.strokeStyle='rgba(245,248,250,.38)';g.beginPath();g.moveTo(d,0);g.lineTo(d+512,512);g.stroke();
      g.strokeStyle='rgba(65,72,80,.28)';g.beginPath();g.moveTo(d+1,0);g.lineTo(d-511,512);g.stroke();
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; textures.push(t); return t;
  }
  const foilTex = foilSurface();
  const foil = new T.MeshStandardMaterial({ color: '#eef1f3', map: foilTex, bumpMap: foilTex, bumpScale: .004, metalness: .5, roughness: .32, envMapIntensity: 1.6 });
  const fiberTex=surface('fiber');textures.push(fiberTex);
  const wool = new T.MeshStandardMaterial({color:'#f5f1e7',map:fiberTex,bumpMap:fiberTex,bumpScale:.003,roughness:.98});
  const blanketFoil=foil.clone();
  // The original product photograph supplies its real crinkles, grid and print.
  try{
    const photo=await new T.TextureLoader().loadAsync(new URL('../images/products/blanket.webp',import.meta.url).href);
    photo.colorSpace=T.SRGBColorSpace;photo.wrapS=photo.wrapT=T.RepeatWrapping;
    photo.repeat.set(.76,.73);photo.offset.set(.12,.15);
    photo.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(photo);
    blanketFoil.map=photo;blanketFoil.color.set('#ffffff');blanketFoil.metalness=.62;blanketFoil.roughness=.4;blanketFoil.envMapIntensity=1.05;
  }catch(error){console.warn('Blanket photograph unavailable; using the foil surface.',error);}
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=512;
  const labelContext=labelCanvas.getContext('2d');labelContext.fillStyle='#155297';labelContext.fillRect(0,0,512,512);
  for(const x of [128,384]){
    labelContext.save();labelContext.translate(x,256);labelContext.rotate(-Math.PI/2);labelContext.fillStyle='#ffffff';
    labelContext.font='bold 62px Arial';labelContext.fillText('DOENC',-190,-20);
    labelContext.font='42px Arial';labelContext.fillText('SFS-100',45,70);labelContext.restore();
  }
  const labelTexture=new T.CanvasTexture(labelCanvas);labelTexture.colorSpace=T.SRGBColorSpace;textures.push(labelTexture);
  const applicationMaterials={whiteSeal,steel,cartridgeWhite:mat('#f2f2eb',.32),gun:mat('#304c64',.35,.5),cartridgeLabel:new T.MeshStandardMaterial({map:labelTexture,roughness:.42})};
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
  const assemblyMaterials = { concrete, steel, zinc, pvc, foil, blanketFoil, wool, mineral, bandCore, ...applicationMaterials,
    copper: mat('#a86f48', .3, .85), glasswool: mat('#d8c88e', .96) };
  function setAssembly(m, record) {
    if (m.assembly?.record.id === record.id) return;
    m.upper?.traverse(o=>{if(o.isInstancedMesh)o.dispose();});
    m.upper?.removeFromParent();
    m.assembly?.dispose();
    const a = buildAssembly({ T, parent:m.root, record, bayWidth:FACTORY.bays[m.id].width, materials:assemblyMaterials, CY, WALL_Z });
    m.assembly=a; m.parts=a.parts; m.wall=a.wall; m.pipes=a.pipes;
    m.room=a.room; m.service=a.service; m.record=record;
    // The upper-floor counterpart remains complete in the building view.
    applyAssemblyTime(a.parts,m.id==='duct'?0:SYSTEMS[m.id].duration,false);
    m.upper=a.root.clone(true);m.upper.position.y+=LEVEL;m.root.add(m.upper);
    m.upper.visible=m.id!=='bundle' && !a.isFloor;
    applyAssemblyTime(a.parts,0,false);
  }
  function buildBay(id) {
    const bay = FACTORY.bays[id], root = group(scene,bay.x,0,0);
    const m = { id,root,parts:[],alpha:1 };
    setAssembly(m,SYSTEMS[id].record);
    models[id]=m;floors.push(root);
  }
  ids.filter(id => id !== 'firewall').forEach(buildBay);
  const architecture = buildFactory({ T, scene, models, box, mesh, group, mat, concrete, cladding, steel, zinc, frameMetal, glass, pvc, WALL_Z, CY });
  const siteContext = buildSiteContext({ T, scene, box, mesh, group, mat, animated, concrete, zinc, steel, frameMetal, whiteSeal, applicationMaterials, textures, groundWidth: 32 });
  models.firewall = siteContext.model;
  // Batch repeated, static parts inside each animated group. Parent groups still
  // move independently, while hundreds of fixings and facade joints draw once.
  const moving = new Set();
  for (const m of Object.values(models)) {
    for (const p of m.parts) moving.add(p.object);

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
    // Keep the building and neighbours present while the camera approaches.
    m.root.visible = true; m.alpha = 1;
    const installing = active && clock.mode === 'install';
    if (m.contextSlabs) m.contextSlabs.visible = false; // factory already supplies these slabs
    if (m.routeGroup) m.routeGroup.visible = !active && m.record.id === SYSTEMS[m.id].default;
    if (m.upper) m.upper.visible = !active && m.id !== 'bundle' && !m.assembly?.isFloor;
    const constructionTime = installing ? t : m.id==='duct'?0:SYSTEMS[m.id].duration;
    for (const p of m.parts) {
      const partTime = p.face < 0 ? SYSTEMS[m.id].duration : constructionTime;
      const r = ramp(partTime,p.start,p.end);
      p.object.visible = p.face < 0 ? !installing || t >= SYSTEMS[m.id].duration : partTime >= p.start;
      p.object.position.copy(p.home).addScaledVector(p.offset,1-r);
      p.update?.(partTime,installing);
    }
    if (m.id === 'firewall') m.rear.visible = !installing || t >= SYSTEMS.firewall.duration;
  }
  function frameScene() {
    for (const id of ids) modelState(models[id],clock.elapsed,id===clock.selected);
    architecture.visible = true;
    const floorCutaway=models[clock.selected]?.assembly?.isFloor?clock.selected:null;
    architecture.traverse(object=>{if(object.userData.contextSlab)object.visible=object.userData.workBay!==floorCutaway;});
    siteContext.terrain.visible = true;
    const nextShadowState=ids.map(id=>models[id].record?.id||id).join(':')+`:${clock.selected}:${transition>=1}:${clock.elapsed>=clock.duration}`;
    if(nextShadowState!==shadowState){renderer.shadowMap.needsUpdate=true;shadowState=nextShadowState;}
    camera.lookAt(target);
    renderer.render(scene,camera);
  }
  function floorSide() {
    const a=models[clock.selected]?.assembly;
    if(!a?.isFloor)return 0;
    const timing=SYSTEMS[clock.selected].timing;
    const index=timing?.steps.findIndex(slot=>clock.elapsed>=slot.start&&clock.elapsed<slot.end);
    const step=clock.mode==='install'?a.record.steps[index]:null;
    return (step?.faces||a.record.geometry.faces).every(face=>face<0)?-1:1;
  }
  function destination() {
    if (clock.selected) {
      const model = models[clock.selected], base = model.root.position.y;
      const baseX = model.root.position.x;
      if (model.assembly) {
        const fit=fitInstallation(T,model.assembly,camera,floorSide()<0?-1:1);
        toTarget.copy(fit.target);toPosition.copy(fit.position);
        return;
      }
      const poses = {
        metal: [[1.65, 2.3, 2.55], [0, CY, -.3]],
        polymer: [[.85, 1.96, 1.6], [0, CY, -.42]],
        duct: [[3.2, 2.4, 5.3], [0, CY, -.25]],
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
    const components = {}; let fireObjects=0,damperObjects=0;
    scene.traverse(o=>{if(o.material?.isShaderMaterial&&o.material.uniforms?.uStrength)fireObjects++;if(o.userData.component?.startsWith('damper-'))damperObjects++;});
    scene.traverse(o => { const key = o.userData.component; if (key) components[key] = (components[key] || 0) + 1; });
    return {
      ...clock, drawCalls: renderer.info.render.calls, visible, transition, transitionSeconds, camera: camera.position.toArray(), target: target.toArray(), reduced: reduce.matches,
      components, factory: { storeys: 2, width: FACTORY.width, level: LEVEL, routes: Object.fromEntries(ids.filter(id => models[id].route).map(id => [id, models[id].route])) },
      routeVisibility: Object.fromEntries(ids.filter(id => models[id].routeGroup).map(id => [id, models[id].root.visible && models[id].routeGroup.visible])),
      visibleFloors: ids.filter(id => models[id].root.visible),
      floors: ids.map(id => ({ id, floor: SYSTEMS[id].floor, y: models[id].root.position.y, parts: models[id].parts.length,
        installed: models[id].parts.filter(p => p.object.visible).length })),
      certificates: Object.fromEntries(ids.filter(id=>models[id].record).map(id=>[id,models[id].record.id])),
      assemblies: Object.fromEntries(ids.filter(id=>models[id].assembly).map(id=>[id,{orientation:models[id].assembly.isFloor?'floor':'wall',pipes:models[id].pipes.length,pipeVisible:models[id].pipes.every(p=>p.visible),layers:models[id].assembly.blanketLayer,existingInsulation:models[id].assembly.existingInsulation,workBounds:Object.fromEntries(Object.entries(models[id].assembly.workBounds).map(([side,box])=>[side,{min:box.min.toArray(),max:box.max.toArray()}]))}])),
      architectureVisible:architecture.visible, terrainVisible:siteContext.terrain.visible,
      cutawayBay:models[clock.selected]?.assembly?.isFloor?clock.selected:null,
      polymer: {pipeVisible:models.polymer.pipes.every(p=>p.visible)},
      fireObjects, damperObjects,
      wallsOpaque: ids.filter(id => models[id].wall).every(id => models[id].wall.material.opacity === 1 && !models[id].wall.material.transparent),
      construction: Object.fromEntries(ids.map(id=>[id,models[id].parts.filter(p=>['board-half','board-piece','jacket-clamp','sealant-pass'].includes(p.object.userData.component)).map(p=>({component:p.object.userData.component,half:p.object.userData.half,face:p.object.userData.workFace,visible:p.object.visible,offset:p.object.position.clone().sub(p.home).toArray(),progress:p.object.userData.progress,openAngle:p.object.userData.openAngle,latched:p.object.userData.latched,toolVisible:p.object.userData.toolVisible,nozzle:p.object.userData.nozzle}))])),
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
    // Show the underside while installing a lower jacket, then return above for
    // the upper insulation. The camera stays outside the front slab edge.
    const nextSide=floorSide();
    if(transition>=1&&nextSide!==cameraSide){
      fromPosition.copy(camera.position);fromTarget.copy(target);destination();
      cameraSide=nextSide;transition=0;transitionSeconds=1.2;
    }
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
    clock.elapsed = mode === 'install' && reduce.matches && id!=='duct' ? clock.duration : elapsed;
    fromPosition.copy(camera.position); fromTarget.copy(target); destination(); cameraSide=floorSide();transition = 0; transitionSeconds = mode === 'preview' || !id ? 1.2 : .65;
    if (reduce.matches) { camera.position.copy(toPosition); target.copy(toTarget); transition = 1; }
    frameScene(); emit(); resume();
  }
  function select(id) { previewReturn = null; if(id && SYSTEMS[id]?.record) { setAssembly(models[id],SYSTEMS[id].record); batchStatic(models[id].root); } moveTo(id, id ? 'install' : 'overview'); }
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
    destination();cameraSide=floorSide();
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
