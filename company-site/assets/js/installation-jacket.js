// SFBA-200 product photos and certificate detail drawings; SYSTEM-SOURCES.md.
// Metres. Panel counts and the bend path illustrate the photographed folded shell.
export function jacketProfile(diameterMm) {
  const rows=[
    [60,50,32,8,1,.6,2,40,21,1.5,1,0,12],
    [114,100,42,10,1,.6,4,40,21,1.5,2,0,16],
    [165,150,62,8,2,.6,4,40,21,1.5,2,0,16],
    [216,200,132,12,2,1,12,60,29.5,2,3,2,24],
    [267,250,132,12,2,1,12,60,29.5,2,3,2,24],
  ];
  const p=rows.find(p=>Math.abs(p[0]-diameterMm)<1);
  if(!p)throw new Error(`Missing sourced SFBA-200 dimensions: ${diameterMm} mm`);
  const [diameter,nominal,width,layer,layers,shell,brackets,foot,height,plate,hooks,wingBolts,panels]=p;
  return {diameter,nominal,depth:width/1000,layer:layer/1000,layers,shell:shell/1000,brackets,
    foot:foot/1000,height:height/1000,plate:plate/1000,bracketWidth:.0298,hooks,wingBolts,panels};
}
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const phase=(p,a,b)=>smooth((p-a)/(b-a));

