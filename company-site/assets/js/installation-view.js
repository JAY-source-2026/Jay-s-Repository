// Fit the installation envelope, including approaching parts and tools, rather
// than estimating the camera from the penetration diameter alone.
export function applyAssemblyTime(parts, time, installing = true) {
  for (const part of parts) {
    const x = Math.max(0, Math.min(1, (time - part.start) / (part.end - part.start)));
    const eased = x * x * (3 - 2 * x);
    part.object.visible = time >= part.start;
    part.object.position.copy(part.home).addScaledVector(part.offset, 1 - eased);
    part.update?.(time, installing);
  }
}

export function measureWork(T, root, work, parts, timing) {
  const front = new T.Box3(), back = new T.Box3();
  const local = new T.Matrix4(), inverse = new T.Matrix4(), bounds = new T.Box3();
  for (const slot of timing.steps) for (const progress of [0, .2, .5, .8, .999]) {
    applyAssemblyTime(parts, slot.start + slot.duration * progress);
    root.updateWorldMatrix(true, true); inverse.copy(root.matrixWorld).invert();
    work.traverseVisible(object => {
      if (!object.isMesh) return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      local.multiplyMatrices(inverse, object.matrixWorld);
      bounds.copy(object.geometry.boundingBox).applyMatrix4(local);
      if (bounds.max.z >= 0) {
        const clipped = bounds.clone(); clipped.min.z = Math.max(0, clipped.min.z); front.union(clipped);
      }
      if (bounds.min.z <= 0) {
        const clipped = bounds.clone(); clipped.max.z = Math.min(0, clipped.max.z); back.union(clipped);
      }
    });
  }
  applyAssemblyTime(parts, 0, false);
  for (const box of [front, back]) if (!box.isEmpty()) box.expandByScalar(.035);
  return { front, back };
}

export function fitInstallation(T, assembly, camera, side = 1) {
  const span = assembly.viewSpan;
  assembly.root.updateWorldMatrix(true, false);
  const origin = new T.Vector3().setFromMatrixPosition(assembly.root.matrixWorld);
  const offset = assembly.isFloor
    ? new T.Vector3(span * .65, side < 0 ? -.9 : span * 1.3, Math.max(2.15, span * 1.1))
    : new T.Vector3(span * .85, span * .4, span * 1.8);
  offset.multiplyScalar(Math.max(1, 1.35 / camera.aspect));
  const direction = offset.clone().normalize();
  const bounds = assembly.workBounds[side < 0 ? 'back' : 'front'].clone();
  if (bounds.isEmpty()) return { target: origin, position: origin.clone().add(offset), bounds };
  bounds.applyMatrix4(assembly.root.matrixWorld);
  if (!assembly.isFloor && assembly.record.category === 'metal' && assembly.maxDiameter <= .061 && assembly.workLength <= .15) {
    return { target: origin, position: origin.clone().add(offset), bounds, preservedSmall: true };
  }
  const right = new T.Vector3().crossVectors(camera.up, direction).normalize();
  const up = new T.Vector3().crossVectors(direction, right).normalize();
  const tanV = Math.tan(T.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect;
  const target = origin.clone();
  // Preserve the familiar close view for small, short installations.
  if (assembly.workLength > .65 || assembly.maxDiameter > .15 || assembly.record.category === 'duct') bounds.getCenter(target);
  let distance = offset.length();
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const corner = new T.Vector3(x, y, z).sub(target);
    distance = Math.max(distance, corner.dot(direction) + Math.max(Math.abs(corner.dot(right)) / (tanH * .86), Math.abs(corner.dot(up)) / (tanV * .84)));
  }
  return { target, position: target.clone().addScaledVector(direction, distance), bounds };
}
