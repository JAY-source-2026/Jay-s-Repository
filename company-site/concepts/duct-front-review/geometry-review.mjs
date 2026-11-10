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
 for(const aspect of [4.5,3,1.5,.8]){const camera=new T.PerspectiveCamera(52,aspect,.1,200),fit=fitInstallation(T,assembly,camera);assert.ok(Math.abs(fit.position.x-fit.target.x)<1e-9);assert.ok(Math.abs(fit.target.x)<1e-9);assert.ok(fit.position.z>fit.target.z);assert.ok([...fit.position.toArray(),...fit.target.toArray()].every(Number.isFinite));fits.push({aspect,camera:fit.position.toArray(),target:fit.target.toArray()});}
 let coverage;
 if(assembly.isFloor){
  const first=assembly.parts.find(p=>p.object.userData.component==='blanket-wrap');coverage=first.object.userData.coverage;
  assert.deepEqual(coverage,[assembly.serviceEnds.back,assembly.serviceEnds.front]);
  for(const ratio of [0,.25,.5,.75,1,0,1]){
   first.update(first.start+(first.end-first.start)*ratio);const g=first.object.children[0].geometry;
   assert.ok([...g.attributes.position.array].every(Number.isFinite));
   assert.ok(Math.abs(g.boundingBox.min.z+first.home.z-assembly.serviceEnds.back)<1e-6);
   assert.ok(Math.abs(g.boundingBox.max.z+first.home.z-assembly.serviceEnds.front)<1e-6);
  }
  assert.ok(assembly.workBounds.front.max.z<assembly.serviceEnds.front,'Full-length insulation should not pull the work camera away');
 }
 results.push({id:record.id,frontAligned:true,fits,serviceEnds:assembly.serviceEnds,firstLayerCoverage:coverage});assembly.dispose();console.log(record.id,'passed');
}
await fs.writeFile(new URL('geometry-checks.json',out),JSON.stringify({passed:true,results},null,2)+'\n');
