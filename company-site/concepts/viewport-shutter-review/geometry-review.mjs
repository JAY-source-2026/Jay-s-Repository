import * as T from '../../assets/js/vendor/three.module.min.js';
import {buildAssembly} from '../../assets/js/assemblies.js';
import {fitInstallation} from '../../assets/js/installation-view.js';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url),records=JSON.parse(await fs.readFile(new URL('../../assets/data/installation-certificates.json',import.meta.url))).certificates;
const materials=Object.fromEntries(['concrete','steel','zinc','channelSilver','pvc','foil','blanketFoil','wool','mineral','bandCore','whiteSeal','copper','glasswool','cartridgeWhite','cartridgeLabel','gun'].map(k=>[k,new T.MeshStandardMaterial()]));
const results=[];
for(const record of records.filter(r=>r.category==='duct')){
 const assembly=buildAssembly({T,parent:new T.Group(),record,bayWidth:5.4,materials,CY:1.65,WALL_Z:-.55});
 const fits=[];
 const points=assembly.viewPoints.filter(p=>assembly.isFloor||p.z>=0).map(p=>p.clone());
 if(assembly.isFloor)for(const x of [-1.301,1.301])for(const y of [-.326,.326])for(const z of [assembly.serviceEnds.back,assembly.serviceEnds.front])points.push(new T.Vector3(x,y,z));
 for(const aspect of [4.5,3,1.5,.8]){
  const camera=new T.PerspectiveCamera(34,aspect,.1,200),fit=fitInstallation(T,assembly,camera);
  camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld();
  const projected=points.map(p=>p.clone().applyMatrix4(assembly.root.matrixWorld).project(camera));
  const maxX=Math.max(...projected.map(p=>Math.abs(p.x))),maxY=Math.max(...projected.map(p=>Math.abs(p.y)));
  assert.ok(maxX<=.860001,`${record.id} horizontal ${maxX}`);assert.ok(maxY<=.840001,`${record.id} vertical ${maxY}`);
  fits.push({aspect,maxX,maxY,camera:fit.position.toArray(),target:fit.target.toArray()});
 }
 let coverage;
 if(assembly.isFloor){
  const first=assembly.parts.find(p=>p.object.userData.component==='blanket-wrap');coverage=first.object.userData.coverage;
  assert.deepEqual(coverage,[assembly.serviceEnds.back,assembly.serviceEnds.front]);
  assert.ok(assembly.workBounds.front.max.z>=assembly.serviceEnds.front);
  assert.ok(assembly.workBounds.back.min.z<=assembly.serviceEnds.back);
 }
 results.push({id:record.id,fits,serviceEnds:assembly.serviceEnds,firstLayerCoverage:coverage});assembly.dispose();console.log(record.id,'passed');
}
await fs.writeFile(new URL('geometry-checks.json',out),JSON.stringify({passed:true,results},null,2)+'\n');
