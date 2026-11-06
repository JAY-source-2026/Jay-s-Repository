// Two-storey industrial cutaway, inspired by the supplied assets/자료/image.png.
// Routes and slab openings show spatial relationships, not a certified floor detail.
export const FACTORY = {
  level: 3.3, width: 27.2, depth: 7.2,
  bays: {
    metal: { x: -7.8, width: 4.2 },
    polymer: { x: -3.6, width: 4.2 },
    duct: { x: 1.2, width: 5.4 },
    bundle: { x: 7, width: 6.2 },
  },
};

export function buildFactory({ T, scene, models, box, mesh, group, mat, concrete, cladding, steel, zinc, frameMetal, glass, pvc, WALL_Z, CY }) {
  const architecture = group(scene);
  architecture.userData.component = 'two-storey-factory';
  const roofY = FACTORY.level * 2;
  const panel = mat('#d5dce2', .6, .32), blueGlass = glass.clone();
  blueGlass.color.set('#497d9d'); blueGlass.opacity = .78;
  const darkPanel = mat('#4b657c', .55, .35);

  function slab(parent, x, width, y, withOpenings = false) {
    const shape = new T.Shape();
    shape.moveTo(x - width / 2, -3.6); shape.lineTo(x + width / 2, -3.6);
    shape.lineTo(x + width / 2, 3.6); shape.lineTo(x - width / 2, 3.6); shape.closePath();
    if (withOpenings) {
      for (const id of ['metal', 'polymer', 'duct']) {
        const bx = FACTORY.bays[id].x;
        if (bx < x - width / 2 || bx > x + width / 2) continue;
        const hole = new T.Path(), z = id === 'duct' ? 1.9 : 1.6;
        if (id === 'duct') {
          hole.moveTo(bx - 1.38, -z - .42); hole.lineTo(bx - 1.38, -z + .42);
          hole.lineTo(bx + 1.38, -z + .42); hole.lineTo(bx + 1.38, -z - .42); hole.closePath();
        } else hole.absarc(bx, -z, id === 'metal' ? .29 : .21, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
    }
    const floor = mesh(new T.ExtrudeGeometry(shape, { depth: .22, bevelEnabled: false, curveSegments: 32 }), concrete, parent, 0, y, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.userData.component = withOpenings ? 'slab-with-service-openings' : 'factory-slab';
    return floor;
  }
  // Independent strips allow a floor installation's own slab to remain visible
  // without the architectural floors above it obscuring the work.
  function floorStrips(y,withOpenings=false,extra=0){
    let left=-FACTORY.width/2-extra;
    for(const [id,bay]of Object.entries(FACTORY.bays)){
      const start=bay.x-bay.width/2;
      if(start>left+.001)slab(architecture,(left+start)/2,start-left,y,withOpenings);
      const floor=slab(architecture,bay.x,bay.width,y,withOpenings);
      floor.userData.contextSlab=true;floor.userData.workBay=id;
      left=bay.x+bay.width/2;
    }
    const right=FACTORY.width/2+extra;
    if(right>left)slab(architecture,(left+right)/2,right-left,y,withOpenings);
  }
  floorStrips(-.22);
  floorStrips(FACTORY.level-.22,true);
  floorStrips(roofY-.22,false,.125);
  box(FACTORY.width + .4, .18, 7.7, concrete, architecture, 0, -.36, 0);
  // A silver panel shell and a glazed corner follow the massing of the reference.
  for (let i = 0; i < 23; i++) {
    const x = -13.05 + i * 1.18;
    box(1.16, 6.45, .14, i % 4 ? panel : cladding, architecture, x, 3.225, -3.5);
    for (let y = .2; y < 6.4; y += .23) box(1.15, .008, .012, zinc, architecture, x, y, -3.418);
  }
  // End elevation with narrow horizontal window bands and panel joints.
  for (const x of [-13.5, 13.5]) {
    box(.16, roofY, 7.05, panel, architecture, x, roofY / 2, 0);
    for (const y of [1.65, 4.95]) {
      const pane = box(.022, 1.12, 6.4, blueGlass, architecture, x + Math.sign(x) * .1, y, 0);
      pane.castShadow = false;
      for (let z = -3.2; z <= 3.2; z += .8) box(.04, 1.16, .035, frameMetal, architecture, x + Math.sign(x) * .12, y, z);
    }
  }
  // Retained facade wings frame the open central cutaway.
  for (const [x, width] of [[-11.8, 3.2], [11.85, 3.1]]) {
    box(width, roofY - .2, .12, x < 0 ? darkPanel : panel, architecture, x, roofY / 2, 3.5);
    if (x < 0) {
      const pane = box(width - .12, 6.12, .035, blueGlass, architecture, x, 3.2, 3.59); pane.castShadow = false;
      for (let y = .3; y < roofY; y += .55) box(width, .025, .06, frameMetal, architecture, x, y, 3.62);
      for (let dx = -1.4; dx <= 1.4; dx += .4) box(.022, 6.3, .06, frameMetal, architecture, x + dx, 3.2, 3.62);
    } else {
      for (const [dx, color, y, h] of [[-.8, '#b92335', 4.55, 2.45], [.0, '#f0f0df', 4.55, 2.45], [.63, '#257aa9', 4.55, 2.45], [-.8, '#c8d573', 2.95, .55]]) {
        box(.64, h, .035, mat(color, .6, .15), architecture, x + dx, y, 3.59);
      }
    }
  }
  for (const x of [-10.05, -5.7, -1.5, 3.9, 10.15]) {
    box(.22, roofY, .24, concrete, architecture, x, roofY / 2, -.55);
    box(.22, roofY, .24, concrete, architecture, x, roofY / 2, -3.22);
  }
  for (const y of [FACTORY.level, roofY]) {
    let left=-FACTORY.width/2;
    const frontBeam=(x,width,id)=>{
      for(const [height,dy,depth,material]of [[.2,-.11,.12,panel],[.035,.025,.14,frameMetal]]){
        const beam=box(width,height,depth,material,architecture,x,y+dy,3.55);
        if(id){beam.userData.component='front-floor-beam';beam.userData.contextSlab=true;beam.userData.workBay=id;}
      }
    };
    for(const [id,bay]of Object.entries(FACTORY.bays)){
      const start=bay.x-bay.width/2;
      if(start>left)frontBeam((left+start)/2,start-left);
      frontBeam(bay.x,bay.width,id);left=bay.x+bay.width/2;
    }
    const right=FACTORY.width/2;if(right>left)frontBeam((left+right)/2,right-left);
  }
  // Low roof parapet, repeated air-handling units and an unobstructed cutaway.
  for (const z of [-3.56, 3.56]) {
    box(FACTORY.width + .25, .36, .13, panel, architecture, 0, roofY + .12, z);
    box(FACTORY.width + .32, .035, .2, frameMetal, architecture, 0, roofY + .315, z);
  }
  for (const x of [-13.64, 13.64]) box(.15, .36, 7.2, panel, architecture, x, roofY + .12, 0);
  for (const x of [-9, -4.5, 0, 4.5, 9]) {
    const unit = group(architecture, x, roofY + .55, -.65);
    box(2.65, .8, 1.6, zinc, unit);
    box(2.8, .06, 1.75, frameMetal, unit, 0, .43, 0);
    for (let y = -.28; y <= .28; y += .11) box(2.4, .035, .025, frameMetal, unit, 0, y, .82);
    for (const dx of [-.65, .65]) {
      const fan = mesh(new T.CylinderGeometry(.39, .39, .035, 24), frameMetal, unit, dx, .48, 0);
      fan.userData.component = 'roof-ventilation';
    }
  }

  return architecture;
}
