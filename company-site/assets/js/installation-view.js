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

export function measureWork(T, root, work, parts, timing, viewPoints = null) {
  const front = new T.Box3(), back = new T.Box3();
  const local = new T.Matrix4(), inverse = new T.Matrix4(), bounds = new T.Box3();
  for (const slot of timing.steps) for (const progress of (viewPoints?[0,.125,.25,.375,.5,.625,.75,.875,.999]:[0,.2,.5,.8,.999])) {
    applyAssemblyTime(parts, slot.start + slot.duration * progress);
    root.updateWorldMatrix(true, true); inverse.copy(root.matrixWorld).invert();
    work.traverseVisible(object => {
      if (!object.isMesh) return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      local.multiplyMatrices(inverse, object.matrixWorld);
      bounds.copy(object.geometry.boundingBox).applyMatrix4(local);
      if(viewPoints)for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])viewPoints.push(new T.Vector3(x,y,z));
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
  const jacketView=!assembly.isFloor&&assembly.record.steps.some(step=>step.kind==='jacket');
  const ductView=assembly.record.category==='duct';
  assembly.root.updateWorldMatrix(true, false);
  const origin = new T.Vector3().setFromMatrixPosition(assembly.root.matrixWorld);
  const offset = ductView ? (assembly.isFloor ? new T.Vector3(.7,.15,2) : new T.Vector3(1,.22,.7)) : assembly.isFloor
    ? new T.Vector3(span * .7, span * .15, Math.max(4.2, span * 2))
    : jacketView?new T.Vector3(span*1.2,span*.55,span*1.4):new T.Vector3(span * .85, span * .4, span * 1.8);
  offset.multiplyScalar(Math.max(1, 1.35 / camera.aspect));
  const direction = offset.clone().normalize();
  const bounds = assembly.workBounds[side < 0 ? 'back' : 'front'].clone();
  if(ductView){
    if(assembly.isFloor)bounds.union(assembly.workBounds.back);
    // Include the ends of the floor duct's full-length base insulation.
    // Wall ducts keep the installation centered, as with continuous pipes.
    if(assembly.isFloor){
      bounds.expandByPoint(new T.Vector3(-1.301,-.326,assembly.serviceEnds.back));
      bounds.expandByPoint(new T.Vector3(1.301,.326,assembly.serviceEnds.front));
    }
  }else if(assembly.isFloor){
    bounds.union(assembly.workBounds.front).union(assembly.workBounds.back);
    // Include space on both sides even when this certificate works on one face.
    bounds.expandByPoint(new T.Vector3(-.45,-.3,-.7));
    bounds.expandByPoint(new T.Vector3(.45,.3,.7));
    if(assembly.sectionSlab){
      assembly.sectionSlab.geometry.computeBoundingBox();
      bounds.union(assembly.sectionSlab.geometry.boundingBox.clone().translate(assembly.sectionSlab.position));
    }
  }
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
  if (jacketView || assembly.isFloor || assembly.workLength > .65 || assembly.maxDiameter > .15 || assembly.record.category === 'duct') bounds.getCenter(target);
  // Small collars need their own work envelope; a fixed 0.8m minimum made
  // the actual hooks and slotted brackets too small to read.
  let distance = jacketView||ductView?0:offset.length();
  const points=[];
  if(ductView){
    // Fit the actual sampled parts rather than empty corners of a large box.
    for(const p of assembly.viewPoints)if(assembly.isFloor||p.z>=0)points.push(p.clone().applyMatrix4(assembly.root.matrixWorld));
    if(assembly.isFloor)for(const x of [-1.301,1.301])for(const y of [-.326,.326])for(const z of [assembly.serviceEnds.back,assembly.serviceEnds.front])points.push(new T.Vector3(x,y,z).applyMatrix4(assembly.root.matrixWorld));
  }else for (const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new T.Vector3(x,y,z));
  for (const point of points) {
    const corner = point.sub(target);
    distance = Math.max(distance, corner.dot(direction) + Math.max(Math.abs(corner.dot(right)) / (tanH * .86), Math.abs(corner.dot(up)) / (tanV * .84)));
  }
  return { target, position: target.clone().addScaledVector(direction, distance), bounds };
}
