// A cartridge nozzle follows the very same curves used to draw the sealant bead.
// Paths are local to the work face, so wall and underside installations agree.
export function caulkingPass({ T, parent, paths, materials, start, end, face = 1, scale = 1, owned }) {
  const root = new T.Group(); parent.add(root); root.userData.component = 'sealant-pass';
  const add = (geometry, material, owner = root) => {
    owned?.add(geometry);
    const object = new T.Mesh(geometry, material); owner.add(object);
    object.castShadow = false; object.receiveShadow = false; return object;
  };
  const strokes = paths.map(points => {
    const curve = new T.CurvePath();
    for (let i = 1; i < points.length; i++) curve.add(new T.LineCurve3(points[i - 1], points[i]));
    const length = curve.getLength(), segments = Math.max(12, Math.ceil(length / .012));
    const bead = add(new T.TubeGeometry(curve, segments, .0045, 6, false), materials.whiteSeal);
    bead.userData.component = 'sealant-bead';
    return { curve, length, bead, segments };
  });
  const total = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
  const tool = new T.Group(); root.add(tool); tool.userData.component = 'sealant-cartridge';
  tool.scale.setScalar(scale);
  const cylinder = (r1, r2, height, y, material) => {
    const object = add(new T.CylinderGeometry(r1, r2, height, 32), material, tool);
    object.position.y = y; return object;
  };
  // Tip at the origin; the white cartridge and blue DOENC label sit behind it.
  cylinder(.012, .0014, .085, .0425, materials.cartridgeWhite);
  cylinder(.017, .017, .02, .095, materials.cartridgeWhite);
  cylinder(.027, .027, .235, .2225, materials.cartridgeWhite);
  cylinder(.0272, .0272, .184, .2225, materials.cartridgeLabel);
  cylinder(.029, .029, .008, .344, materials.steel);
  cylinder(.003, .003, .12, .408, materials.steel);
  const grip = add(new T.BoxGeometry(.022, .09, .035), materials.gun, tool);
  grip.position.set(0, .31, -.052); grip.rotation.x = -.3;
  const trigger = add(new T.BoxGeometry(.009, .065, .009), materials.steel, tool);
  trigger.position.set(0, .27, -.04); trigger.rotation.x = -.45;
  const cradle = add(new T.BoxGeometry(.045, .21, .012), materials.gun, tool);
  cradle.position.set(0, .222, -.029);
  tool.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(-1.1, .85, face * .65).normalize());
  function update(time, installing) {
    const progress = Math.max(0, Math.min(1, (time - start) / (end - start)));
    const distance = total * progress;
    let offset = 0, position;
    strokes.forEach(stroke => {
      const local = Math.max(0, Math.min(1, (distance - offset) / stroke.length));
      stroke.bead.geometry.setDrawRange(0, Math.floor(stroke.segments * local) * 6 * 6);
      stroke.bead.visible = local > 0;
      if (!position && distance <= offset + stroke.length) position = stroke.curve.getPointAt(local);
      offset += stroke.length;
    });
    tool.visible = installing && time >= start && time < end;
    if (position) tool.position.copy(position);
    root.userData.progress = progress;
    root.userData.toolVisible = tool.visible;
    root.userData.nozzle = tool.position.toArray();
  }
  update(0, false);
  return { object: root, home: root.position.clone(), offset: new T.Vector3(), start, end, face: 1, update };
}
