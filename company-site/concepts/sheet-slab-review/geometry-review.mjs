import * as T from '../../assets/js/vendor/three.module.min.js';
import {buildAssembly} from '../../assets/js/assemblies.js';
import {connectServices} from '../../assets/js/installation-services.js';
import {applyAssemblyTime,fitInstallation} from '../../assets/js/installation-view.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const records=JSON.parse(await fs.readFile(new URL('../../assets/data/installation-certificates.json',import.meta.url))).certificates;
const materials=Object.fromEntries(['concrete','steel','zinc','pvc','foil','blanketFoil','wool','mineral','bandCore','whiteSeal','copper','glasswool','cartridgeWhite','cartridgeLabel','gun'].map(k=>[k,new T.MeshStandardMaterial()]));
const results=[];
for(const record of records){
 const parent=new T.Group(),a=buildAssembly({T,parent,record,bayWidth:7,materials,CY:1.65,WALL_Z:-.55});
 const route=connectServices({T,parent,assembly:a,materials,CY:1.65,WALL_Z:-.55,level:3.3});
 assert.ok(a.serviceEnds.front-a.serviceEnds.back>=7,record.id+': truncated pipe');
 if(!a.isFloor){assert.equal(route.root.children.length,a.pipeLayout.length);assert.equal(route.root.userData.ends.lower[1],a.serviceEnds.front);assert.equal(route.root.userData.ends.upper[1],a.serviceEnds.front);}
 const sheets=a.parts.filter(p=>p.object.userData.component==='blanket-wrap');
 assert.equal(sheets.length>0,record.steps.some(s=>s.kind==='blanket'));
 for(const part of sheets){
  const mesh=part.object.children[0];assert.equal(mesh.material,materials.blanketFoil);
  assert.equal(part.object.children.length,1,record.id+': mismatched side material');
  let flat;
  for(const ratio of [0,.35,.7,1,.4,1]){
   applyAssemblyTime(a.parts,part.start+(part.end-part.start)*ratio);
   const data=part.object.userData;
   assert.ok(Math.abs(data.flatLength+data.wrapped*data.sheetWidth-data.sheetWidth)<1e-6);
   for(const key of ['position','normal'])for(const value of mesh.geometry.attributes[key].array)assert.ok(Number.isFinite(value));
   if(ratio===0){assert.equal(data.wrapped,0);flat=Array.from(mesh.geometry.attributes.position.array);}
   if(ratio===1){assert.equal(data.flatLength,0);assert.equal(data.wrapped,1);assert.notDeepEqual(Array.from(mesh.geometry.attributes.position.array),flat);}
  }
 }
 const fits=[];
 for(const aspect of [2.17,1.5,.82]){
  const camera=new T.PerspectiveCamera(34,aspect,.1,200),front=fitInstallation(T,a,camera,1),back=fitInstallation(T,a,camera,-1);
  if(a.isFloor){assert.deepEqual(front.position.toArray(),back.position.toArray());assert.deepEqual(front.target.toArray(),back.target.toArray());assert.ok(front.position.distanceTo(front.target)>=4.2);}
  for(const fit of a.isFloor?[front]:[front,back]){
   if(fit.bounds.isEmpty()||fit.preservedSmall)continue;
   camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld(true);
   for(const x of [fit.bounds.min.x,fit.bounds.max.x])for(const y of [fit.bounds.min.y,fit.bounds.max.y])for(const z of [fit.bounds.min.z,fit.bounds.max.z]){
    const p=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=.861&&Math.abs(p.y)<=.841,record.id+': clipping');
   }
   if(a.isFloor){
    a.sectionSlab.updateWorldMatrix(true,false);
    for(const z of [-.2,.2]){
     const point=new T.Vector3(0,-.45,z).applyMatrix4(a.root.matrixWorld),direction=point.clone().sub(camera.position),distance=direction.length();
     const hits=new T.Raycaster(camera.position,direction.normalize(),0,distance-.001).intersectObject(a.sectionSlab);
     assert.equal(hits.length,0,record.id+': slab hides work face');
    }
   }
  }
  fits.push({aspect,distance:front.position.distanceTo(front.target),target:front.target.toArray(),camera:front.position.toArray()});
 }
 results.push({id:record.id,sheets:sheets.length,floor:a.isFloor,serviceEnds:a.serviceEnds,routePipes:route.root.children.length,fits});route.dispose();a.dispose();
}
await fs.writeFile(new URL('./geometry-checks.json',import.meta.url),JSON.stringify({passed:true,certificates:results.length,results},null,2)+'\n');
console.log('All 60: continuous pipes, single-material flat sheets, reversible wrapping, both slab faces and camera fit passed.');
