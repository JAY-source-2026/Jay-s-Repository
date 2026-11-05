import * as T from '../../assets/js/vendor/three.module.min.js';
import {buildAssembly} from '../../assets/js/assemblies.js';
import {installationTimeline} from '../../assets/js/installation-motion.js';
import {fitInstallation,applyAssemblyTime} from '../../assets/js/installation-view.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const records=JSON.parse(await fs.readFile(new URL('../../assets/data/installation-certificates.json',import.meta.url))).certificates;
const materials=Object.fromEntries(['concrete','steel','zinc','pvc','foil','blanketFoil','wool','mineral','bandCore','whiteSeal','copper','glasswool','cartridgeWhite','cartridgeLabel','gun'].map(k=>[k,new T.MeshStandardMaterial()]));
const results=[];
for(const record of records){
 const timing=installationTimeline(record),a=buildAssembly({T,parent:new T.Group(),record,bayWidth:7,materials,CY:1.65,WALL_Z:-.55});
 a.root.traverse(o=>{if(o.geometry){const p=o.geometry.attributes.position;for(const x of p.array)assert.ok(Number.isFinite(x),`${record.id}: invalid vertex`);}});
 const fits=[];
 for(const side of [1,-1])for(const aspect of [1.64,2.17,1,.82]){
  const camera=new T.PerspectiveCamera(34,aspect,.1,200),fit=fitInstallation(T,a,camera,side);
  if(fit.bounds.isEmpty())continue;
  camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld(true);
  let xMax=0,yMax=0;
  for(const x of [fit.bounds.min.x,fit.bounds.max.x])for(const y of [fit.bounds.min.y,fit.bounds.max.y])for(const z of [fit.bounds.min.z,fit.bounds.max.z]){
   const p=new T.Vector3(x,y,z).project(camera);assert.ok(p.z>-1&&p.z<1);xMax=Math.max(xMax,Math.abs(p.x));yMax=Math.max(yMax,Math.abs(p.y));
  }
  if(!fit.preservedSmall)assert.ok(xMax<=.861&&yMax<=.841,`${record.id}: clipped work at ${aspect}, side ${side}`);
  if(fit.preservedSmall)assert.ok(Math.abs(camera.position.distanceTo(fit.target)-a.viewSpan*Math.hypot(.85,.4,1.8)*Math.max(1,1.35/aspect))<.00001);
  fits.push({side,aspect,xMax,yMax,preservedSmall:Boolean(fit.preservedSmall),distance:camera.position.distanceTo(fit.target)});
 }
 const pieces=a.parts.filter(p=>p.object.userData.component==='board-piece');
 if(record.category==='duct'&&record.steps.some(s=>s.kind==='board'))assert.equal(pieces.length,20);
 applyAssemblyTime(a.parts,0);assert.ok(a.parts.filter(p=>p.object.userData.component==='board-piece').every(p=>!p.object.visible));
 const existing=[];a.service.traverse(o=>{if(o.userData.component==='existing-insulation')existing.push(o);});
 if(record.steps.some(s=>s.kind==='glasswool')){assert.equal(existing.length,1);assert.ok(existing[0].visible);assert.equal(existing[0].userData.branded,false);assert.ok(existing[0].userData.length>=3.4);}
 const jackets=a.parts.filter(p=>p.object.userData.component==='jacket-clamp');
 for(const p of jackets){applyAssemblyTime(a.parts,p.start+.02);assert.ok(p.object.userData.openAngle>1);assert.equal(p.object.userData.latched,false);applyAssemblyTime(a.parts,p.end);assert.equal(p.object.userData.openAngle,0);assert.equal(p.object.userData.latched,true);}
 results.push({id:record.id,fits,ductBoardPieces:pieces.length,existingInsulation:existing.length,jackets:jackets.length,workLength:a.workLength});a.dispose();
}
await fs.writeFile(new URL('./geometry-checks.json',import.meta.url),JSON.stringify({passed:true,certificates:results.length,results},null,2)+'\n');
console.log('All 60: camera envelopes, finite geometry, duct pieces, initial insulation and jacket closure passed.');
