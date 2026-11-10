import * as T from '../../assets/js/vendor/three.module.min.js';
import {buildAssembly} from '../../assets/js/assemblies.js';
import {applyAssemblyTime,fitInstallation} from '../../assets/js/installation-view.js';
import {installationTimeline} from '../../assets/js/installation-motion.js';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const backup=JSON.parse(await fs.readFile(new URL('backup.json',import.meta.url)));
const baseline=await fs.readFile(new URL('../../../'+backup.backup+'/assets/js/assemblies.js',import.meta.url),'utf8');
const resolved=baseline.replaceAll("from './", "from '"+new URL('../../assets/js/',import.meta.url).href);
const {buildAssembly:buildBefore}=await import('data:text/javascript;base64,'+Buffer.from(resolved).toString('base64'));
const records=JSON.parse(await fs.readFile(new URL('../../assets/data/installation-certificates.json',import.meta.url))).certificates;
const materials=Object.fromEntries(['concrete','steel','zinc','channelSilver','pvc','foil','blanketFoil','wool','mineral','bandCore','whiteSeal','copper','glasswool','cartridgeWhite','cartridgeLabel','gun'].map(k=>[k,new T.MeshStandardMaterial({side:T.DoubleSide})]));
const build=(record,fn=buildAssembly)=>fn({T,parent:new T.Group(),record,bayWidth:5.4,materials,CY:1.65,WALL_Z:-.55});
function meshHash(a){
 const hash=crypto.createHash('sha256');
 a.root.traverse(o=>{if(!o.isMesh)return;hash.update(JSON.stringify([o.position.toArray(),o.rotation.toArray(),o.scale.toArray()]));hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));});
 return hash.digest('hex');
}
const results=[];
for(const record of records){
 const a=build(record),before=build(record,buildBefore),timing=installationTimeline(record);
 applyAssemblyTime(a.parts,timing.complete);applyAssemblyTime(before.parts,timing.complete);
 const changed=meshHash(a)!==meshHash(before);
 assert.equal(changed,record.id==='FS-MP26-0507-14',record.id+' unexpected geometry change');
 const checks=[];
 if(record.title.includes('중공부')){
  const first=a.parts.find(p=>p.object.userData.component==='blanket-wrap');
  assert.equal(first.object.userData.throughSupport,true,record.id);
  const [from,to]=first.object.userData.coverage;
  assert.ok(from<-.075&&to>.075,record.id+' coverage');
  // Ray-test the rendered triangles at both support faces and inside the wall,
  // not just the declared span. Every side must have continuous insulation.
  const mesh=first.object.children.find(o=>o.isMesh);
  for(const progress of [1,0,.5,1]){
   applyAssemblyTime(a.parts,first.start+(first.end-first.start)*progress);
   a.root.updateWorldMatrix(true,true);
   assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));
   if(progress!==1)continue;
   for(const z of [-.08,-.074,0,.074,.08])for(const angle of [.1,Math.PI/2+.1,Math.PI+.1,Math.PI*1.5+.1]){
    const x=Math.cos(angle),y=Math.sin(angle);
    const origin=a.root.localToWorld(new T.Vector3(0,0,z));
    const direction=new T.Vector3(x,y,0).transformDirection(a.root.matrixWorld);
    const hits=new T.Raycaster(origin,direction).intersectObject(mesh);
    assert.ok(hits.length,`${record.id} missing blanket at z=${z}, direction=${x},${y}`);
    checks.push({z,direction:[x,y],distance:hits[0].distance});
   }
  }
  if(record.category==='duct')for(const aspect of [4.5,3,1.5,.8]){
   const camera=new T.PerspectiveCamera(34,aspect,.1,200),fit=fitInstallation(T,a,camera);
   camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld();
   for(const point of a.viewPoints.filter(p=>a.isFloor||p.z>=0)){
    const p=point.clone().applyMatrix4(a.root.matrixWorld).project(camera);
    assert.ok(Math.abs(p.x)<.861&&Math.abs(p.y)<.841,record.id+' camera clips work');
   }
  }
  if(record.id==='FS-MP26-0507-14'){
   assert.deepEqual(first.object.userData.coverage,[-1.075,1.075]);
   assert.equal(a.parts.filter(p=>p.object.userData.throughSupport).length,1);
   assert.equal(a.parts.filter(p=>p.object.userData.component==='blanket-wrap').length,5);
   assert.equal(before.parts.filter(p=>p.object.userData.component==='blanket-wrap').length,6);
  }
  if(record.id==='FS-MP26-0507-15')assert.deepEqual(first.object.userData.coverage,[a.serviceEnds.back,a.serviceEnds.front]);
 }
 results.push({id:record.id,geometryChanged:changed,throughTriangleChecks:checks});
 a.dispose();before.dispose();console.log(record.id,'passed');
}
await fs.writeFile(new URL('geometry-checks.json',import.meta.url),JSON.stringify({passed:true,records:results.length,results},null,2)+'\n');
