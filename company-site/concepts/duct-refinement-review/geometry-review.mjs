import * as T from '../../assets/js/vendor/three.module.min.js';
import {buildAssembly} from '../../assets/js/assemblies.js';
import {applyAssemblyTime,fitInstallation} from '../../assets/js/installation-view.js';
import {buildAssembly as oldAssembly} from '/tmp/doenc-duct-before/assets/js/assemblies.js';
import {fitInstallation as oldFit} from '/tmp/doenc-duct-before/assets/js/installation-view.js';
import {wrappingBlanket} from '../../assets/js/installation-blanket.js';
import {wrappingBlanket as oldBlanket} from '/tmp/doenc-duct-before/assets/js/installation-blanket.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./',import.meta.url);
const records=JSON.parse(await fs.readFile(new URL('../../assets/data/installation-certificates.json',import.meta.url))).certificates;
const materials=Object.fromEntries(['concrete','steel','zinc','pvc','foil','blanketFoil','wool','mineral','bandCore','whiteSeal','copper','glasswool','cartridgeWhite','cartridgeLabel','gun'].map(k=>[k,new T.MeshStandardMaterial()]));
const results=[];
for(const record of records.filter(r=>r.category==='duct')){
 const args={T,record,bayWidth:7,materials,CY:1.65,WALL_Z:-.55};
 const assembly=buildAssembly({...args,parent:new T.Group()}),before=oldAssembly({...args,parent:new T.Group()});
 const sheets=assembly.parts.filter(p=>p.object.userData.component==='blanket-wrap');
 for(const part of (process.argv.includes('--framing')?[]:sheets)){
  assert.equal(part.object.userData.shape,'continuous-rectangular-wrap');
  const geometry=part.object.children[0].geometry;
  let previous=null,maxJump=0;
  for(let i=0;i<=100;i++){
   part.update(part.start+(part.end-part.start)*i/100);
   const values=geometry.attributes.position.array;
   assert.ok([...values,...geometry.attributes.normal.array].every(Number.isFinite));
   if(previous)for(let j=0;j<values.length;j+=3)maxJump=Math.max(maxJump,Math.hypot(values[j]-previous[j],values[j+1]-previous[j+1],values[j+2]-previous[j+2]));
   previous=values.slice();
  }
  assert.ok(maxJump<.34,'A sheet moves discontinuously: '+maxJump);
  assert.ok(Math.abs(part.object.userData.wrapped-1)<1e-9);
  const final=geometry.attributes.position.array.slice();
  part.update(part.start);part.update(part.end);
  assert.deepEqual(geometry.attributes.position.array,final);
 }
 const fits=[];
 for(const aspect of [4.5,2.2,1.5,.8]){
  const camera=new T.PerspectiveCamera(52,aspect,.1,200),fit=fitInstallation(T,assembly,camera),original=oldFit(T,before,new T.PerspectiveCamera(34,aspect,.1,200));
  camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld(true);
  for(const point of assembly.viewPoints.filter(p=>(assembly.isFloor||p.z>=0)&&(assembly.isFloor||aspect<=1.6||p.x>=.9))){const p=point.clone().applyMatrix4(assembly.root.matrixWorld).project(camera);assert.ok(Math.abs(p.x)<=.861&&Math.abs(p.y)<=.841,record.id+' clipped');}
  fits.push({aspect,before:original.position.distanceTo(original.target),after:fit.position.distanceTo(fit.target)});
 }
 const components={};assembly.root.traverse(o=>{if(o.userData.component)components[o.userData.component]=(components[o.userData.component]||0)+1;});
 if(!assembly.isFloor){assert.equal(components['system-channel'],12);assert.equal(components['channel-threaded-rod'],12);assert.equal(components['duct-channel-clamp'],6);}
 else assert.equal(components['system-channel'],undefined);
 results.push({id:record.id,sheets:sheets.length,fits,components});assembly.dispose();before.dispose();
 console.log(record.id,'continuous wrapping and camera fit passed');
}
// The round-pipe wrapping path must keep its existing geometry at every sampled time.
for(const inner of [.03,.134,.25]){
 const args={T,inner,thickness:.025,length:.7,x:0,z:.085,start:1,end:5,material:materials.blanketFoil};
 const current=wrappingBlanket({...args,parent:new T.Group(),owned:new Set()}),before=oldBlanket({...args,parent:new T.Group(),owned:new Set()});
 for(const t of [0,1,2,3,4,5,2,5]){current.update(t);before.update(t);assert.deepEqual(current.object.children[0].geometry.attributes.position.array,before.object.children[0].geometry.attributes.position.array);}
}
await fs.writeFile(new URL(process.argv.includes('--framing')?'camera-checks.json':'geometry-checks.json',out),JSON.stringify({passed:true,results,roundPipeWrappingUnchanged:true},null,2)+'\n');
console.log('Geometry review passed.');
