import * as T from '../vendor/three.module.min.js';
import {GROUND,phase,mix,mesh} from './common.js?v=20261112s9';

function smoothBevelNormals(geo){
  geo.computeVertexNormals();
  const p=geo.attributes.position,n=geo.attributes.normal;
  if(!geo.userData.sharedVertices){
    const buckets=new Map();
    for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);}
    geo.userData.sharedVertices=[...buckets.values()];
  }
  const original=n.array.slice();
  for(const group of geo.userData.sharedVertices)for(const i of group){
    const nx=original[i*3],ny=original[i*3+1],nz=original[i*3+2];if(Math.abs(nz)>.9999)continue;
    let x=0,y=0,z=0;
    for(const j of group){const a=original[j*3],b=original[j*3+1],c=original[j*3+2];if(a*nx+b*ny+c*nz>.45){x+=a;y+=b;z+=c;}}
    const d=Math.hypot(x,y,z)||1;n.setXYZ(i,x/d,y/d,z/d);
  }
  n.needsUpdate=true;
}

export async function createLogo(scene,blue,edge){
  const data=await fetch(new URL('../../media/intro/logo-vector.json?v=20261112s9',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Logo contour unavailable');return r.json();});
  const cv=p=>new T.Vector2((p[0]-data.origin[0])*data.scale,(data.origin[1]-p[1])*data.scale);
  const contours=data.smooth||data;
  const outer=contours.outer.map(cv),hole=contours.hole.map(cv),dot=contours.dot.map(cv),holeCenter=cv(data.holeCenter),dotCenter=cv(data.dotCenter);
  const path=(name,Shape=T.Shape,scale=1)=>{
    const source=data.paths[name],p=new Shape();
    const point=(x,y)=>{const v=cv([x,y]);return scale===1?v:dotCenter.clone().add(v.sub(dotCenter).multiplyScalar(scale));};
    const start=point(...source.start);p.moveTo(start.x,start.y);
    for(const c of source.curves){const a=point(c[0],c[1]),b=point(c[2],c[3]),end=point(c[4],c[5]);p.bezierCurveTo(a.x,a.y,b.x,b.y,end.x,end.y);}p.closePath();return p;
  };
  const shape=(name,holes=[])=>{const s=path(name);for(const [key,scale=1]of holes)s.holes.push(path(key,T.Path,scale));return s;};
  const extrude=s=>{const g=new T.ExtrudeGeometry(s,{depth:.14,bevelEnabled:true,bevelThickness:.013,bevelSize:.009,bevelSegments:6,curveSegments:72});g.translate(0,0,-.07);smoothBevelNormals(g);return g;};
  const root=new T.Group();scene.add(root);
  const solid=mesh(extrude(shape('outer')),[blue,edge],root);
  const hollow=mesh(extrude(shape('outer',[['hole']])),[blue,edge],root);
  const plug=mesh(extrude(shape('hole')),[blue,edge],root);
  const dotSolid=mesh(extrude(shape('dot')),[blue,edge],root);
  root.traverse(o=>{if(o.isMesh)o.receiveShadow=false;});
  const source=plug.geometry.attributes.position.array.slice(),target=source.slice();
  const b=data.bounds,holeRX=(b.hole.right-b.hole.left)*data.scale/2,holeRY=(b.hole.bottom-b.hole.top)*data.scale/2;
  const dotRX=(b.dot.right-b.dot.left)*data.scale/2,dotRY=(b.dot.bottom-b.dot.top)*data.scale/2;
  for(let i=0;i<source.length;i+=3){target[i]=dotCenter.x+(source[i]-holeCenter.x)*dotRX/holeRX;target[i+1]=dotCenter.y+(source[i+1]-holeCenter.y)*dotRY/holeRY;}
  // Fit only the actual straight lower-left edge for the pressing direction.
  const cut=data.outer.filter(p=>p[0]<171&&p[1]>86),mx=cut.reduce((s,p)=>s+p[0],0)/cut.length,my=cut.reduce((s,p)=>s+p[1],0)/cut.length;
  const slope=cut.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0)/cut.reduce((s,p)=>s+(p[0]-mx)**2,0),pressAngle=Math.atan(slope);
  const rotate=(p,a)=>new T.Vector2(p.x*Math.cos(a)-p.y*Math.sin(a),p.x*Math.sin(a)+p.y*Math.cos(a));
  const pressed=outer.map(p=>rotate(p,pressAngle)),minY=Math.min(...pressed.map(p=>p.y));
  const foot=pressed.filter(p=>p.y<minY+.045),footLeft=Math.min(...foot.map(p=>p.x)),footRight=Math.max(...foot.map(p=>p.x));
  const fireX=-.7,pressX=fireX-(footLeft+footRight)/2;
  let previous=-1,lastTime=0;
  function floorCenter(angle,scale=1){return GROUND-Math.min(...outer.map(p=>rotate(p,angle).y))*scale+.014;}
  function update(t,spit){
    lastTime=t;
    solid.visible=t<10.15;hollow.visible=t>=10.15;
    plug.visible=t>=10.15&&spit<1;
    dotSolid.visible=spit===1;
    if(spit!==previous){
      const pos=plug.geometry.attributes.position;
      for(let i=0;i<source.length;i+=3){pos.array[i]=mix(source[i],target[i],spit);pos.array[i+1]=mix(source[i+1],target[i+1],spit)+Math.sin(spit*Math.PI)*.55;pos.array[i+2]=source[i+2]+Math.sin(spit*Math.PI)*.85;}
      pos.needsUpdate=true;smoothBevelNormals(plug.geometry);plug.geometry.computeBoundingSphere();previous=spit;
    }
  }
  const ray=new T.Raycaster();
  function filledAt(local,objects){root.updateMatrixWorld(true);const p=root.localToWorld(new T.Vector3(local.x,local.y,4));const q=root.getWorldQuaternion(new T.Quaternion());ray.set(p,new T.Vector3(0,0,-1).applyQuaternion(q));return objects.filter(o=>o.visible).some(o=>ray.intersectObject(o).length>0);}
  function probe(){return{dCenterFilled:filledAt(holeCenter,[solid,hollow,plug]),oCenterFilled:filledAt(dotCenter,[dotSolid]),solidD:solid.visible,solidO:dotSolid.visible&&lastTime<14.85,remainingOInLogo:dotSolid.visible&&lastTime<14.85,dotRing:false};}
  const seedContour=path('dot').getPoints(32).map(p=>new T.Vector2((p.x-dotCenter.x)/dotRX,(p.y-dotCenter.y)/dotRY));
  return{root,solid,hollow,plug,dotSolid,dotCenter,dotRX,dotRY,pressAngle,pressX,footLeft,footRight,floorCenter,update,probe,seedContour,sourceSize:[data.width,data.height]};
}

// The actual logo O keeps its mesh identity as its entire silhouette opens
// and rounds into the jacket. There is no second circle or leftover O ring.
export function createSeed(material,contour,existingMesh){
  const geo=new T.TorusGeometry(1.13,.245,64,256),target=geo.attributes.position.array.slice();
  const radii=new Map();
  function contourRadius(a){
    const id=Math.round(a*1e5);if(radii.has(id))return radii.get(id);
    const dx=Math.cos(a),dy=Math.sin(a);let radius=1;
    for(let i=0;i<contour.length;i++){
      const p=contour[i],q=contour[(i+1)%contour.length],ex=q.x-p.x,ey=q.y-p.y,den=dx*ey-dy*ex;
      if(Math.abs(den)<1e-9)continue;
      const r=(p.x*ey-p.y*ex)/den,u=(p.x*dy-p.y*dx)/den;
      if(r>0&&u>=0&&u<=1){radius=r;break;}
    }
    radii.set(id,radius);return radius;
  }
  const factors=Array.from({length:target.length/3},(_,i)=>contourRadius(Math.atan2(target[i*3+1],target[i*3])));
  const seed=existingMesh||new T.Mesh(geo,material);
  if(existingMesh){seed.geometry.dispose();seed.geometry=geo;seed.material=material;}
  seed.name='logo-o-to-jacket';seed.castShadow=true;seed.receiveShadow=false;let previous=-1;
  function update(open,thin=0){
    const key=open+thin*10;if(key===previous)return;previous=key;
    const pos=geo.attributes.position;
    const inner=mix(.885,1.09,thin)*open,outer=1.375,center=(outer+inner)/2,tube=(outer-inner)/2;
    for(let i=0;i<pos.count;i++){
      const x=target[i*3],y=target[i*3+1],z=target[i*3+2],a=Math.atan2(y,x),r=Math.hypot(x,y);
      const phi=Math.atan2(z,r-1.13),rad=(center+tube*Math.cos(phi))*mix(factors[i],1,open);
      const lip=Math.cos(phi)<0?mix(.002,.18,open):.18,flatZ=.20*Math.max(-1,Math.min(1,Math.sin(phi)/lip)),roundZ=.245*Math.sin(phi);
      pos.setXYZ(i,Math.cos(a)*rad,Math.sin(a)*rad,mix(flatZ,roundZ,open));
    }
    pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
  }
  const ray=new T.Raycaster();
  function centerFilled(){seed.updateMatrixWorld(true);const p=seed.localToWorld(new T.Vector3(.005,0,4));ray.set(p,new T.Vector3(0,0,-1).applyQuaternion(seed.getWorldQuaternion(new T.Quaternion())));return ray.intersectObject(seed).length>0;}
  update(0);return{seed,update,centerFilled};
}
