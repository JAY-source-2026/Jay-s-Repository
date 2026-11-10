// Galvanized, slotted C channels and threaded-rod clamps from the two wall
// duct specifications. Small slot/lip dimensions are illustrative details.
export function ductChannelClamps({T,parent,faces,from,to,maxSpacing,depthAt,slot,material,owned}) {
  const parts=[],length=2.9,profile=.04,t=.002;
  const web=new T.Shape();web.moveTo(-length/2,-profile/2);web.lineTo(length/2,-profile/2);web.lineTo(length/2,profile/2);web.lineTo(-length/2,profile/2);web.closePath();
  for(let x=-1.4;x<1.401;x+=.07){const hole=new T.Path(),r=.007,half=.012;hole.moveTo(x-half,-r);hole.lineTo(x+half,-r);hole.absarc(x+half,0,r,-Math.PI/2,Math.PI/2,false);hole.lineTo(x-half,r);hole.absarc(x-half,0,r,Math.PI/2,Math.PI*1.5,false);web.holes.push(hole);}
  const webGeo=new T.ExtrudeGeometry(web,{depth:t,bevelEnabled:false,curveSegments:6});webGeo.rotateX(-Math.PI/2);owned.add(webGeo);
  const flange=new T.BoxGeometry(length,profile-t,t),lip=new T.BoxGeometry(length,t,.006);owned.add(flange);owned.add(lip);
  const washer=new T.TorusGeometry(.009,.0015,6,16);washer.rotateX(Math.PI/2);owned.add(washer);
  const nut=new T.CylinderGeometry(.0105,.0105,.008,6);owned.add(nut);
  function mesh(geometry,owner,x,y,z){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;owner.add(m);return m;}
  function animate(object,start,end,offset){parts.push({object,home:object.position.clone(),offset:new T.Vector3(...offset),start,end,face:1});}
  const first=from+.05,last=to-.05,count=Math.max(2,Math.ceil((last-first)/maxSpacing)+1);
  faces.forEach(face=>{for(let i=0;i<count;i++){
    const distance=first+(last-first)*i/(count-1),z=face*distance,outerH=.652+depthAt(z)*2;
    const clamp=new T.Group();parent.add(clamp);clamp.position.z=z;
    Object.assign(clamp.userData,{component:'duct-channel-clamp',distance,face,spacing:(last-first)/(count-1),channelLength:length,channelWidth:profile,channelThickness:t});
    for(const sign of [-1,1]){
      const bar=new T.Group();clamp.add(bar);bar.position.y=sign*(outerH/2+.002);bar.scale.y=sign;bar.userData.component='system-channel';
      mesh(webGeo,bar,0,0,0);
      for(const side of [-1,1]){mesh(flange,bar,0,(profile+t)/2,side*(profile-t)/2);mesh(lip,bar,0,profile-t/2,side*(profile/2-.003));}
      animate(bar,slot.start+i*.12,slot.start+1.05+i*.12,[0,sign*.14,.08]);
    }
    const rodLength=outerH+.14,thread=[];
    for(let y=-rodLength/2;y<=rodLength/2;y+=.006){thread.push(new T.Vector2(.0052,y),new T.Vector2(.006,y+.002));}
    const rodGeo=new T.LatheGeometry(thread,8);owned.add(rodGeo);
    for(const x of [-1.425,1.425]){
      const rod=mesh(rodGeo,clamp,x,0,0);rod.userData.component='channel-threaded-rod';animate(rod,slot.start+.55,slot.start+1.55,[0,.16,0]);
      const hardware=new T.Group();clamp.add(hardware);hardware.userData.component='channel-fasteners';
      for(const sign of [-1,1]){mesh(washer,hardware,x,sign*(outerH/2+.006),0);for(const y of [.012,.02])mesh(nut,hardware,x,sign*(outerH/2+y),0);}
      animate(hardware,slot.start+1.2,slot.end-.12,[0,0,.08]);
    }
  }});
  return parts;
}
