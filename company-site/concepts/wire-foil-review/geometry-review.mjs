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
 const a=buildAssembly({T,parent:new T.Group(),record,bayWidth:7,materials,CY:1.65,WALL_Z:-.55}),timing=installationTimeline(record);
 const wires=a.parts.filter(p=>p.object.userData.component==='winding-wire');
 a.work.traverse(o=>{if(o.userData.component==='blanket')o.traverse(m=>{if(m.isMesh)assert.notEqual(m.material,materials.wool,record.id+': exposed fiber');});});
 const fixing=record.steps.filter(s=>s.kind==='fixing'&&/철선|철사/.test(s.text.replace(/\s/g,'')));
 assert.equal(wires.length>0,fixing.length>0,record.id+': wire source');
 for(const p of wires){
  const d=p.object.userData,[from,to]=d.coverage;
  assert.ok(d.distance>from+.015&&d.distance<to-.015,record.id+': wire beyond blanket');
  let count=-1;
  for(const fraction of [0,.2,.5,.75,1,.3,1]){
   applyAssemblyTime(a.parts,p.start+(p.end-p.start)*fraction);
   const wrap=p.object.children.find(o=>o.userData.component==='wire-wrapped-length');
   if(fraction===.2||fraction===.5||fraction===.75)assert.ok(wrap.geometry.drawRange.count>count);
   count=wrap.geometry.drawRange.count;
   p.object.traverse(o=>{if(o.geometry)for(const x of o.geometry.attributes.position.array)assert.ok(Number.isFinite(x),record.id+': wire NaN');});
   if(fraction===1){
    assert.equal(d.wrapped,1);assert.equal(d.twisted,1);assert.equal(count,wrap.geometry.index.count);
    for(const tail of p.object.children.filter(o=>['wire-free-end','wire-anchor-end'].includes(o.userData.component))){
     const positions=tail.geometry.attributes.position,centers=[];
     for(let row=0;row<=24;row++){let z=0;for(let j=0;j<6;j++)z+=positions.getZ(row*7+j);centers.push(z/6);}
     assert.ok(Math.min(...centers)<-.001&&Math.max(...centers)>.001,record.id+': ends must intertwine');
    }
   }
  }
 }
 for(const side of [1,-1])for(const aspect of [2.17,.82]){
  const camera=new T.PerspectiveCamera(34,aspect,.1,200),fit=fitInstallation(T,a,camera,side);
  if(fit.bounds.isEmpty()||fit.preservedSmall)continue;
  camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld(true);
  for(const x of [fit.bounds.min.x,fit.bounds.max.x])for(const y of [fit.bounds.min.y,fit.bounds.max.y])for(const z of [fit.bounds.min.z,fit.bounds.max.z]){
   const p=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=.861&&Math.abs(p.y)<=.841,record.id+': clipped work');
  }
 }
 applyAssemblyTime(a.parts,timing.duration);
 a.root.traverse(o=>{if(o.geometry)for(const x of o.geometry.attributes.position.array)assert.ok(Number.isFinite(x),record.id+': NaN');});
 results.push({id:record.id,wires:wires.length,placements:wires.map(p=>({pipe:p.object.userData.pipe,distance:p.object.userData.distance,coverage:p.object.userData.coverage,radius:p.object.userData.radius}))});a.dispose();
}
await fs.writeFile(new URL('./geometry-checks.json',import.meta.url),JSON.stringify({passed:true,certificates:results.length,results},null,2)+'\n');
console.log('All 60 certificates: foil coverage, wire placement/winding/reverse seek and camera fit passed.');
