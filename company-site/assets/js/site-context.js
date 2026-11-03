// Site scenery follows the supplied utility-tunnel photographs. The wall assembly
// follows FR-WS26-0102-1; doors and cable penetrations are separate contextual items.
export function buildSiteContext({ T, scene, box, mesh, group, mat, animated, concrete, zinc, steel, frameMetal, whiteSeal, textures, groundWidth = 14.2 }) {
  const terrain = group(scene);
  const baseY = -4.95, wallZ = 4.2, width = 6.398, height = 3;
  function batchBoxes(items, material, parent) {
    const instance = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), material, items.length);
    const transform = new T.Object3D();
    items.forEach(([w, h, d, x, y, z], i) => {
      transform.position.set(x, y, z); transform.scale.set(w, h, d); transform.updateMatrix();
      instance.setMatrixAt(i, transform.matrix);
    });
    instance.castShadow = true; instance.receiveShadow = true; parent.add(instance); return instance;
  }
  let seed = 47;
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  function terrainTexture(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = kind === 'soil' ? '#695544' : '#536848'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 10000; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(15,24,12,.13)' : 'rgba(197,178,128,.16)';
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
    }
    if (kind === 'soil') for (let y = 20; y < 256; y += 25 + random() * 22) {
      ctx.fillStyle = 'rgba(38,29,22,.12)'; ctx.fillRect(0, y, 256, 2 + random() * 5);
    }
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping; textures.push(texture); return texture;
  }
  const soilTexture = terrainTexture('soil'), grassTexture = terrainTexture('grass');
  const soil = new T.MeshStandardMaterial({ color: '#aa927b', map: soilTexture, bumpMap: soilTexture, bumpScale: .025, roughness: 1 });
  const grass = new T.MeshStandardMaterial({ color: '#86997a', map: grassTexture, bumpMap: grassTexture, bumpScale: .015, roughness: .98 });
  const cut = new T.Shape();
  cut.moveTo(-groundWidth / 2, -5.45); cut.lineTo(groundWidth / 2, -5.45); cut.lineTo(groundWidth / 2, -.55); cut.lineTo(-groundWidth / 2, -.55); cut.closePath();
  const opening = new T.Path();
  opening.moveTo(-3.5, -4.95); opening.lineTo(-3.5, -1.45); opening.lineTo(3.5, -1.45); opening.lineTo(3.5, -4.95); opening.closePath(); cut.holes.push(opening);
  const earth = mesh(new T.ExtrudeGeometry(cut, { depth: 11.4, bevelEnabled: false }), soil, terrain, 0, 0, -5.2);
  earth.userData.component = 'earth-section';
  box(groundWidth, .09, 11.4, grass, terrain, 0, -.505, .5).userData.component = 'ground-surface';
  const paving = mat('#aaa99c', .9);
  box(groundWidth - 3, .045, 8.4, paving, terrain, -.25, -.443, -.1);
  box(2.1, .045, 2.6, paving, terrain, -.25, -.443, 4.75);
  const joints = [];
  for (let x = -groundWidth / 2 + 1.5; x <= groundWidth / 2 - 1.5; x += .95) joints.push([.012, .004, 7.2, x, -.418, -.1]);
  for (let z = -3.5; z <= 3.5; z += .9) joints.push([groundWidth - 3, .004, .012, -.25, -.418, z]);
  batchBoxes(joints, mat('#71756e', .95), terrain);
  // Modest, irregular canopies sit beside the building rather than obscuring it.
  const bark = mat('#655247', .95);
  const leafMaterials = ['#445a3a', '#62764a', '#7a8759'].map(color => mat(color, .95));
  for (const [x, z, size] of [[-groundWidth / 2 + 1, -3.6, 1], [groundWidth / 2 - 1, -3.5, .95], [-groundWidth / 2 + 1, 3.6, .75], [groundWidth / 2 - 1, 3.5, .82]]) {
    const tree = group(terrain, x, -.46, z); tree.userData.component = 'tree';
    const trunk = mesh(new T.CylinderGeometry(.07, .13, 2.4 * size, 9), bark, tree, 0, 1.2 * size, 0);
    trunk.rotation.z = .05;
    for (let i = 0; i < 8; i++) {
      const leaf = mesh(new T.IcosahedronGeometry((.55 + random() * .25) * size, 2), leafMaterials[i % 3], tree,
        (random() - .5) * 1.45 * size, (2.2 + random() * 1.1) * size, (random() - .5) * 1.35 * size);
      leaf.scale.set(1, .85 + random() * .5, .9); leaf.rotation.set(random(), random(), random());
    }
  }
  for (let i = 0; i < 14; i++) {
    const shrub = mesh(new T.IcosahedronGeometry(.3 + random() * .13, 1), leafMaterials[i % 3], terrain,
      (i % 2 ? -1 : 1) * (groundWidth / 2 - 1.4 + random() * .5), -.2, -2.5 + Math.floor(i / 2) * 1.05);
    shrub.scale.y = .7;
  }

  const root = group(scene, 0, baseY, 0), room = group(root), service = group(root, 0, 0, wallZ);
  const m = { id: 'firewall', root, room, service, parts: [], alpha: 1, animationSide: 1, surfaces: [] };
  root.userData.component = 'utility-tunnel';
  const tunnelConcrete = concrete.clone(); tunnelConcrete.color.set('#aaa99d');
  box(6.98, .24, 11.4, tunnelConcrete, room, 0, -.12, .5);
  box(6.98, .25, 11.4, tunnelConcrete, room, 0, 3.375, .5);
  for (const x of [-3.39, 3.39]) box(.2, 3.25, 11.4, tunnelConcrete, room, x, 1.625, .5);
  const light = new T.MeshStandardMaterial({ color: '#fff7df', emissive: '#ffe4b2', emissiveIntensity: .9 });
  for (const z of [-3.2, -.2, 2.8, 5.5]) {
    box(.17, .055, 1.25, frameMetal, room, 0, 3.21, z);
    box(.12, .025, 1.15, light, room, 0, 3.17, z).castShadow = false;
  }
  const tunnelLight = new T.PointLight('#ffe6c2', 12, 9); tunnelLight.position.set(0, 2.9, 5.1); root.add(tunnelLight);
  // Receding floor joints and an open central passage reveal the tunnel's depth.
  const tunnelDetails = [];
  for (const z of [-3.5, -1.5, .5, 2.5, 4.5]) tunnelDetails.push([6.45, .006, .012, 0, .003, z]);
  batchBoxes(tunnelDetails, frameMetal, room);
  const cableMaterial = mat('#252a2b', .64, .12);
  const cableXs = [-2.88, -2.66, -2.44, 2.44, 2.66, 2.88], cableYs = [.9, 1.5, 2.1];
  const rack = [];
  for (const side of [-1, 1]) {
    for (const z of [-4.2, -2.2, -.2, 1.8, 3.8, 5.8]) {
      rack.push([.055, 2.7, .055, side * 3.18, 1.45, z]);
      for (const y of cableYs) rack.push([.94, .055, .055, side * 2.76, y - .11, z]);
    }
    for (const y of cableYs) {
      rack.push([.045, .07, 11.1, side * 2.3, y - .11, .5]);
      rack.push([.045, .07, 11.1, side * 3.15, y - .11, .5]);
    }
  }
  batchBoxes(rack, zinc, room).userData.component = 'cable-racks';
  const cables = new T.InstancedMesh(new T.CylinderGeometry(.065, .065, 11.1, 12), cableMaterial, cableXs.length * cableYs.length);
  const transform = new T.Object3D(); let cableIndex = 0;
  for (const x of cableXs) for (const y of cableYs) {
    transform.position.set(x, y, .5); transform.rotation.x = Math.PI / 2; transform.updateMatrix(); cables.setMatrixAt(cableIndex++, transform.matrix);
  }
  cables.castShadow = true; cables.receiveShadow = true; room.add(cables);

  // Certified wall: 914 × 600 × 9.84 mm boards on 100 mm C-studs. The centre
  // door and cable openings illustrate the site photos, not an additional rating.
  const runners = group(service);
  const runnerBoxes = [];
  for (const y of [.02, height - .02]) {
    runnerBoxes.push([width, .0008, .102, 0, y, 0]);
    for (const z of [-.0506, .0506]) runnerBoxes.push([width, .04, .0008, 0, y, z]);
  }
  const runnerMesh = batchBoxes(runnerBoxes, zinc, runners); runnerMesh.userData.component = 'firewall-runner'; runnerMesh.castShadow = false;
  animated(m, runners, 1, 2.8, [0, 0, .28]);
  const studXs = [-width / 2];
  for (let col = 0; col < 7; col++) {
    const x = -width / 2 + col * .914;
    studXs.push(x + .3, x + .614, x + .914);
  }
  studXs.forEach((x, index) => {
    const overDoor = Math.abs(x) < .457 - .001, h = overDoor ? .6 : height;
    const stud = group(service, x, overDoor ? 2.7 : 1.5, 0);
    batchBoxes([[.0008, h, .1, 0, 0, 0], [.045, h, .0008, .022, 0, -.0496], [.045, h, .0008, .022, 0, .0496]], zinc, stud).castShadow = false;
    stud.userData.component = 'firewall-stud';
    animated(m, stud, 3 + index * .065, 4 + index * .065, [0, .12, .22]);
  });
  const braces = group(service), braceBoxes = [];
  for (const y of [.6, 1.2, 1.8, 2.4]) for (let i = 0; i < studXs.length - 1; i++) {
    const x = (studXs[i] + studXs[i + 1]) / 2, w = studXs[i + 1] - studXs[i] + .04;
    if (Math.abs(x) < .457 && y < 2.4) continue;
    braceBoxes.push([w, .0008, .102, x, y, 0]);
    for (const z of [-.0506, .0506]) braceBoxes.push([w, .04, .0008, x, y - .02, z]);
  }
  const braceMesh = batchBoxes(braceBoxes, zinc, braces); braceMesh.userData.component = 'firewall-bracing'; braceMesh.castShadow = false;
  animated(m, braces, 5.5, 7, [0, .14, .18]);
  const boardMaterial = new T.MeshStandardMaterial({ color: '#e5e2d9', metalness: .25, roughness: .42 });
  m.rear = group(service); m.frontBoards = [];
  let panelIndex = 0;
  const fixingPositions = [];
  for (let row = 4; row >= 0; row--) for (let col = 0; col < 7; col++) {
    if (col === 3 && row < 4) continue;
    const cx = (col - 3) * .914, cy = row * .6 + .3;
    const shape = new T.Shape();
    shape.moveTo(-.457, -.3); shape.lineTo(.457, -.3); shape.lineTo(.457, .3); shape.lineTo(-.457, .3); shape.closePath();
    for (const x of cableXs) for (const y of cableYs) {
      if (Math.abs(x - cx) < .38 && Math.abs(y - cy) < .22) {
        const hole = new T.Path(); hole.absarc(x - cx, y - cy, .075, 0, Math.PI * 2, true); shape.holes.push(hole);
      }
    }
    const geometry = new T.ExtrudeGeometry(shape, { depth: .00984, bevelEnabled: false, curveSegments: 16 });
    const front = mesh(geometry, boardMaterial, service, cx, cy, .05);
    // Sub-centimetre panels and the frame occupy nearly the same shadow texel.
    // Keep their physical lighting, without false stud shadows on the outer skin.
    front.castShadow = false; front.receiveShadow = false;
    front.userData.component = 'firewall-board'; front.userData.row = row; front.userData.column = col;
    const rear = mesh(geometry, boardMaterial, m.rear, cx, cy, -.05984); rear.userData.component = 'firewall-board'; rear.castShadow = false; rear.receiveShadow = false;
    const start = 7.5 + panelIndex * .18;
    animated(m, front, start, start + .8, [0, .16, .55]); m.frontBoards.push(front); panelIndex++;
    for (let i = 0; i <= 7; i++) for (const dy of [-.293, .293]) fixingPositions.push([cx - .448 + i * .128, cy + dy, .064]);
    for (let i = 1; i <= 3; i++) for (const dx of [-.448, .448]) fixingPositions.push([cx + dx, cy - .293 + i * .1465, .064]);
  }
  const fixings = group(service);
  const screws = new T.InstancedMesh(new T.CylinderGeometry(.0045, .0045, .004, 6), steel, fixingPositions.length);
  fixingPositions.forEach(([x, y, z], index) => {
    transform.position.set(x, y, z); transform.rotation.x = Math.PI / 2; transform.updateMatrix(); screws.setMatrixAt(index, transform.matrix);
  });
  screws.receiveShadow = true; fixings.add(screws); animated(m, fixings, 14.5, 16, [0, 0, .06]);
  const seams = group(service), seamBoxes = [];
  for (let col = 0; col <= 7; col++) {
    const x = (col - 3.5) * .914;
    seamBoxes.push([.015, 3, .004, x, 1.5, .063]);
  }
  for (let row = 0; row <= 5; row++) {
    const y = row * .6;
    if (row >= 4) seamBoxes.push([width, .015, .004, 0, y, .063]);
    else for (const side of [-1, 1]) seamBoxes.push([2.742, .015, .004, side * 1.828, y, .063]);
  }
  batchBoxes(seamBoxes, whiteSeal, seams).castShadow = false;
  animated(m, seams, 16.5, 19.8);
  // Photo-based metal door is separate from the certified board assembly.
  const door = group(service);
  for (const x of [-.467, .467]) box(.055, 2.42, .16, frameMetal, door, x, 1.21, 0);
  box(.99, .06, .16, frameMetal, door, 0, 2.42, 0);
  const hinge = group(door, -.44, 0, .07); hinge.rotation.y = 1.28;
  box(.86, 2.34, .045, zinc, hinge, .43, 1.19, 0);
  box(.025, .13, .05, steel, hinge, .76, 1.15, .04);
  door.userData.component = 'context-door';
  root.traverse(o => { if (o.isMesh) { o.userData.castsShadow = o.castShadow; m.surfaces.push(o); } });
  return { terrain, model: m, baseY, wallZ, studXs, boardSize: [.914, .6, .00984], wallThickness: .11968 };
}
