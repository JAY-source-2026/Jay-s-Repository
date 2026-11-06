// Continuous background services connect both storeys. They are explanatory
// building routes, independent of the certificate's local installation detail.
export function connectServices({T,parent,assembly,materials,CY,WALL_Z,level}){
  const root=new T.Group();parent.add(root);root.position.z=WALL_Z;
  root.userData.component='continuous-service-route';
  const owned=[];
  if(!assembly.isFloor){
    const duct=assembly.record.category==='duct',end=assembly.serviceEnds.front;
    const radius=duct?.55:.4,upperY=CY+level,front=end+radius;
    for(const pipe of assembly.pipeLayout){
      const V=(y,z)=>new T.Vector3(pipe.x,y,z),curve=new T.CurvePath();
      curve.add(new T.QuadraticBezierCurve3(V(CY,end),V(CY,front),V(CY+radius,front)));
      curve.add(new T.LineCurve3(V(CY+radius,front),V(upperY-radius,front)));
      curve.add(new T.QuadraticBezierCurve3(V(upperY-radius,front),V(upperY,front),V(upperY,end)));
      let geometry,material=pipe.material;
      if(duct){
        const corners=[[-1.301,-.326],[1.301,-.326],[1.301,.326],[-1.301,.326]],positions=[],indices=[],segments=64;
        for(let i=0;i<=segments;i++){
          const p=curve.getPointAt(i/segments),t=curve.getTangentAt(i/segments),n=new T.Vector3(0,-t.z,t.y).normalize();
          for(const [x,h]of corners)positions.push(p.x+x,p.y+n.y*h,p.z+n.z*h);
        }
        for(let i=0;i<segments;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;indices.push(a,b,a+4,b,b+4,a+4);}
        geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();material=materials.zinc;
      }else geometry=new T.TubeGeometry(curve,64,pipe.radius,32,false);
      owned.push(geometry);const mesh=new T.Mesh(geometry,material);mesh.userData.component='continuous-service-bend';root.add(mesh);
    }
    root.userData.ends={lower:[CY,end],upper:[upperY,end]};
  }
  return {root,dispose(){root.removeFromParent();owned.forEach(g=>g.dispose());}};
}
