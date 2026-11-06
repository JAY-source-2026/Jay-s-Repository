// A wire is fed around the insulation, pulled snug, then its two ends twist.
// Dimensions and motion are illustrative; the linked certificate is authoritative.
export function wirePositions(segments, text) {
  if (!segments.length) return [];
  const from = Math.min(...segments.map(s => s.from));
  const to = Math.max(...segments.map(s => s.to));
  const length = to - from, compact = text.replace(/\s/g, '');
  const centerOnly = compact.includes('중앙') && !compact.includes('100');
  const inset = Math.min(.1, length / 2);
  let positions = centerOnly || length <= .24 ? [(from + to) / 2] : [from + inset, to - inset];
  const spacing = compact.match(/간격(?:은)?(\d+)[㎜m]/) || compact.match(/(\d+)[㎜m](?:m)?이하간격/);
  if (spacing && positions.length > 1) {
    const count = Math.ceil((positions[1] - positions[0]) / (Number(spacing[1]) / 1000));
    positions = Array.from({length: count + 1}, (_, i) => positions[0] + (positions[1] - positions[0]) * i / count);
  }
  return positions.flatMap(distance => {
    const covering = segments.filter(s => distance >= s.from - .0001 && distance <= s.to + .0001);
    const outer = covering.sort((a, b) => b.radius - a.radius)[0];
    return outer ? [{distance, radius: outer.radius, width: outer.width, height: outer.height, from, to}] : [];
  });
}

export function windingWire({T, parent, radius, width, height, x, z, face, start, end, material, owned}) {
  const root = new T.Group(); parent.add(root); root.position.set(x, 0, z);
  root.userData.component = 'winding-wire'; root.userData.workFace = face;
  const home = root.position.clone(), wireRadius = .0011, R = radius + .003;
  const count = 128, sides = 6, angle0 = .8;
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  let rectangle;
  if (width && height) {
    const w = width / 2 + .003, h = height / 2 + .003, c = .012;
    rectangle = new T.Path(); rectangle.moveTo(w - c, h);
    rectangle.lineTo(-w + c, h); rectangle.quadraticCurveTo(-w, h, -w, h - c);
    rectangle.lineTo(-w, -h + c); rectangle.quadraticCurveTo(-w, -h, -w + c, -h);
    rectangle.lineTo(w - c, -h); rectangle.quadraticCurveTo(w, -h, w, -h + c);
    rectangle.lineTo(w, h - c); rectangle.quadraticCurveTo(w, h, w - c, h);
  }
  const around = u => {
    if (rectangle) { const p = rectangle.getPointAt(u); return new T.Vector3(p.x, p.y, .003 * (u - .5)); }
    const angle = angle0 + Math.PI * 2 * u;
    const r = R + .00035 * Math.sin(angle * 5);
    return new T.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, .003 * (u - .5));
  };
  function tube(points, segments, component) {
    const curve = new T.CatmullRomCurve3(points);
    const geometry = new T.TubeGeometry(curve, segments, wireRadius, sides, false);
    owned.add(geometry);
    const mesh = new T.Mesh(geometry, material); mesh.userData.component = component;
    mesh.castShadow = false; mesh.receiveShadow = true; root.add(mesh); return mesh;
  }
  const wrap = tube(Array.from({length: count + 1}, (_, i) => around(i / count)), count, 'wire-wrapped-length');
  const initialTail = Array.from({length: 25}, (_, i) => new T.Vector3(R + i * .006, 0, 0));
  const feed = tube(initialTail, 24, 'wire-free-end');
  const anchor = tube(initialTail, 24, 'wire-anchor-end');
  const tangent = new T.Vector3(), normal = new T.Vector3(), binormal = new T.Vector3();
  const axis = new T.Vector3(0, 0, 1);
  function deform(mesh, points) {
    const geometry = mesh.geometry, pos = geometry.attributes.position, normals = geometry.attributes.normal;
    for (let i = 0; i < points.length; i++) {
      tangent.subVectors(points[Math.min(i + 1, points.length - 1)], points[Math.max(0, i - 1)]).normalize();
      normal.crossVectors(tangent, axis).normalize(); binormal.crossVectors(tangent, normal).normalize();
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), index = i * (sides + 1) + j;
        const nx = normal.x * c + binormal.x * s, ny = normal.y * c + binormal.y * s, nz = normal.z * c + binormal.z * s;
        pos.setXYZ(index, points[i].x + wireRadius * nx, points[i].y + wireRadius * ny, points[i].z + wireRadius * nz);
        normals.setXYZ(index, nx, ny, nz);
      }
    }
    pos.needsUpdate = true; normals.needsUpdate = true;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  }
  let previous = -1;
  function update(time) {
    const p = clamp((time - start) / (end - start));
    if (p === previous) return; previous = p;
    const winding = smooth(p / .73), twist = smooth((p - .77) / .23);
    const completed = Math.floor(winding * count), u = completed / count;
    wrap.geometry.setDrawRange(0, completed * sides * 6);
    const contact = around(u);
    const direction = around(Math.min(1, u + .0001)).sub(around(Math.max(0, u - .0001))); direction.z = 0; direction.normalize();
    const outward = new T.Vector3(direction.y, -direction.x, 0);
    const tieDirection = around(0); tieDirection.z = 0; tieDirection.normalize();
    const tailLength = .026 + Math.min(.23, .10 + radius * .55) * (1 - smooth((p - .58) / .22));
    const feedPoints = [], anchorPoints = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, turn = t * Math.PI * 5 * twist;
      const radial = tieDirection.y, radialX = tieDirection.x;
      const helix = .0015 * (1 - t * .2);
      // The loose end follows the winding tip tangentially, then joins the tie.
      const loose = contact.clone().addScaledVector(direction, tailLength * t);
      loose.addScaledVector(outward, tailLength * .36 * t * t);
      const endA = around(0), endB = around(1);
      const tie = (point, theta) => {
        point.add(new T.Vector3(radialX, radial, 0).multiplyScalar(.026 * t))
          .add(new T.Vector3(-radial, radialX, 0).multiplyScalar(helix * Math.sin(theta)));
        point.z = helix * Math.cos(theta); return point;
      };
      const snug = smooth((p - .73) / .08);
      feedPoints.push(loose.lerp(tie(endB, turn), snug));
      anchorPoints.push(tie(endA, turn + Math.PI));
    }
    deform(feed, feedPoints); deform(anchor, anchorPoints);
    root.userData.progress = p; root.userData.wrapped = u;
    root.userData.twisted = twist; root.userData.freeEnd = feedPoints.at(-1).toArray();
  }
  update(0);
  return {object: root, home, offset: new T.Vector3(), start, end, face: 1, update};
}
