// One foil-covered sheet: the attached length bends around the service while
// the remaining material stays flat and tangent to the moving contact point.
import { wrappingDuctBlanket } from './installation-duct-blanket.js?v=20261109r7';
// Some source PDFs say “install on the service inside the support” rather
// than “pass through”; both require insulation across the support's depth.
export function blanketPassesThrough(step) {
  return step.kind==='blanket' && (step.through || /지지구조내부관통재도설치/.test(step.text.replace(/\s/g,'')));
}
export function wrappingBlanket({T,parent,inner,thickness,length,width,height,profile,x=0,z,start,end,material,owned,startAngle=Math.PI/2}) {
  if(width&&height)return wrappingDuctBlanket({T,parent,thickness,length,width,height,profile,x,z,start,end,material,owned});
  const root=new T.Group();parent.add(root);root.position.set(x,0,z);
  root.userData.component='blanket-wrap';
  const home=root.position.clone(),radius=inner+thickness/2;
  let outline,perimeter;
  if(width&&height){
    const w=(width+thickness)/2,h=(height+thickness)/2,c=thickness/2+.002;
    outline=new T.Path();outline.moveTo(w-c,h);
    outline.lineTo(-w+c,h);outline.quadraticCurveTo(-w,h,-w,h-c);
    outline.lineTo(-w,-h+c);outline.quadraticCurveTo(-w,-h,-w+c,-h);
    outline.lineTo(w-c,-h);outline.quadraticCurveTo(w,-h,w,-h+c);
    outline.lineTo(w,h-c);outline.quadraticCurveTo(w,h,w-c,h);
    perimeter=outline.getLength();
  }else perimeter=2*Math.PI*radius;
  const segments=outline?192:96,axial=4;
  function section(u){
    if(outline){const p=outline.getPointAt(u),t=outline.getTangentAt(u);return {x:p.x,y:p.y,tx:t.x,ty:t.y,nx:t.y,ny:-t.x};}
    const a=startAngle+u*2*Math.PI,c=Math.cos(a),s=Math.sin(a);return {x:radius*c,y:radius*s,tx:-s,ty:c,nx:c,ny:s};
  }
  const curved=Array.from({length:segments+1},(_,i)=>section(i/segments));
  const descriptors=[],uv=[],indices=[];
  function surface(columns,rows,map,reverse=false){
    const base=descriptors.length;
    for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
      const d=map(i/columns,j/rows);descriptors.push(d);uv.push(i/columns,j/rows);
    }
    for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
      const a=base+j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;
      indices.push(...(reverse?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
    }
  }
  surface(segments,axial,(u,v)=>({u,v,w:.5}));
  surface(segments,axial,(u,v)=>({u,v,w:-.5}),true);
  surface(segments,1,(u,w)=>({u,v:0,w:w-.5}));
  surface(segments,1,(u,w)=>({u,v:1,w:w-.5}),true);
  surface(1,axial,(w,v)=>({u:0,v,w:w-.5}));
  surface(1,axial,(w,v)=>({u:1,v,w:w-.5}),true);
  const geometry=new T.BufferGeometry();owned.add(geometry);
  geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(descriptors.length*3),3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const sheet=new T.Mesh(geometry,material);sheet.castShadow=false;sheet.receiveShadow=true;sheet.userData.component='blanket-sheet';root.add(sheet);
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  let previous=-1;
  function update(time){
    const p=clamp((time-start)/(end-start));if(p===previous)return;previous=p;
    const wrapped=smooth((p-.1)/.9),contact=section(wrapped),attached=perimeter*wrapped;
    const approach=.08*(1-smooth(p/.15));root.position.copy(home);root.position.x+=curved[0].nx*approach;root.position.y+=curved[0].ny*approach;
    const positions=geometry.attributes.position;
    for(let i=0;i<descriptors.length;i++){
      const {u,v,w}=descriptors[i],s=u*perimeter,axialZ=v*length;
      const onCurve=s<=attached,frame=onCurve?curved[Math.round(u*segments)]:contact;
      const loose=onCurve?0:s-attached;
      const crease=.0005*Math.sin(s*47+axialZ*21)+.00035*Math.sin(s*89-axialZ*37);
      const offset=w*thickness+crease;
      positions.setXYZ(i,frame.x+frame.tx*loose+frame.nx*offset,frame.y+frame.ty*loose+frame.ny*offset,axialZ);
    }
    positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    Object.assign(root.userData,{progress:p,wrapped,flatLength:perimeter-attached,sheetWidth:perimeter});
  }
  update(0);
  return {object:root,home,offset:new T.Vector3(),start,end,face:1,update};
}
