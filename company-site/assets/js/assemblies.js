// Parametric installation diagrams. Geometry follows the selected PDF's sequence;
// representative pipe layouts are identified as diagrams in the interface.
import { installationTimeline } from './installation-motion.js?v=20261105r6';
import { caulkingPass } from './installation-tools.js?v=20261105r6';
import { openingJacket } from './installation-jacket.js?v=20261105r6';
import { measureWork } from './installation-view.js?v=20261105r6';
export function buildAssembly({ T, parent, record, bayWidth, materials, CY, WALL_Z }) {
  const { concrete, steel, zinc, pvc, foil, wool, mineral, bandCore, whiteSeal } = materials;
  const config = record.geometry, isFloor = config.orientation === 'floor', isDuct = record.category === 'duct', bundle = record.category === 'bundle';
  const root = new T.Group(); parent.add(root);
  root.position.set(0, CY, WALL_Z);
  if (isFloor) root.rotation.x = -Math.PI / 2;
  const room = new T.Group(), service = new T.Group(); root.add(room, service);
  const work = new T.Group(); service.add(work);
  const parts = [], pipes = [], owned = new Set(), geometryCache=new Map();
  const timing = installationTimeline(record), boardOutlines = [];
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
  function animate(object,index,offset=[0,.2,.2],delay=0,duration=1.8) {
    object.userData.step=index;
    const start=timing.steps[index].start+delay;
    parts.push({object,home:object.position.clone(),offset:new T.Vector3(...offset),start,end:start+duration,face:1});
  }
  function blanketSleeve(inner,thick,length,owner,x,z) {
    ring(inner+thick,inner,length,wool,owner,x,0,z);
    const radius=inner+thick+.0006;
    const geometry=cached(`blanket:${radius}:${length}`,()=>{
      const geo=new T.CylinderGeometry(radius,radius,length,96,24,true);
      const p=geo.attributes.position;
      for(let i=0;i<p.count;i++){
        const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i));
        const crease=.0007*Math.sin(a*21+y*49)+.0005*Math.sin(a*43-y*83);
        const r=radius+crease;p.setXYZ(i,Math.cos(a)*r,y,Math.sin(a)*r);
      }
      geo.computeVertexNormals();geo.rotateX(Math.PI/2);return geo;
    });
    mesh(geometry,materials.blanketFoil,owner,x,0,z+length/2).userData.component='blanket-foil';
    for(const end of [z,z+length]){
      const lip=mesh(cached(`lip:${radius}`,()=>new T.TorusGeometry(radius,.0012,5,96)),foil,owner,x,0,end);
      lip.userData.component='blanket-folded-edge';
    }
    const overlap=box(.014,.0017,length,materials.blanketFoil,owner,x+radius*.71,radius*.71,z+length/2);
    overlap.rotation.z=-Math.PI/4;overlap.userData.component='blanket-overlap';
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
  const workLength=Math.max(.1,...record.steps.filter(s=>['blanket','glasswool','rubber'].includes(s.kind)).map(s=>(s.lengthMm||700)/1000+(s.offsetMm||0)/1000),...record.steps.flatMap(s=>Object.values(s.perNominal||{}).map(p=>(p.lengthMm||0)/1000)));
  const length=Math.max(3.4,2*(workLength+.35));
  if(isDuct){
    shell(2.6,.65,3.8,.001,zinc,service,-1.9);
    for(const z of [-1.901,1.901])box(2.602,.652,.006,zinc,service,0,0,z).userData.component='duct-closed-end';
  }else radii.forEach((r,i)=>{
    const material=config.pipeMaterial==='copper'&&i>0?pvc:pipeMaterial;
    const pipe=ring(r,Math.max(.004,r-.005),length,material,service,pipeXs[i],0,-length/2);
    pipe.userData.component=bundle?'bundle-pipe':'service-pipe';pipes.push(pipe);
  });
  let outerRadii=[...radii],ductThickness=0,blanketLayer=0,lastWrapLengths=[];
  const existingInsulation = record.steps.find(step=>step.kind==='glasswool');
  if(existingInsulation&&!isDuct){
    const t=(existingInsulation.thicknessMm||25)/1000;
    radii.forEach((r,i)=>{
      const existing=group(service);existing.userData.component='existing-insulation';existing.userData.length=length;existing.userData.branded=false;
      ring(r+t,r,length,materials.glasswool,existing,pipeXs[i],0,-length/2);
      const sleeve=mesh(new T.CylinderGeometry(r+t+.0005,r+t+.0005,length,72,1,true),foil,existing,pipeXs[i],0,0);
      sleeve.rotation.x=Math.PI/2;sleeve.userData.component='existing-unprinted-foil';
      for(let z=-length/2+.45;z<length/2;z+=.9)ring(r+t+.0011,r+t,.025,zinc,existing,pipeXs[i],0,z);
      box(.006,.001,length,zinc,existing,pipeXs[i],r+t+.0005,0);
      outerRadii[i]=r+t;
    });
  }
  const layerBases=new Map();
  const nominalMap={34:25,60.5:50,114.3:100,165.2:150,216.3:200,406.4:400,60:50,114:100,165:150,216:200,267:250};
  record.steps.forEach((step,index)=>{
    const faces=step.faces||config.faces;
    if(['opening','service','glasswool'].includes(step.kind))return; // Existing pipe insulation is present from the first frame.
    const g=group(work);g.userData.component=step.kind;g.userData.sourcePage=step.page;
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
          const notchW=1.301+ductThickness,notchH=.326+ductThickness,strip=.15;
          const width=2*(notchW+strip),height=notchH+strip,seams=[];
          let order=0;
          const panel=(w,h,x,y,sign)=>{
            const piece=group(g);piece.userData.component='board-piece';piece.userData.workFace=face;piece.userData.half=sign>0?'upper':'lower';
            box(w-.002,h-.002,bd,mineral,piece,x,y,face*(.076+bd/2));
            for(const dx of [-w/2+.015,w/2-.015])for(const dy of [-h/2+.015,h/2-.015]){
              const screw=mesh(new T.CylinderGeometry(.004,.004,.006,6),steel,piece,x+dx,y+dy,face*(.079+bd));screw.rotation.x=Math.PI/2;
            }
            animate(piece,index,[x*.12,sign*.32,face*.25],order++*.14,1.35);
          };
          for(const sign of [1,-1]){
            for(let col=0;col<3;col++)panel(2*notchW/3,strip,(col-1)*2*notchW/3,sign*(notchH+strip/2),sign);
            for(const side of [-1,1])panel(strip,height,side*(notchW+strip/2),sign*height/2,sign);
            for(const x of [-notchW/3,notchW/3])seams.push([[x,sign*notchH],[x,sign*height]]);
          }
          for(const side of [-1,1]){
            seams.push([[side*notchW,-height],[side*notchW,-notchH]],[[side*notchW,notchH],[side*notchW,height]],[[side*notchW,0],[side*width/2,0]]);
          }
          boardOutlines.push({face,left:-width/2,right:width/2,height,cx:0,notchW,notchH,seams,z:face*(.076+bd+.0045)});
        }else radii.forEach((r,i)=>{
          const left=bundle?(i===0?-ow/2-.1:(pipeXs[i-1]+pipeXs[i])/2): -bw/2;
          const right=bundle?(i===radii.length-1?ow/2+.1:(pipeXs[i]+pipeXs[i+1])/2):bw/2;
          const cx=pipeXs[i],notch=outerRadii[i]+.001;
          for(const sign of [1,-1]){
            const half=group(g);half.userData.component='board-half';half.userData.half=sign>0?'upper':'lower';half.userData.workFace=face;
            const shape=new T.Shape();shape.moveTo(left-cx,0);shape.lineTo(-notch,0);shape.absarc(0,0,notch,Math.PI,0,true);shape.lineTo(right-cx,0);shape.lineTo(right-cx,bh);shape.lineTo(left-cx,bh);shape.closePath();
            const panel=mesh(new T.ExtrudeGeometry(shape,{depth:bd,bevelEnabled:false,curveSegments:48}),mineral,half,cx,0,face>0?.076:-.076-bd);
            panel.scale.y=sign;
            panel.userData.component='split-board';
            animate(half,index,[0,sign*Math.max(.22,bh*.9),face*.22],sign>0?0:.65,1.65);
          }
          boardOutlines.push({face,left,right,height:bh,cx,notch,z:face*(.076+bd+.0045)});
          const joint=group(g);
          box(cx-notch-left,.0012,.0006,bandCore,joint,(left+cx-notch)/2,0,face*(.076+bd+.0004));
          box(right-cx-notch,.0012,.0006,bandCore,joint,(right+cx+notch)/2,0,face*(.076+bd+.0004));
          animate(joint,index,[0,0,0],2.3,.1);
          const fixings=group(g);
          for(const x of [left+.02,right-.02])for(const y of [-bh+.02,bh-.02]){
            const screw=mesh(new T.CylinderGeometry(.005,.005,.008,6),steel,fixings,x,y,face*(.08+bd));screw.rotation.x=Math.PI/2;screw.castShadow=false;
          }
          animate(fixings,index,[0,0,face*.06],2.35,.65);
        });
      }
    }else if(step.kind==='jacket'||step.kind==='brackets'){
      const counts=record.steps.find(s=>s.kind==='brackets')?.fasteners;
      const separateFixing=record.steps.some(s=>s.kind==='brackets');
      const fasteners=step.kind==='jacket'&&!separateFixing?group(g):g;
      if(fasteners!==g)animate(fasteners,index,[0,0,.04],3.15,.45);
      for(const face of faces)radii.forEach((r,i)=>{
        const n=counts||([.031,.058,.083,.109,.134].findIndex(a=>r<=a)*2+2);
        const depth=Math.max(.032,Math.min(.132,r));
        if(step.kind==='jacket')parts.push(openingJacket({T,parent:g,radius:r,depth,face,x:pipeXs[i],start:timing.steps[index].start,end:timing.steps[index].end-.1,materials,owned}));
        if(step.kind==='brackets'||!separateFixing)for(let j=0;j<n;j++){
          const a=j*Math.PI*2/n,R=r+.05;const b=box(.025,.05,.003,zinc,fasteners,pipeXs[i]+Math.cos(a)*R,Math.sin(a)*R,face*.082);b.rotation.z=a-Math.PI/2;
          const screw=mesh(new T.CylinderGeometry(.006,.006,.008,6),steel,fasteners,pipeXs[i]+Math.cos(a)*(R+.012),Math.sin(a)*(R+.012),face*.09);screw.rotation.x=Math.PI/2;
        }
      });
    }else if(['blanket','glasswool','rubber','packing','band','insulation-band'].includes(step.kind)){
      const isWrap=['blanket','glasswool','rubber'].includes(step.kind),inside=!isWrap;
      const mat=step.kind==='rubber'||step.kind==='band'?bandCore:step.kind==='packing'?wool:step.kind==='glasswool'?materials.glasswool:foil;
      const len=inside?.14:Math.max(.1,(step.lengthMm||700)/1000);
      lastWrapLengths=inside?lastWrapLengths:[len];
      if(isDuct){
        const t=step.kind==='band'?.024:step.kind==='insulation-band'?.06:thickness;
        const starts=inside?[[-.07,.14]]:step.through?[[-len-.075,len*2+.15]]:faces.map(face=>[face>0?.085:-.085-len,len]);
        for(const [z,l]of starts){
          const w=2.602+ductThickness*2,h=.652+ductThickness*2;
          if(step.kind==='blanket'){
            shell(w,h,l,t,wool,g,z);
            shell(w+t*2,h+t*2,Math.max(.01,l-.003),.0008,materials.blanketFoil,g,z+.0015).userData.component='blanket-foil';
          }else shell(w,h,l,t,mat,g,z);
        }
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
          if(step.kind==='blanket')blanketSleeve(inner,t,l,g,pipeXs[i],z);
          else ring(inner+t,inner,l,mat,g,pipeXs[i],0,z);
          if(isWrap&&step.kind!=='rubber'){
            for(const end of [z-.001,z+l])ring(inner+t-.0003,inner+.0003,.002,wool,g,pipeXs[i],0,end);
            const seam=box(.008,t*.18,l,zinc,g,pipeXs[i]+inner+t*.9,0,z+l/2);seam.userData.component='foil-seam';
          }
        }
        if(!inside)outerRadii[i]=Math.max(outerRadii[i],inner+t);
      });
      if(step.kind==='blanket'&&!(step.offsetMm>0))blanketLayer++;
    }else if(step.kind==='sealant'){
      for(const face of faces){
        const paths=[],v=(x,y,z)=>new T.Vector3(x,y,z);
        const circle=(x,r,z)=>Array.from({length:97},(_,i)=>v(x+Math.cos(i*Math.PI/48)*r,Math.sin(i*Math.PI/48)*r,z));
        const panels=boardOutlines.filter(panel=>panel.face===face);
        if(panels.length)for(const p of panels){
          const {left,right,height:h,cx,z}=p;
          paths.push([v(left,-h,z),v(right,-h,z),v(right,h,z),v(left,h,z),v(left,-h,z)]);
          const r=p.notch||p.notchW;
          if(p.seams)for(const seam of p.seams)paths.push(seam.map(([x,y])=>v(x,y,z)));
          else paths.push([v(left,0,z),v(cx-r,0,z)],[v(cx+r,0,z),v(right,0,z)]);
          if(p.notch)paths.push(circle(cx,p.notch,z));
          else paths.push([v(-r,-p.notchH,z),v(r,-p.notchH,z),v(r,p.notchH,z),v(-r,p.notchH,z),v(-r,-p.notchH,z)]);
        }else if(isDuct){
          const x=ow/2,y=oh/2,z=face*.09;
          paths.push([v(-x,-y,z),v(x,-y,z),v(x,y,z),v(-x,y,z),v(-x,-y,z)]);
        }else radii.forEach((r,i)=>paths.push(circle(pipeXs[i],outerRadii[i]+.003,face*.09)));
        const slot=timing.steps[index];
        parts.push(caulkingPass({T,parent:g,paths,materials,start:slot.start+.12,end:slot.end-.35,face,scale:isDuct?1.5:1,owned}));
      }
    }else if(step.kind==='plate'){
      for(const face of faces)for(const sign of [-1,1]){box(ow+.27,.135,.001,zinc,g,0,sign*(oh/2+.06),face*.085);box(.135,oh,.001,zinc,g,sign*(ow/2+.06),0,face*.085);}
    }else if(step.kind==='fixing'){
      if(isDuct){/* User-requested uncluttered view: channels/rods remain in the linked specification. */}
      else for(const face of faces)radii.forEach((r,i)=>{for(const distance of [.12,Math.max(.2,(lastWrapLengths[0]||.7)-.04)]){const tor=mesh(new T.TorusGeometry(outerRadii[i]+.002,.002,6,48),steel,g,pipeXs[i],0,face*distance);tor.castShadow=false;}});
    }
    animate(g,index,['board','sealant','jacket'].includes(step.kind)?[0,0,0]:[0,.12,.18]);
  });
  root.userData.certificate=record.id;
  const viewSpan=isDuct?3.5:Math.max(.8,ow+.35,(config.boardMm?.width||0)/1000*1.6);
  const workBounds=measureWork(T,root,work,parts,timing);
  return {root,room,service,work,wall,parts,pipes,viewSpan,workBounds,workLength,maxDiameter:Math.max(...diameters)/1000,existingInsulation:Boolean(existingInsulation),isFloor,record,owned,blanketLayer,dispose(){root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});owned.forEach(geo=>geo.dispose());}};
}
