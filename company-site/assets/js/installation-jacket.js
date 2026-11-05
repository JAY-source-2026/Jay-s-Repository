// An opened metal jacket closes around an already installed pipe, then latches.
export function openingJacket({T,parent,radius,depth,face,x,start,end,materials,owned}) {
  const root=new T.Group();parent.add(root);
  root.position.set(x,0,face>0?.083:-.083-depth);
  root.userData.component='jacket-clamp';root.userData.workFace=face;
  const home=root.position.clone(),halves=[],hingeRadius=radius+.027;
  const add=(geo,mat,owner)=>{owned.add(geo);const m=new T.Mesh(geo,mat);owner.add(m);m.castShadow=false;m.receiveShadow=true;return m;};
  const box=(w,h,d,mat,owner,x,y,z)=>{const m=add(new T.BoxGeometry(w,h,d),mat,owner);m.position.set(x,y,z);return m;};
  function segment(inner,outer,a,b,owner,mat){
    const s=new T.Shape();s.absarc(0,0,outer,a,b,false);s.absarc(0,0,inner,b,a,true);s.closePath();
    const geometry=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:48});geometry.translate(hingeRadius,0,0);
    add(geometry,mat,owner);
  }
  for(const sign of [1,-1]){
    const half=new T.Group();root.add(half);half.position.x=-hingeRadius;halves.push({half,sign});
    half.userData.component='jacket-opening-half';
    const a=sign>0?0:Math.PI,b=a+Math.PI;
    segment(radius,radius+.025,a,b,half,materials.bandCore);
    segment(radius+.025,radius+.027,a,b,half,materials.zinc);
    for(let j=0;j<12;j++){
      const angle=a+(j+.5)*Math.PI/12;
      const lip=box(.014,.019,.002,materials.zinc,half,hingeRadius+Math.cos(angle)*(radius+.017),Math.sin(angle)*(radius+.017),face>0?depth:0);
      lip.rotation.z=angle-Math.PI/2;
    }
    const tab=box(.028,.025,depth*.7,materials.zinc,half,hingeRadius+radius+.034,sign*.012,depth/2);
    tab.userData.component='jacket-latch-tab';
    for(const z of [.3,.6])box(.018,.002,.006,materials.bandCore,half,hingeRadius+radius+.034,sign*.026,depth*z);
  }
  const hinge=add(new T.CylinderGeometry(.006,.006,depth,12),materials.steel,root);
  hinge.rotation.x=Math.PI/2;hinge.position.set(-hingeRadius,0,depth/2);
  const latch=new T.Group();root.add(latch);latch.position.set(radius+.05,0,depth/2);
  box(.008,.055,.012,materials.steel,latch,0,0,0);
  box(.025,.007,.012,materials.steel,latch,-.009,-.024,0);
  latch.userData.component='jacket-latch';
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  function update(time){
    const p=Math.max(0,Math.min(1,(time-start)/(end-start)));
    const angle=(1-smooth((p-.24)/.48))*1.12;
    for(const {half,sign}of halves)half.rotation.z=sign*angle;
    root.position.copy(home);root.position.x-=.16*(1-smooth(p/.25));root.position.z+=face*.14*(1-smooth(p/.25));
    const lock=smooth((p-.76)/.2);latch.visible=p>.72;latch.rotation.x=(1-lock)*Math.PI/2;
    root.userData.openAngle=angle;root.userData.latched=p>=.96;root.userData.progress=p;
  }
  update(0);
  return {object:root,home,offset:new T.Vector3(),start,end,face:1,update};
}
