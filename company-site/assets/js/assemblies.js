// Parametric installation diagrams. Geometry follows the selected PDF's sequence;
// representative pipe layouts are identified as diagrams in the interface.
export function buildAssembly({ T, parent, record, bayWidth, materials, CY, WALL_Z }) {
  const { concrete, steel, zinc, pvc, foil, wool, mineral, bandCore, whiteSeal } = materials;
  const config = record.geometry, isFloor = config.orientation === 'floor', isDuct = record.category === 'duct', bundle = record.category === 'bundle';
  const root = new T.Group(); parent.add(root);
  root.position.set(0, CY, WALL_Z);
  if (isFloor) root.rotation.x = -Math.PI / 2;
  const room = new T.Group(), service = new T.Group(); root.add(room, service);
  const parts = [], pipes = [], owned = new Set(), geometryCache=new Map();
  function cached(key,build){if(!geometryCache.has(key))geometryCache.set(key,build());return geometryCache.get(key);}
  const mesh = (geo, mat, owner, x=0,y=0,z=0) => { owned.add(geo); const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;owner.add(o);return o; };
  const box = (w,h,d,mat,owner,x=0,y=0,z=0) => mesh(cached(`box:${w}:${h}:${d}`,()=>new T.BoxGeometry(w,h,d)),mat,owner,x,y,z);
  const group = owner => {const o=new T.Group();owner.add(o);return o;};
  function ring(outer,inner,len,mat,owner,x=0,y=0,z=0) {
    const innerRadius=Math.min(inner,outer-.0005);
    const geometry=cached(`ring:${outer}:${innerRadius}:${len}`,()=>{
      const points=[[innerRadius,0],[outer,0],[outer,len],[innerRadius,len],[innerRadius,0]].map(([r,z])=>new T.Vector2(r,z));
      const geometry=new T.LatheGeometry(points,72);geometry.rotateX(Math.PI/2);return geometry;
    });
    return mesh(geometry,mat,owner,x,y,z);
  }

  function shell(w,h,len,thick,mat,owner,z) {
    const g=group(owner);
    for(const sign of [-1,1]){box(w+2*thick,thick,len,mat,g,0,sign*(h/2+thick/2),z+len/2);box(thick,h,len,mat,g,sign*(w/2+thick/2),0,z+len/2);}
    return g;
  }
  function animate(object,index,offset=[0,.2,.2]) {
    object.userData.step=index;
    parts.push({object,home:object.position.clone(),offset:new T.Vector3(...offset),start:index*3,end:index*3+1.8,face:1});
  }
  const diameters=config.diametersMm.length ? config.diametersMm : [isDuct ? 2600 : 114.3];
  const radii=(bundle?diameters:diameters.slice(0,1)).map(d=>d/2000);
  const opening=config.openingMm;
  const ow=(opening.width||opening.diameter||radii[0]*2000+100)/1000;
  const oh=(opening.height||opening.diameter||radii[0]*2000+100)/1000;
  const pipeXs=radii.map((r,i)=> bundle && radii.length>1 ? (-ow/2+.05+r)+(ow-.1-radii[0]-radii.at(-1))*(i/(radii.length-1))-(r-radii[0]) : 0);
  // Space the representative pipes proportionally within the source opening.
  if(bundle && radii.length>1){
    const gap=Math.max(.02,(ow-.1-radii.reduce((a,r)=>a+2*r,0))/(radii.length-1));
    let x=-ow/2+.05;for(let i=0;i<radii.length;i++){pipeXs[i]=x+radii[i];x+=2*radii[i]+gap;}
  }
  const wallShape=new T.Shape();const wallWidth=isFloor?Math.max(2.8,ow+.7):bayWidth;
  wallShape.moveTo(-wallWidth/2,-CY);wallShape.lineTo(wallWidth/2,-CY);wallShape.lineTo(wallWidth/2,3.08-CY);wallShape.lineTo(-wallWidth/2,3.08-CY);wallShape.closePath();
  const hole=new T.Path();
  if(opening.diameter){hole.absarc(0,0,ow/2,0,Math.PI*2,true);}else{hole.moveTo(-ow/2,-oh/2);hole.lineTo(-ow/2,oh/2);hole.lineTo(ow/2,oh/2);hole.lineTo(ow/2,-oh/2);hole.closePath();}
  wallShape.holes.push(hole);
  const wall=mesh(new T.ExtrudeGeometry(wallShape,{depth:.15,bevelEnabled:false,curveSegments:48}),concrete,room,0,0,-.075);
  const pipeMaterial=config.pipeMaterial==='pvc'?pvc:config.pipeMaterial==='copper'?materials.copper:steel;
  const length=3.4;
  if(isDuct){
    shell(2.6,.65,3.8,.001,zinc,service,-1.9);
    for(const z of [-1.901,1.901])box(2.602,.652,.006,zinc,service,0,0,z).userData.component='duct-closed-end';
    for(const z of [-1.65,.45,1.65])for(const y of [-.35,.35])box(2.71,.035,.035,steel,service,0,y,z);
  }else radii.forEach((r,i)=>{
    const material=config.pipeMaterial==='copper'&&i>0?pvc:pipeMaterial;
    const pipe=ring(r,Math.max(.004,r-.005),length,material,service,pipeXs[i],0,-length/2);
    pipe.userData.component=bundle?'bundle-pipe':'service-pipe';pipes.push(pipe);
  });
  let outerRadii=[...radii],ductThickness=0,blanketLayer=0,lastWrapLengths=[];
  const layerBases=new Map();
  const nominalMap={34:25,60.5:50,114.3:100,165.2:150,216.3:200,406.4:400,60:50,114:100,165:150,216:200,267:250};
  record.steps.forEach((step,index)=>{
    const faces=step.faces||config.faces;
    if(['opening','service'].includes(step.kind))return; // Pipes remain in place throughout installation.
    const g=group(service);g.userData.component=step.kind;g.userData.sourcePage=step.page;
    const thickness=(step.thicknessMm||25)/1000;
    if(step.kind==='reinforcement'){
      for(let i=0;i<pipeXs.length-1;i++)box(.045,oh+.18,.1,zinc,g,(pipeXs[i]+pipeXs[i+1])/2,0,0);
      for(const y of [-1,1])box(ow+.15,.04,.1,zinc,g,0,y*(oh/2+.02),0);
    }else if(step.kind==='board'){
      const bw=(config.boardMm?.width||((ow+.2)*1000))/1000;
      const bh=(config.boardMm?.halfHeight||((oh+.2)*500))/1000;
      const bd=(config.boardMm?.thickness||8.84)/1000;
      for(const face of faces){
        if(isDuct){
          for(const sign of [-1,1]){box(ow+.2,.12,bd,mineral,g,0,sign*(oh/2+.055),face*(.075+bd/2));box(.12,oh,bd,mineral,g,sign*(ow/2+.055),0,face*(.075+bd/2));}
        }else radii.forEach((r,i)=>{
          const left=bundle?(i===0?-ow/2-.1:(pipeXs[i-1]+pipeXs[i])/2): -bw/2;
          const right=bundle?(i===radii.length-1?ow/2+.1:(pipeXs[i]+pipeXs[i+1])/2):bw/2;
          const cx=pipeXs[i],notch=outerRadii[i]+.001;
          for(const sign of [-1,1]){
            const shape=new T.Shape();shape.moveTo(left-cx,0);shape.lineTo(-notch,0);shape.absarc(0,0,notch,Math.PI,0,true);shape.lineTo(right-cx,0);shape.lineTo(right-cx,bh);shape.lineTo(left-cx,bh);shape.closePath();
            const panel=mesh(new T.ExtrudeGeometry(shape,{depth:bd,bevelEnabled:false,curveSegments:48}),mineral,g,cx,0,face>0?.076:-.076-bd);
            if(sign<0){panel.rotation.z=Math.PI;panel.scale.x=-1;}
            panel.userData.component='split-board';
          }
          for(const x of [left+.02,right-.02])for(const y of [-bh+.02,bh-.02]){
            const screw=mesh(new T.CylinderGeometry(.005,.005,.008,6),steel,g,x,y,face*(.08+bd));screw.rotation.x=Math.PI/2;screw.castShadow=false;
          }
        });
      }
    }else if(step.kind==='jacket'||step.kind==='brackets'){
      const counts=record.steps.find(s=>s.kind==='brackets')?.fasteners;
      for(const face of faces)radii.forEach((r,i)=>{
        const n=counts||([.031,.058,.083,.109,.134].findIndex(a=>r<=a)*2+2);
        const depth=Math.max(.032,Math.min(.132,r));
        if(step.kind==='jacket'){
          ring(r+.025,r,depth,bandCore,g,pipeXs[i],0,face>0?.083:-.083-depth);
          ring(r+.027,r+.025,depth,zinc,g,pipeXs[i],0,face>0?.083:-.083-depth);
          for(let j=0;j<24;j++){const a=j*Math.PI/12;const lip=box(.018,.019,.002,zinc,g,pipeXs[i]+Math.cos(a)*(r+.017),Math.sin(a)*(r+.017),face*(.083+depth));lip.rotation.z=a-Math.PI/2;}
        }
        if(step.kind==='brackets'||!record.steps.some(s=>s.kind==='brackets'))for(let j=0;j<n;j++){
          const a=j*Math.PI*2/n,R=r+.05;const b=box(.025,.05,.003,zinc,g,pipeXs[i]+Math.cos(a)*R,Math.sin(a)*R,face*.082);b.rotation.z=a-Math.PI/2;
          const screw=mesh(new T.CylinderGeometry(.006,.006,.008,6),steel,g,pipeXs[i]+Math.cos(a)*(R+.012),Math.sin(a)*(R+.012),face*.09);screw.rotation.x=Math.PI/2;
        }
      });
    }else if(['blanket','glasswool','rubber','packing','band','insulation-band'].includes(step.kind)){
      const isWrap=['blanket','glasswool','rubber'].includes(step.kind),inside=!isWrap;
      const mat=step.kind==='rubber'||step.kind==='band'?bandCore:step.kind==='packing'?wool:step.kind==='glasswool'?materials.glasswool:foil;
      const len=inside?.14:Math.max(.1,Math.min(2.26,(step.lengthMm||700)/1000));
      lastWrapLengths=inside?lastWrapLengths:[len];
      if(isDuct){
        const t=step.kind==='band'?.024:step.kind==='insulation-band'?.06:thickness;
        const starts=inside?[[-.07,.14]]:step.through?[[-len-.075,len*2+.15]]:faces.map(face=>[face>0?.085:-.085-len,len]);
        for(const [z,l]of starts){shell(2.602+ductThickness*2,.652+ductThickness*2,l,t,mat,g,z);}
        ductThickness+=t;
      }else radii.forEach((r,i)=>{
        const t=inside?(step.kind==='band'?Math.min(.012,(ow/2-r)/3):Math.min(.05,Math.max(.012,(ow/2-r)/2))):Math.min(thickness,.076);
        const nominal=nominalMap[diameters[i]];
        if(step.perNominal&&!step.perNominal[nominal])return;
        const per=step.perNominal?.[nominal];
        const actualLen=per?.lengthMm?per.lengthMm/1000:len;
        const offset=(step.offsetMm||0)/1000;
        if(step.layer&&!layerBases.has(step.layer))layerBases.set(step.layer,[...outerRadii]);
        const base=step.layer?layerBases.get(step.layer)[i]:outerRadii[i];
        const inner=inside?(step.kind==='band'?Math.max(r+.004,ow/2-t):r):base;
        const starts=inside?[[-.07,.14]]:step.through?[[-actualLen-.075,actualLen*2+.15]]:faces.map(face=>[face>0?.085+offset:-.085-offset-actualLen,actualLen]);
        for(const [z,l]of starts){
          ring(inner+t,inner,l,mat,g,pipeXs[i],0,z);
          if(isWrap&&step.kind!=='rubber'){
            for(const end of [z-.001,z+l])ring(inner+t-.0003,inner+.0003,.002,wool,g,pipeXs[i],0,end);
            const seam=box(.008,t*.18,l,zinc,g,pipeXs[i]+inner+t*.9,0,z+l/2);seam.userData.component='foil-seam';
          }
        }
        if(!inside)outerRadii[i]=Math.max(outerRadii[i],inner+t);
      });
      if(step.kind==='blanket'&&!(step.offsetMm>0))blanketLayer++;
    }else if(step.kind==='sealant'){
      if(isDuct){for(const face of faces)for(const sign of [-1,1]){box(ow+.2,.012,.01,whiteSeal,g,0,sign*(oh/2+.115),face*.094);box(.012,oh+.24,.01,whiteSeal,g,sign*(ow/2+.115),0,face*.094);}}
      else for(const face of faces)radii.forEach((r,i)=>{ring(outerRadii[i]+.007,outerRadii[i],.01,whiteSeal,g,pipeXs[i],0,face*.092);if(config.boardMm){const w=(config.boardMm.width||ow*1000+200)/1000,h=(config.boardMm.halfHeight||oh*500+100)/1000;for(const y of [-h,h])box(w,.009,.009,whiteSeal,g,pipeXs[i],y,face*.095);}});
    }else if(step.kind==='plate'){
      for(const face of faces)for(const sign of [-1,1]){box(ow+.27,.135,.001,zinc,g,0,sign*(oh/2+.06),face*.085);box(.135,oh,.001,zinc,g,sign*(ow/2+.06),0,face*.085);}
    }else if(step.kind==='fixing'){
      if(isDuct){for(const face of faces)for(const distance of [.16,.6,1.03])for(const sign of [-1,1]){box(2.9,.035,.035,zinc,g,0,sign*(.325+ductThickness+.02),face*distance);box(.018,.85+2*ductThickness,.018,steel,g,sign*1.45,0,face*distance);}}
      else for(const face of faces)radii.forEach((r,i)=>{for(const distance of [.12,Math.max(.2,(lastWrapLengths[0]||.7)-.04)]){const tor=mesh(new T.TorusGeometry(outerRadii[i]+.002,.002,6,48),steel,g,pipeXs[i],0,face*distance);tor.castShadow=false;}});
    }
    animate(g,index,step.kind==='board'?[0,.24,.22]:[0,.12,.18]);
  });
  root.userData.certificate=record.id;
  const viewSpan=bundle&&ow<.3?Math.max(.65,ow*3):Math.max(1.1,ow+.7,isDuct?3.5:bundle?2.1:1.3);
  return {root,room,service,wall,parts,pipes,viewSpan,isFloor,record,owned,blanketLayer,dispose(){root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});owned.forEach(geo=>geo.dispose());}};
}