export function openingJacket({T,parent,radius,profile,face,x,surface,start,end,fixStart,fixEnd,materials,owned}) {
  const root=new T.Group();parent.add(root);root.position.set(x,0,face*surface);
  if(face<0)root.rotation.x=Math.PI;
  root.rotation.z=.28;
  const home=root.position.clone(),depth=profile.depth,inner=radius+.0003;
  const coreOuter=inner+profile.layer*profile.layers,outer=coreOuter+profile.shell;
  const sector=Math.PI*2/profile.panels,standOff=.035,formed=[],attachments=[],brackets=[],nuts=[];
  const metal=materials.jacketZinc||materials.zinc;
  Object.assign(root.userData,{component:'jacket-clamp',workFace:face,nominal:profile.nominal,
    shellMm:profile.shell*1000,depthMm:depth*1000,bandMm:profile.layer*profile.layers*1000,
    bracketCount:profile.brackets,hookCount:profile.hooks,wingBoltCount:profile.wingBolts,
    supportSurface:surface,closure:'overlap-hooks',hinged:false});
  const add=(geo,mat,owner,component)=>{owned.add(geo);const m=new T.Mesh(geo,mat);owner.add(m);m.castShadow=false;m.receiveShadow=true;if(component)m.userData.component=component;return m;};
  const box=(w,h,d,mat,owner,x=0,y=0,z=0)=>{const m=add(new T.BoxGeometry(w,h,d),mat,owner);m.position.set(x,y,z);return m;};
  const group=owner=>{const g=new T.Group();owner.add(g);return g;};
  const quad=(v,a,b,c,d)=>v.push(...a,...b,...c,...a,...c,...d);
  // Shell vertices retain (angle,radius,z), allowing the whole folded sheet
  // and its punched slots to bend together without a mechanical hinge.
  function formedMesh(vertices,material,component){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    const m=add(geo,material,root,component);formed.push({geo,original:vertices});return m;
  }
  function band(r0,r1,z0,z1){
    const v=[],n=128,gap=.0005/coreOuter;
    for(let j=0;j<n;j++){
      let a=gap+j*(Math.PI*2-2*gap)/n,b=gap+(j+1)*(Math.PI*2-2*gap)/n;
      if(profile.nominal>=200){if(j===n/2-1)b-=gap;if(j===n/2)a+=gap;}
      quad(v,[a,r0,z0],[b,r0,z0],[b,r0,z1],[a,r0,z1]);
      quad(v,[a,r1,z1],[b,r1,z1],[b,r1,z0],[a,r1,z0]);
      quad(v,[a,r0,z1],[b,r0,z1],[b,r1,z1],[a,r1,z1]);
      quad(v,[a,r1,z0],[b,r1,z0],[b,r0,z0],[a,r0,z0]);
      if(j===0||profile.nominal>=200&&j===n/2)quad(v,[a,r0,z0],[a,r0,z1],[a,r1,z1],[a,r1,z0]);
      if(j===n-1||profile.nominal>=200&&j===n/2-1)quad(v,[b,r0,z1],[b,r0,z0],[b,r1,z0],[b,r1,z1]);
    }
    for(let i=0;i<v.length;i+=9)for(let k=0;k<3;k++){const b=v[i+3+k];v[i+3+k]=v[i+6+k];v[i+6+k]=b;}
    formedMesh(v,materials.bandCore,'jacket-intumescent-layer');
  }
  for(let i=0;i<profile.layers;i++)band(inner+i*profile.layer,inner+(i+1)*profile.layer-.00008,.001,depth-.001);
  const shell=[],lips=[],slotAngles=Array.from({length:profile.brackets},(_,j)=>(Math.floor((j+.5)*profile.panels/profile.brackets)+.5)*sector);
  const slotZ=Math.min(.014,profile.height*.55),slotHeight=.004,slotWidth=.012;
  function shellPoint(a,z,r){
    const mid=(Math.floor((a+1e-8)/sector)+.5)*sector;
    return [a,r/Math.cos(a-mid),z];
  }
  for(let j=0;j<profile.panels;j++){
    const a=j*sector+.00003,b=(j+1)*sector-.00003;
    const holes=slotAngles.filter(h=>h>a&&h<b).map(h=>({a:h-slotWidth/outer/2,b:h+slotWidth/outer/2}));
    const angles=[a,...holes.flatMap(h=>[Math.max(a,h.a),Math.min(b,h.b)]),b].sort((a,b)=>a-b);
    const zs=[0,slotZ-slotHeight/2,slotZ+slotHeight/2,depth];
    for(let i=0;i<angles.length-1;i++)for(let k=0;k<zs.length-1;k++){
      const aa=angles[i],bb=angles[i+1],z0=zs[k],z1=zs[k+1];
      if(k===1&&holes.some(h=>(aa+bb)/2>h.a&&(aa+bb)/2<h.b))continue;
      quad(shell,shellPoint(aa,z0,outer),shellPoint(bb,z0,outer),shellPoint(bb,z1,outer),shellPoint(aa,z1,outer));
      quad(shell,shellPoint(aa,z1,coreOuter),shellPoint(bb,z1,coreOuter),shellPoint(bb,z0,coreOuter),shellPoint(aa,z0,coreOuter));
    }
    for(const h of holes){
      const z0=slotZ-slotHeight/2,z1=slotZ+slotHeight/2;
      for(const angle of [h.a,h.b])quad(shell,shellPoint(angle,z0,coreOuter),shellPoint(angle,z0,outer),shellPoint(angle,z1,outer),shellPoint(angle,z1,coreOuter));
      for(const z of [z0,z1])quad(shell,shellPoint(h.a,z,coreOuter),shellPoint(h.b,z,coreOuter),shellPoint(h.b,z,outer),shellPoint(h.a,z,outer));
    }
    for(const z of [0,depth]){
      const r=inner+Math.min(.002,profile.layer*.2),inset=Math.min(sector*.13,.002/r);
      const corners=[shellPoint(a,z,outer),shellPoint(b,z,outer),[b-inset,r,z],[a+inset,r,z]];
      quad(lips,...(z===depth?corners:[...corners].reverse()));
      quad(lips,...corners.map(([a,r,z])=>[a,r,z+(z===depth?-1:1)*profile.shell]).reverse());
    }
  }
  formedMesh(shell,metal,'jacket-folded-shell');formedMesh(lips,metal,'jacket-folded-lips');
  // Local mounting frames: x radial, y tangent, z along the pipe.
  function attachment(angle,r,z){const g=group(root);attachments.push({g,angle,r,z});return g;}
  function roundedHole(shape,cx,cy,w,h){
    const p=new T.Path(),r=Math.min(w,h)/2;
    p.moveTo(cx-w/2+r,cy-h/2);p.lineTo(cx+w/2-r,cy-h/2);
    p.absarc(cx+w/2-r,cy-h/2+r,r,-Math.PI/2,0,false);p.lineTo(cx+w/2,cy+h/2-r);
    p.absarc(cx+w/2-r,cy+h/2-r,r,0,Math.PI/2,false);p.lineTo(cx-w/2+r,cy+h/2);
    p.absarc(cx-w/2+r,cy+h/2-r,r,Math.PI/2,Math.PI,false);p.lineTo(cx-w/2,cy-h/2+r);
    p.absarc(cx-w/2+r,cy-h/2+r,r,Math.PI,Math.PI*1.5,false);shape.holes.push(p);
  }
  function plate(w,h,t,holes=[]){
    const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.closePath();
    for(const hole of holes){if(Array.isArray(hole))roundedHole(s,...hole);else s.holes.push(hole);}
    return new T.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:5});
  }
  const radialFrame=new T.Matrix4().makeBasis(new T.Vector3(0,1,0),new T.Vector3(0,0,1),new T.Vector3(1,0,0));
  const hookZ=Array.from({length:profile.hooks},(_,j)=>profile.wingBolts?depth*(.3+j*.2):depth*(j+1)/(profile.hooks+1));
  const boltZ=profile.wingBolts?[.012,depth-.012]:[];
  const receiver=attachment(.012/outer,outer+.001,0);
  const receiverMesh=add(plate(.018,depth,profile.shell,[...hookZ.map(z=>[0,z,.006,.007]),...boltZ.map(z=>[0,z,.006,.005])]),metal,receiver,'jacket-perforated-overlap');
  receiverMesh.quaternion.setFromRotationMatrix(radialFrame);
  const hookEnd=attachment(Math.PI*2-.003/outer,outer+.002,0);
  for(const z of hookZ){
    const h=group(hookEnd);h.userData.component='jacket-hook';h.position.z=z;
    box(.0015,.015,.004,materials.steel,h,.002,.007,0);
    box(.006,.002,.004,materials.steel,h,-.0005,.014,0);
  }
  for(const z of boltZ){
    const bolt=group(hookEnd);bolt.position.set(.003,.014,z);bolt.userData.component='jacket-threaded-stud';
    const stud=add(new T.CylinderGeometry(.002,.002,.012,10),materials.steel,bolt);stud.rotation.z=Math.PI/2;
    const nut=group(bolt);nut.userData.component='jacket-wing-nut';
    const hub=add(new T.CylinderGeometry(.004,.004,.003,12),materials.jacketFastener||materials.steel,nut);hub.rotation.z=Math.PI/2;
    for(const sign of [-1,1]){const wing=box(.003,.008,.003,materials.jacketFastener||materials.steel,nut,.001,sign*.005,.001);wing.rotation.x=sign*.38;}
    nuts.push(nut);
  }
  for(const angle of slotAngles){
    const r=outer/Math.cos((angle%sector)-sector/2),mount=attachment(angle,r+.001,0);
    const bracket=group(mount);bracket.userData.component='jacket-L-bracket';
    const footHoles=profile.nominal>=200?[[0,profile.foot*.32,.005,profile.foot*.25],[0,profile.foot*.73,.005,profile.foot*.25]]:[[0,profile.foot*.6,.005,.016]];
    const foot=add(plate(profile.bracketWidth,profile.foot,profile.plate,footHoles),metal,bracket);
    foot.rotation.z=-Math.PI/2;
    const cut=new T.Path(),lo=slotZ-.003,hi=slotZ+.006;
    cut.moveTo(-.006,lo);cut.lineTo(.006,lo);cut.lineTo(.006,hi);cut.lineTo(.0045,hi);
    cut.lineTo(.0045,lo+.0015);cut.lineTo(-.0045,lo+.0015);cut.lineTo(-.0045,hi);cut.lineTo(-.006,hi);cut.closePath();
    const upright=add(plate(profile.bracketWidth,profile.height,profile.plate,[cut]),metal,bracket);
    upright.quaternion.setFromRotationMatrix(radialFrame);
    const tongue=box(.005,.009,.0015,metal,bracket,-.002,0,lo+.002);
    tongue.userData.component='jacket-bracket-hook-tongue';
    const screw=group(mount);screw.position.set(profile.foot*(profile.nominal>=200?.73:.6),0,profile.plate);screw.userData.component='jacket-support-screw';
    const shaft=add(new T.CylinderGeometry(.0021,.0021,.064,10),materials.steel,screw);shaft.rotation.x=Math.PI/2;shaft.position.z=-.032;
    const head=add(new T.CylinderGeometry(.004,.004,.003,12),materials.steel,screw);head.rotation.x=Math.PI/2;head.position.z=.0015;
    box(.005,.0007,.0003,materials.bandCore,screw,0,0,.0031);box(.0007,.005,.0003,materials.bandCore,screw,0,0,.0031);
    brackets.push({bracket,screw});
  }
  let lastBend=-1;
  function bendPoint(a,r,z,k){
    const R=outer/k,theta=Math.PI+(a-Math.PI)*k;
    return [R-outer+(R+r-outer)*Math.cos(theta),(R+r-outer)*Math.sin(theta),z];
  }
  function update(time){
    const p=clamp((time-start)/(end-start)),fix=clamp((time-fixStart)/(fixEnd-fixStart));
    const close=phase(p,.16,.66),engage=phase(p,.66,.82),tighten=phase(p,.82,1);
    const k=.57+.43*close,seat=phase(fix,.48,.7),attach=phase(fix,0,.46),drive=phase(fix,.72,1);
    if(k!==lastBend){
      for(const {geo,original}of formed){
        const pos=geo.attributes.position;
        for(let i=0;i<original.length;i+=3)pos.setXYZ(i/3,...bendPoint(original[i],original[i+1],original[i+2],k));
        pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
      }
      for(const {g,angle,r,z}of attachments){g.position.set(...bendPoint(angle,r,z,k));g.rotation.z=Math.PI+(angle-Math.PI)*k;}
      lastBend=k;
    }
    root.position.copy(home);root.position.x-=outer*.8*(1-phase(p,0,.16));root.position.z+=face*standOff*(1-seat);
    // Overlap and insert hooks, then tighten the large-size wing nuts.
    receiverMesh.position.x=.004*(1-engage);
    for(const nut of nuts){nut.position.x=.010*(1-tighten)+.003;nut.rotation.x=tighten*Math.PI*4;}
    for(const {bracket,screw}of brackets){
      bracket.visible=time>=fixStart;bracket.position.set(.045*(1-attach),0,.013*(1-attach));
      screw.visible=fix>.7;screw.position.z=profile.plate+.07*(1-drive);screw.rotation.z=drive*Math.PI*6;
    }
    Object.assign(root.userData,{progress:p,openAngle:(1-close)*1.3,latched:engage===1,
      tightened:profile.wingBolts===0?engage===1:tighten===1,bracketsEngaged:attach===1,
      seated:seat===1,screwsFixed:drive===1,fixProgress:fix,
      stage:drive===1?'fixed':fix>.7?'screws':fix>.48?'seat':time>=fixStart?'brackets':p>.82&&profile.wingBolts?'wing-nuts':p>.66?'hooks':'wrap'});
  }
  update(0);
  return {object:root,home,offset:new T.Vector3(),start,end,face:1,update};
}
