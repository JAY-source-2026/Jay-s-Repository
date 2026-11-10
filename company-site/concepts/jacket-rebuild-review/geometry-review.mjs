import * as T from '../../assets/js/vendor/three.module.min.js';
import {buildAssembly} from '../../assets/js/assemblies.js';
import {installationTimeline} from '../../assets/js/installation-motion.js';
import {applyAssemblyTime,fitInstallation} from '../../assets/js/installation-view.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const records=JSON.parse(await fs.readFile(new URL('../../assets/data/installation-certificates.json',import.meta.url))).certificates;
const materials=Object.fromEntries(['concrete','steel','zinc','jacketZinc','jacketFastener','pvc','foil','blanketFoil','wool','mineral','bandCore','whiteSeal','copper','glasswool','cartridgeWhite','cartridgeLabel','gun'].map(k=>[k,new T.MeshStandardMaterial()]));
// Independent expectations transcribed from the PDF dimension tables.
const specs={50:[32,8,.6,2,1,0],100:[42,10,.6,4,2,0],150:[62,16,.6,4,2,0],200:[132,24,1,12,3,2],250:[132,24,1,12,3,2]};
const results=[];let jackets=0;
for(const record of records){
 const a=buildAssembly({T,parent:new T.Group(),record,bayWidth:7,materials,CY:1.65,WALL_Z:-.55});
 const timing=installationTimeline(record),parts=a.parts.filter(p=>p.object.userData.component==='jacket-clamp');
 const fixes=record.steps.findIndex(s=>s.kind==='brackets');
 for(const p of parts){
  jackets++;const d=p.object.userData,s=specs[d.nominal];
  assert.deepEqual([d.depthMm,d.bandMm,d.shellMm,d.bracketCount,d.hookCount,d.wingBoltCount],s,record.id);
  assert.equal(d.hinged,false);
  const radius=({50:60,100:114,150:165,200:216,250:267}[d.nominal])/2000;
  for(const ratio of [0,.08,.16,.3,.5,.65,1]){
   applyAssemblyTime(a.parts,p.start+(p.end-p.start)*ratio);p.object.updateMatrix();
   for(const mesh of p.object.children.filter(o=>o.userData.component==='jacket-intumescent-layer')){
    const attr=mesh.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
     const v=new T.Vector3().fromBufferAttribute(attr,i).applyMatrix4(p.object.matrix);
     assert.ok(Math.hypot(v.x-p.home.x,v.y)>=radius-.001,record.id+': jacket passes through pipe');
    }
   }
  }
  const counts={};p.object.traverse(o=>{if(o.userData.component)counts[o.userData.component]=(counts[o.userData.component]||0)+1;});
  assert.equal(counts['jacket-L-bracket'],s[3]);assert.equal(counts['jacket-support-screw'],s[3]);assert.equal(counts['jacket-hook'],s[4]);assert.equal(counts['jacket-wing-nut']||0,s[5]);
  applyAssemblyTime(a.parts,p.start+.01);assert.ok(d.openAngle>1);assert.equal(d.screwsFixed,false);
  applyAssemblyTime(a.parts,p.end);assert.equal(d.latched,true);assert.equal(d.tightened,true);assert.equal(d.seated,false);
  if(fixes>=0){const t=timing.steps[fixes];applyAssemblyTime(a.parts,t.start+t.duration*.47);assert.equal(d.bracketsEngaged,true);assert.equal(d.seated,false);assert.equal(d.screwsFixed,false);}
  applyAssemblyTime(a.parts,timing.complete);assert.equal(d.seated,true);assert.equal(d.screwsFixed,true);
  assert.ok(Math.abs(p.object.position.z-d.workFace*d.supportSurface)<1e-8);
  if(record.geometry.boardMm)assert.ok(d.supportSurface>=.075+record.geometry.boardMm.thickness/1000);
  const final=p.object.children[0].geometry.attributes.position.array.slice();
  applyAssemblyTime(a.parts,p.start+.01);assert.equal(d.latched,false);assert.equal(d.seated,false);
  applyAssemblyTime(a.parts,timing.complete);assert.deepEqual(p.object.children[0].geometry.attributes.position.array,final);
 }
 for(const aspect of [2.1,1.4,.5]){
  const camera=new T.PerspectiveCamera(34,aspect,.1,200),fit=fitInstallation(T,a,camera);
  if(fit.bounds.isEmpty()||fit.preservedSmall)continue;
  camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld(true);
  for(const x of [fit.bounds.min.x,fit.bounds.max.x])for(const y of [fit.bounds.min.y,fit.bounds.max.y])for(const z of [fit.bounds.min.z,fit.bounds.max.z]){
   const p=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=.861&&Math.abs(p.y)<=.841,record.id+': clipped work');
  }
 }
 a.root.traverse(o=>{if(o.geometry)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n),record.id);});
 results.push({id:record.id,jackets:parts.map(p=>({...p.object.userData}))});a.dispose();
}
await fs.writeFile(new URL('./geometry-checks.json',import.meta.url),JSON.stringify({passed:true,certificates:records.length,jackets,results},null,2)+'\n');
console.log(`Passed ${records.length} certificates, ${jackets} jackets: dimensions, fixings, sequence, reversible motion and view bounds.`);
