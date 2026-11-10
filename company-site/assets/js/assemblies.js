// Parametric installation diagrams. Geometry follows the selected PDF's sequence;
// representative pipe layouts are identified as diagrams in the interface.
import { installationTimeline } from './installation-motion.js?v=20261109r7';
import { caulkingPass } from './installation-tools.js?v=20261106r2';
import { openingJacket, jacketProfile } from './installation-jacket.js?v=20261109r1';
import { measureWork } from './installation-view.js?v=20261109r9';
import { windingWire, wirePositions } from './installation-wire.js?v=20261106r2';
import { wrappingBlanket, blanketPassesThrough } from './installation-blanket.js?v=20261109r10';
import { ductChannelClamps } from './installation-duct-channels.js?v=20261109r7';
import { wrappedBandRing, wrappedDuctBands } from './installation-band.js?v=20261110r1';
export function buildAssembly({ T, parent, record, bayWidth, materials, CY, WALL_Z, level=3.3 }) {
  const { concrete, steel, zinc, pvc, foil, wool, mineral, bandCore, whiteSeal } = materials;
  const config = record.geometry, isFloor = config.orientation === 'floor', isDuct = record.category === 'duct', bundle = record.category === 'bundle';
  const root = new T.Group(); parent.add(root);
  const elevation=isFloor?level:CY;
  root.position.set(0, elevation, WALL_Z);
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
    const part={object,home:object.position.clone(),offset:new T.Vector3(...offset),start,end:start+duration,face:1};
    parts.push(part);return part;
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
  let sectionSlab=null;
  if(isFloor){
    // The front half is cut away only in the selected installation view, so
    // the upper and lower work can be read together around the same opening.
    const section=new T.Shape(),back=Math.max(3.08-CY,oh/2+.3);
    section.moveTo(-wallWidth/2,0);section.lineTo(-ow/2,0);
    if(opening.diameter)section.absarc(0,0,ow/2,Math.PI,0,true);
    else{section.lineTo(-ow/2,oh/2);section.lineTo(ow/2,oh/2);section.lineTo(ow/2,0);}
    section.lineTo(wallWidth/2,0);section.lineTo(wallWidth/2,back);section.lineTo(-wallWidth/2,back);section.closePath();
    sectionSlab=mesh(new T.ExtrudeGeometry(section,{depth:.15,bevelEnabled:false,curveSegments:48}),concrete,room,0,0,-.075);
    sectionSlab.userData.component='floor-section-slab';sectionSlab.visible=false;
  }
  const pipeMaterial=config.pipeMaterial==='pvc'?pvc:config.pipeMaterial==='copper'?materials.copper:steel;
  const workLength=Math.max(.1,...record.steps.filter(s=>['blanket','glasswool','rubber'].includes(s.kind)).map(s=>(s.lengthMm||700)/1000+(s.offsetMm||0)/1000),...record.steps.flatMap(s=>Object.values(s.perNominal||{}).map(p=>(p.lengthMm||0)/1000)));
  const serviceEnds={back:isFloor?-elevation-.22:Math.min(-3.05,-workLength-.35),front:isFloor?7-elevation:Math.max(3.95,workLength+.35)};
  const length=serviceEnds.front-serviceEnds.back,pipeLayout=[];
  if(isDuct){
    shell(2.6,.65,length,.001,zinc,service,serviceEnds.back);
    for(const z of [serviceEnds.back,serviceEnds.front])box(2.602,.652,.006,zinc,service,0,0,z).userData.component='duct-closed-end';
    pipeLayout.push({x:0,radius:1.3,material:zinc});
  }else radii.forEach((r,i)=>{
    const material=config.pipeMaterial==='copper'&&i>0?pvc:pipeMaterial;
    const pipe=ring(r,Math.max(.004,r-.005),length,material,service,pipeXs[i],0,serviceEnds.back);
    pipe.userData.component=bundle?'bundle-pipe':'service-pipe';pipe.userData.ends=serviceEnds;pipes.push(pipe);pipeLayout.push({x:pipeXs[i],radius:r,material});
  });
  let outerRadii=[...radii],ductThickness=0,blanketLayer=0,ductBlanketSegments=[];
  const ductLayers=[];
  const ductLayerAt=z=>ductLayers.reduce((sum,l)=>sum+(z>=l.from-.012&&z<=l.to+.012?l.thickness:0),0);
  const blanketSegments=radii.map(()=>[]);
  const existingInsulation = record.steps.find(step=>step.kind==='glasswool');
  if(existingInsulation&&!isDuct){
    const t=(existingInsulation.thicknessMm||25)/1000;
    radii.forEach((r,i)=>{
      const existing=group(service);existing.userData.component='existing-insulation';existing.userData.length=length;existing.userData.branded=false;
      ring(r+t,r,length,materials.glasswool,existing,pipeXs[i],0,serviceEnds.back);
      const sleeve=mesh(new T.CylinderGeometry(r+t+.0005,r+t+.0005,length,72,1,true),foil,existing,pipeXs[i],0,(serviceEnds.back+serviceEnds.front)/2);
      sleeve.rotation.x=Math.PI/2;sleeve.userData.component='existing-unprinted-foil';
      for(let z=serviceEnds.back+.45;z<serviceEnds.front;z+=.9)ring(r+t+.0011,r+t,.025,zinc,existing,pipeXs[i],0,z);
      box(.006,.001,length,zinc,existing,pipeXs[i],r+t+.0005,(serviceEnds.back+serviceEnds.front)/2);
      outerRadii[i]=r+t;
      pipeLayout[i].radius=r+t+.0005;pipeLayout[i].material=foil;
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
    }else if(step.kind==='jacket'){
      const fixingIndex=record.steps.findIndex(s=>s.kind==='brackets'),slot=timing.steps[index];
      const fixSlot=fixingIndex>=0?timing.steps[fixingIndex]:{start:slot.start+slot.duration*.56,end:slot.end};
      for(const face of faces)radii.forEach((r,i)=>{
        const profile=jacketProfile(diameters[i]);
        if(fixingIndex>=0)profile.brackets=record.steps[fixingIndex].fasteners||profile.brackets;
        // Board-backed structures seat on the board, never through it.
        const surface=.075+(config.boardMm?.thickness||0)/1000+.0005;
        parts.push(openingJacket({T,parent:g,radius:r,profile,face,x:pipeXs[i],surface,
          start:slot.start,end:fixingIndex>=0?slot.end-.1:fixSlot.start-.1,
          fixStart:fixSlot.start,fixEnd:fixSlot.end-.1,materials,owned}));
      });
    }else if(step.kind==='brackets'){
      // Each jacket owns its hooked L brackets so they move with it when
      // seated, then the screws advance into the support on this step's clock.
    }else if(['blanket','glasswool','rubber','packing','band','insulation-band'].includes(step.kind)){
      const isWrap=['blanket','glasswool','rubber'].includes(step.kind),inside=!isWrap;
      const through=blanketPassesThrough(step);
      const mat=step.kind==='rubber'||step.kind==='band'?bandCore:step.kind==='packing'?wool:step.kind==='glasswool'?materials.glasswool:foil;
      const len=inside?.14:Math.max(.1,(step.lengthMm||700)/1000);
      if(isDuct){
        const t=step.kind==='band'?.024:step.kind==='insulation-band'?.06:thickness;
        if(step.kind==='blanket')ductBlanketSegments=[];
        const continuousFloor=isFloor&&step.kind==='blanket'&&step.text.includes('연속시공');
        const starts=inside?[[-.07,.14]]:continuousFloor?[[serviceEnds.back,length]]:through?[[-len-.075,len*2+.15]]:faces.map(face=>[face>0?.085:-.085-len,len]);
        for(const [z,l]of starts){
          const w=2.602+ductThickness*2,h=.652+ductThickness*2;
          if(step.kind==='blanket'){
            const stations=new Set([0,l/4,l/2,l*3/4,l]);
            for(const layer of ductLayers)for(const edge of [layer.from-z,layer.to-z])if(edge>.025&&edge<l-.025)for(const delta of [-.02,.02])stations.add(edge+delta);
            const profile=[...stations].sort((a,b)=>a-b).map(d=>{const depth=ductLayerAt(z+d);return {v:d/l,width:2.602+depth*2,height:.652+depth*2};});
            const blanket=wrappingBlanket({T,parent:g,inner:0,thickness:t,length:l,width:w,height:h,profile,z,start:timing.steps[index].start,end:timing.steps[index].end-.1,material:materials.blanketFoil,owned});
            Object.assign(blanket.object.userData,{coverage:continuousFloor?[serviceEnds.back,serviceEnds.front]:[z,z+l],throughSupport:through});
            parts.push(blanket);
            for(const face of [-1,1]){
              const from=Math.max(.085,Math.min(face*z,face*(z+l))),to=Math.max(face*z,face*(z+l));
              if(to>from)ductBlanketSegments.push({face,from,to,radius:(profile[0].width-2.602)/2+t,width:profile[0].width+t*2,height:profile[0].height+t*2});
            }
          }else if(['band','insulation-band'].includes(step.kind)){
            const strips=wrappedDuctBands({T,parent:g,w,h,width:l,thickness:t,z,composite:step.kind==='insulation-band',isFloor,materials,owned});
            strips.forEach((piece,i)=>{
              const part=animate(piece,index,[Math.sign(piece.position.x)*.08,Math.sign(piece.position.y)*.12,.32],i*.035,1.9);
              const home=piece.quaternion.clone(),side=['left','right'].includes(piece.userData.side);
              const axis=new T.Vector3(side?0:1,side?1:0,0),tilt=.7*(side?-Math.sign(piece.position.x):Math.sign(piece.position.y)),rotation=new T.Quaternion();
              part.update=time=>{const p=Math.max(0,Math.min(1,(time-part.start)/(part.end-part.start))),ease=p*p*(3-2*p);piece.quaternion.copy(home).premultiply(rotation.setFromAxisAngle(axis,tilt*(1-ease)));};
            });
          }else shell(w,h,l,t,mat,g,z);
        }
        for(const [z,l]of starts)ductLayers.push({from:z,to:z+l,thickness:t});
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
        const starts=inside?[[-.07,.14]]:through?[[-actualLen-.075,actualLen*2+.15]]:faces.map(face=>[face>0?.085+offset:-.085-offset-actualLen,actualLen]);
        for(const [z,l]of starts){
          if(step.kind==='blanket'){
            const blanket=wrappingBlanket({T,parent:g,inner,thickness:t,length:l,x:pipeXs[i],z,start:timing.steps[index].start,end:timing.steps[index].end-.1,material:materials.blanketFoil,owned,startAngle:isFloor?-Math.PI/2:Math.PI/2});
            Object.assign(blanket.object.userData,{coverage:[z,z+l],throughSupport:through});
            parts.push(blanket);
            for(const face of [-1,1]){
              const from=Math.max(.085,Math.min(face*z,face*(z+l))),to=Math.max(face*z,face*(z+l));
              if(to>from)blanketSegments[i].push({face,from,to,radius:inner+t});
            }
          }
          else if(step.kind==='band'){
            const wrapped=wrappedBandRing({T,parent:g,inner,thickness:t,width:l,x:pipeXs[i],z,materials,owned});
            animate(wrapped,index,[0,0,.24],i*.06,1.9);
          }else ring(inner+t,inner,l,mat,g,pipeXs[i],0,z);
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
      if(isDuct&&step.text.includes('시스템')){
        const from=Math.min(...ductBlanketSegments.map(s=>s.from)),to=Math.max(...ductBlanketSegments.map(s=>s.to));
        parts.push(...ductChannelClamps({T,parent:g,faces,from,to,maxSpacing:record.id==='FS-MP25-0224-06'?.5:.45,depthAt:ductLayerAt,slot:timing.steps[index],material:materials.channelSilver||zinc,owned}));
      }
      else {
        const text=step.text.replace(/\s/g,''),slot=timing.steps[index];
        for(const face of faces)radii.forEach((r,i)=>{
          const segments=(isDuct?ductBlanketSegments:blanketSegments[i]).filter(s=>s.face===face);
          if(text.includes('테이프'))for(const segment of segments){
            const width=Math.min(.035,(segment.to-segment.from)/4);
            for(const d of [segment.from,segment.to-width]){
              const tape=ring(segment.radius+.0015,segment.radius+.0008,width,foil,g,pipeXs[i],0,face>0?d:-d-width);
              tape.userData.component='aluminium-fixing-tape';
            }
          }
          if(!/철선|철사/.test(text))return;
          const positions=wirePositions(segments,text);
          positions.forEach((position,j)=>{
            const delay=j*(slot.duration*.32/Math.max(1,positions.length-1));
            const part=windingWire({T,parent:g,radius:position.radius,width:position.width,height:position.height,x:pipeXs[i],z:face*position.distance,face,start:slot.start+delay,end:slot.end-.1-(positions.length-1-j)*.08,material:steel,owned});
            Object.assign(part.object.userData,{pipe:i,distance:position.distance,coverage:[position.from,position.to],radius:position.radius});
            parts.push(part);
          });
        });
      }
    }
    animate(g,index,['board','sealant','jacket','fixing','blanket','band','insulation-band'].includes(step.kind)?[0,0,0]:[0,.12,.18]);
  });
  root.userData.certificate=record.id;
  const viewSpan=isDuct?3.5:Math.max(.8,ow+.35,(config.boardMm?.width||0)/1000*1.6);
  const viewPoints=isDuct?[]:null,workBounds=measureWork(T,root,work,parts,timing,viewPoints);
  return {root,room,service,work,wall,sectionSlab,parts,pipes,pipeLayout,serviceEnds,viewSpan,viewPoints,workBounds,workLength,maxDiameter:Math.max(...diameters)/1000,existingInsulation:Boolean(existingInsulation),isFloor,record,owned,blanketLayer,dispose(){root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});owned.forEach(geo=>geo.dispose());}};
}
