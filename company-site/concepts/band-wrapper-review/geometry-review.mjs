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
const materials=Object.fromEntries(['concrete','steel','zinc','channelSilver','pvc','foil','blanketFoil','wool','mineral','bandCore','whiteSeal','copper','glasswool','cartridgeWhite','cartridgeLabel','gun','bandFilm','bandSeam'].map(k=>[k,new T.MeshStandardMaterial({name:k,side:T.DoubleSide})]));
const build=(record,fn=buildAssembly)=>fn({T,parent:new T.Group(),record,bayWidth:5.4,materials,CY:1.65,WALL_Z:-.55});
function hashGeometry(a,ignoreBands=false){
 const hash=crypto.createHash('sha256');
 function visit(o){
  if(ignoreBands&&['band','insulation-band'].includes(o.userData.component))return;
  if(o.isMesh){hash.update(JSON.stringify([o.position.toArray(),o.rotation.toArray(),o.scale.toArray()]));hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));}
  o.children.forEach(visit);
 }
 visit(a.root);return hash.digest('hex');
}
const results=[];
for(const record of records){
 const a=build(record),before=build(record,buildBefore),timing=installationTimeline(record),hasBands=record.steps.some(s=>['band','insulation-band'].includes(s.kind));
 applyAssemblyTime(a.parts,timing.complete);applyAssemblyTime(before.parts,timing.complete);
 assert.equal(hashGeometry(a)!==hashGeometry(before),hasBands,record.id+' scope');
 assert.equal(hashGeometry(a,true),hashGeometry(before,true),record.id+' unrelated geometry changed');
 const bands=a.parts.filter(p=>p.object.userData.component==='wrapped-opening-band');
 if(hasBands){
  assert.ok(bands.length);
  const completeHash=hashGeometry(a);
  for(const part of bands){
   assert.equal(part.object.userData.wrapper,'blue-printed-film');
   const box=new T.Box3().setFromObject(part.object);assert.ok(!box.isEmpty());
   part.object.traverse(o=>{if(!o.isMesh)return;
    assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
    for(const mat of Array.isArray(o.material)?o.material:[o.material])assert.ok([materials.bandFilm,materials.bandSeam].includes(mat));
    if(o.geometry.attributes.uv)assert.ok(o.geometry.attributes.uv.array.every(v=>v>=0&&v<=1));
   });
  }
  for(const progress of [0,.3,.7,1,.2,1]){
   applyAssemblyTime(a.parts,timing.complete*progress);
   for(const part of bands)assert.ok(part.object.position.toArray().every(Number.isFinite));
  }
  assert.equal(hashGeometry(a),completeHash,record.id+' reverse seek');
 }
 if(record.category==='duct'){
  assert.equal(bands.length,record.id==='FS-MP25-0224-06'?16:8);
  for(const aspect of [4.5,3,1.5,.8]){
   const camera=new T.PerspectiveCamera(34,aspect,.1,200),fit=fitInstallation(T,a,camera);
   camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld();
   for(const point of a.viewPoints.filter(p=>a.isFloor||p.z>=0)){
    const p=point.clone().applyMatrix4(a.root.matrixWorld).project(camera);
    assert.ok(Math.abs(p.x)<.861&&Math.abs(p.y)<.841,record.id+' camera clips work');
   }
  }
 }
 results.push({id:record.id,hasBands,wrappedPieces:bands.length,otherGeometryPreserved:true});
 a.dispose();before.dispose();
}
const sources=JSON.parse(await fs.readFile(new URL('sources.json',import.meta.url)));
for(const source of sources){const bytes=await fs.readFile(new URL('../../'+source.path,import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);}
await fs.writeFile(new URL('geometry-checks.json',import.meta.url),JSON.stringify({passed:true,records:results.length,changed:results.filter(r=>r.hasBands).length,results,sourcePhotosAndPDFsPreserved:true},null,2)+'\n');
console.log('Passed',results.length,'certificates;',results.filter(r=>r.hasBands).length,'with wrapped bands. Other geometry and original sources preserved.');
