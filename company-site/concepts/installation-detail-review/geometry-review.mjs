import * as T from '../../assets/js/vendor/three.module.min.js';
import {buildAssembly} from '../../assets/js/assemblies.js';
import {installationTimeline} from '../../assets/js/installation-motion.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const records=JSON.parse(await fs.readFile(new URL('../../assets/data/installation-certificates.json',import.meta.url))).certificates;
const materials=Object.fromEntries(['concrete','steel','zinc','pvc','foil','blanketFoil','wool','mineral','bandCore','whiteSeal','copper','glasswool','cartridgeWhite','cartridgeLabel','gun'].map(k=>[k,new T.MeshStandardMaterial()]));
const results=[];
for(const record of records){
 const timing=installationTimeline(record),a=buildAssembly({T,parent:new T.Group(),record,bayWidth:7,materials,CY:1.65,WALL_Z:-.55});
 a.root.traverse(o=>{if(o.geometry){const p=o.geometry.attributes.position;for(let i=0;i<p.array.length;i++)assert.ok(Number.isFinite(p.array[i]),`${record.id} invalid vertex`);}});
 const halves=a.parts.filter(p=>p.object.userData.component==='board-half');
 if(record.steps.some(s=>s.kind==='board')){assert.ok(halves.length>=2);assert.equal(halves.filter(p=>p.object.userData.half==='upper').length,halves.filter(p=>p.object.userData.half==='lower').length);assert.ok(halves.some(p=>p.offset.y>0)&&halves.some(p=>p.offset.y<0));}
 const seals=a.parts.filter(p=>p.update);
 for(const pass of seals){for(const f of [0,.25,.5,.75,1]){pass.update(pass.start+(pass.end-pass.start)*f,true);assert.ok(pass.object.userData.nozzle.every(Number.isFinite));assert.equal(pass.object.userData.toolVisible,f<1);}}
 results.push({id:record.id,halves:halves.length,sealantPasses:seals.length,firstMovement:timing.steps[record.steps.findIndex(s=>!['opening','service'].includes(s.kind))]?.start,duration:timing.duration});a.dispose();
}
await fs.writeFile(new URL('./geometry-checks.json',import.meta.url),JSON.stringify({passed:true,certificates:results.length,results},null,2)+'\n');
console.log('All 60 certificate geometries, split boards, sealant paths and timelines passed.');
