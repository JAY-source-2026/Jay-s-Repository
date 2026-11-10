// A continuous sheet unrolls onto a rounded rectangular perimeter. The free
// material stays in a compact roll tangent to the duct, like feeding a blanket
// around a pipe; it never opens into two rigid flaps.
export function wrappingDuctBlanket({T,parent,thickness,length,width,height,profile,x=0,z,start,end,material,owned}) {
  const root=new T.Group();parent.add(root);root.position.set(x,0,z);
  Object.assign(root.userData,{component:'blanket-wrap',shape:'continuous-rectangular-wrap'});
  const home=root.position.clone(),columns=448;
  const rows=profile||Array.from({length:5},(_,i)=>({v:i/4,width,height}));
  function perimeter(w,h){
    const radius=thickness/2+.001,halfW=w/2+radius,halfH=h/2+radius;
    const path=new T.Path();
    path.moveTo(halfW,-halfH+radius);path.lineTo(halfW,halfH-radius);
    path.absarc(halfW-radius,halfH-radius,radius,0,Math.PI/2,false);
    path.lineTo(-halfW+radius,halfH);
    path.absarc(-halfW+radius,halfH-radius,radius,Math.PI/2,Math.PI,false);
    path.lineTo(-halfW,-halfH+radius);path.absarc(-halfW+radius,-halfH+radius,radius,Math.PI,Math.PI*1.5,false);
    path.lineTo(halfW-radius,-halfH);path.absarc(halfW-radius,-halfH+radius,radius,Math.PI*1.5,Math.PI*2,false);
    path.arcLengthDivisions=2048;
    const total=path.getLength();
    const section=u=>{const p=path.getPointAt(u),t=path.getTangentAt(u);return {x:p.x,y:p.y,tx:t.x,ty:t.y,nx:t.y,ny:-t.x};};
    const lengths=path.curves.map(c=>c.getLength()),weights=lengths.map((len,i)=>len+(path.curves[i].isEllipseCurve?.8:0)),weight=weights.reduce((a,b)=>a+b,0);
    function travel(p){let q=p*weight,distance=0;for(let i=0;i<weights.length;i++){if(q<=weights[i])return (distance+lengths[i]*q/weights[i])/total;q-=weights[i];distance+=lengths[i];}return 1;}
    return {total,section,travel,closed:Array.from({length:columns+1},(_,i)=>section(i/columns))};
  }
  const sections=rows.map(r=>({...r,...perimeter(r.width,r.height)}));
  const descriptors=[],uv=[],indices=[];
  function surface(cols,nrows,map,reverse=false){
    const base=descriptors.length;
    for(let j=0;j<=nrows;j++)for(let i=0;i<=cols;i++){const d=map(i,j);descriptors.push(d);uv.push(d.u,rows[d.row].v);}
    for(let j=0;j<nrows;j++)for(let i=0;i<cols;i++){const a=base+j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;indices.push(...(reverse?[a,c,b,b,c,d]:[a,b,c,b,d,c]));}
  }
  surface(columns,rows.length-1,(i,j)=>({u:i/columns,row:j,w:.5}));
  surface(columns,rows.length-1,(i,j)=>({u:i/columns,row:j,w:-.5}),true);
  surface(columns,1,(i,j)=>({u:i/columns,row:0,w:j-.5}));
  surface(columns,1,(i,j)=>({u:i/columns,row:rows.length-1,w:j-.5}),true);
  surface(1,rows.length-1,(i,j)=>({u:0,row:j,w:i-.5}));
  surface(1,rows.length-1,(i,j)=>({u:1,row:j,w:i-.5}),true);
  const geometry=new T.BufferGeometry();owned.add(geometry);
  geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(descriptors.length*3),3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const sheet=new T.Mesh(geometry,material);sheet.receiveShadow=true;sheet.userData.component='blanket-sheet';root.add(sheet);
  const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  const pitch=thickness+.0015,k=pitch/(2*Math.PI),core=Math.max(.045,thickness*1.2);
  const integral=r=>(r*Math.hypot(r,k)+k*k*Math.asinh(r/k))/(2*k),baseIntegral=integral(core);
  function roll(total){
    let radius=Math.sqrt(core*core+2*k*total);
    for(let i=0;i<4;i++)radius-=(integral(radius)-baseIntegral-total)*k/Math.hypot(radius,k);
    const top=integral(radius),angle0=-Math.atan(k/radius);
    return distance=>{
      let r=Math.sqrt(Math.max(core*core,radius*radius-2*k*distance));
      for(let i=0;i<3;i++)r-=(integral(r)-(top-distance))*k/Math.hypot(r,k);
      const angle=angle0+(radius-r)/k,c=Math.cos(angle),s=Math.sin(angle),norm=Math.hypot(r,k);
      return {t:r*s-radius*Math.sin(angle0),n:radius*Math.cos(angle0)-r*c,tt:(r*c-k*s)/norm,tn:(r*s+k*c)/norm};
    };
  }
  let previous=-1;
  function update(time){
    const p=clamp((time-start)/(end-start));if(p===previous)return;previous=p;
    const wrapped=sections[0].travel(smooth(p)),frames=sections.map(section=>{
      const localWrapped=section.travel(smooth(p)),attached=section.total*localWrapped,contact=section.section(localWrapped),free=roll(section.total-attached);
      return section.closed.map((closed,i)=>{
        const distance=i/columns*section.total-attached;
        if(distance<=0)return closed;
        const coil=free(distance),tx=contact.tx*coil.tt+contact.nx*coil.tn,ty=contact.ty*coil.tt+contact.ny*coil.tn;
        return {x:contact.x+contact.tx*coil.t+contact.nx*coil.n,y:contact.y+contact.ty*coil.t+contact.ny*coil.n,nx:ty,ny:-tx};
      });
    });
    const positions=geometry.attributes.position;
    descriptors.forEach(({u,row,w},i)=>{const f=frames[row][Math.round(u*columns)],v=rows[row].v,crease=.00025*Math.sin(u*sections[row].total*47+v*length*21),offset=w*thickness+crease;positions.setXYZ(i,f.x+f.nx*offset,f.y+f.ny*offset,v*length);});
    positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    Object.assign(root.userData,{progress:p,wrapped,flatLength:sections[0].total*(1-wrapped),sheetWidth:sections[0].total,stage:p===1?'closed':'unroll-and-wrap'});
  }
  update(0);return {object:root,home,offset:new T.Vector3(),start,end,face:1,update};
}
