import * as T from '../vendor/three.module.min.js';
import {HDRLoader} from './HDRLoader.js';
import {createLogo,createSeed} from './logo.js?v=20261111s5';
import {createFire} from './fire.js?v=20261111s5';
import {GROUND,phase,mix,texture,mesh} from './common.js?v=20261111s5';

function wordmark(){
 const c=document.createElement('canvas');c.width=2048;c.height=560;const x=c.getContext('2d');x.scale(4/3,4/3);
 x.fillStyle='#f0f5fb';x.font='750 236px "Pretendard Variable"';x.textAlign='center';x.fillText('DOENC',768,252);
 x.fillStyle='#9cb7cd';x.font='400 40px "Pretendard Variable"';x.fillText('주식회사 디오이엔씨',768,345);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 return new T.Mesh(new T.PlaneGeometry(6.4,1.75),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false}));
}
export async function createScene(stage,onLost){
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.appendChild(renderer.domElement);
 let disposed=false;const lost=e=>{e.preventDefault();if(!disposed)onLost();};renderer.domElement.addEventListener('webglcontextlost',lost);
 const scene=new T.Scene();scene.background=new T.Color('#071321');scene.fog=new T.Fog('#071321',18,45);
 const camera=new T.PerspectiveCamera(34,1,.1,90);
 let env;
 try{const hdr=await new HDRLoader().loadAsync(new URL('../../media/intro/studio_small_09_2k.hdr',import.meta.url).href),pmrem=new T.PMREMGenerator(renderer);env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;scene.environmentIntensity=.65;scene.environmentRotation.y=.7;hdr.dispose();pmrem.dispose();}catch{ /* Directional studio lighting remains available. */ }
 scene.add(new T.HemisphereLight(0xc6dfff,0x0b1320,1.1));
 const key=new T.DirectionalLight(0xe8f1ff,2.5);key.position.set(-5,8,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-9,right:9,top:8,bottom:-8,near:.5,far:35});key.shadow.bias=-.0002;key.shadow.normalBias=.02;scene.add(key);
 const rim=new T.DirectionalLight(0x84baff,1.5);rim.position.set(6,4,-4);scene.add(rim);
 const floor=mesh(new T.PlaneGeometry(120,120),new T.MeshStandardMaterial({color:'#091523',roughness:.62,metalness:.07,envMap:env?.texture,envMapIntensity:.02}),scene);floor.rotation.x=-Math.PI/2;floor.position.y=GROUND;floor.castShadow=false;
 // Shallow satin-blue extrusion keeps the original mark clean at its display size.
 const blue=new T.MeshPhysicalMaterial({color:'#2d5682',metalness:.13,roughness:.48,clearcoat:.18,clearcoatRoughness:.4,envMapIntensity:.5});
 const edge=new T.MeshStandardMaterial({color:'#244b74',metalness:.12,roughness:.56,envMapIntensity:.4});
 const logo=await createLogo(scene,blue,edge),dRoot=logo.root,words=wordmark();scene.add(words);
 const seedMaker=createSeed(blue.clone(),logo.seedContour,logo.dotSolid),seed=seedMaker.seed;scene.add(seed);
 const fire=createFire(scene);
 const shockMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{age:{value:-1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float age;void main(){float r=length((vUv-.5)*2.);float radius=.13+age*.8;float ring=exp(-pow((r-radius)/.055,2.));float dust=exp(-pow((r-radius+.07)/.12,2.))*.22;float a=(ring+dust)*exp(-age*4.)*.2;gl_FragColor=vec4(.45,.57,.66,a);}' });
 const shock=new T.Mesh(new T.PlaneGeometry(10,10),shockMaterial);shock.rotation.x=-Math.PI/2;shock.position.set(-.7,GROUND+.022,.1);scene.add(shock);
 const shadowTex=texture(256,(c,s)=>{const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.3,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,s,s);});
 const dShadow=new T.Mesh(new T.PlaneGeometry(5,2.2),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));dShadow.rotation.x=-Math.PI/2;dShadow.position.set(-.7,GROUND+.012,.1);scene.add(dShadow);
 let mobile=false,width=1,height=1,lastState={};
 const project=v=>{v.project(camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2};};
 function resize(w,h){width=w;height=h;mobile=w<=760;renderer.setPixelRatio(Math.min(2.25,Math.max(2,devicePixelRatio),Math.sqrt(6000000/(w*h))));renderer.setSize(w,h);camera.aspect=w/h;camera.fov=mobile?38:34;camera.updateProjectionMatrix();}
 function render(t){
  const enter=phase(t,2.4,4.35),press=phase(t,4.35,5.35),stand=phase(t,6.45,8.05),shake=phase(t,8.05,8.3)*(1-phase(t,9.6,10.1));
  const angle=mix(logo.pressAngle,0,stand)+Math.sin((t-8.1)*19)*.07*shake,initialScale=.70;
  const grounded=logo.floorCenter(angle,initialScale),pressX=-.7-(logo.footLeft+logo.footRight)*initialScale/2;
  const settle=phase(t,11.45,13.2),brandScale=mobile?.468:.63,dScale=mix(initialScale,brandScale,settle);
  dRoot.position.set(mix(mix(-7,pressX,enter),mobile?-.495:-2.7,settle),mix(mix(3.3,grounded,press),mobile?.81:.207,settle),.1);
  dRoot.rotation.set(0,0,angle);dRoot.scale.set(dScale,dScale*(1-.035*Math.sin(t*25)*shake),1);
  const spit=phase(t,10.15,11.55);logo.update(t,spit);
  const logoFade=1-phase(t,16.8,18.9);blue.transparent=edge.transparent=logoFade<1;blue.opacity=edge.opacity=logoFade;dRoot.visible=t>=2.4&&logoFade>.001;
  words.position.set(mobile?0:1.53,mobile?-.765:.189,.05);words.scale.setScalar(mobile?.828:.9);words.material.opacity=phase(t,11.8,13.3)*logoFade;words.visible=words.material.opacity>.001;
  dShadow.position.x=dRoot.position.x;dShadow.scale.setScalar(dScale);dShadow.material.opacity=.65*enter*logoFade;dShadow.visible=dRoot.visible;
  const dotX=dRoot.position.x+logo.dotCenter.x*dScale,dotY=dRoot.position.y+logo.dotCenter.y*dScale;
  const oTravel=phase(t,14.85,17.05),growth=phase(t,17.05,19.85),opening=phase(t,15.3,18.3),seedStart=logo.dotRX*dScale/1.375;
  const childScale=mix(seedStart,.6,oTravel)+growth*.4,ovalRatio=mix(logo.dotRY/logo.dotRX,1,phase(t,15.4,17.5));seedMaker.update(opening);
  const x=mobile?-.65:-1.7,y=GROUND+1.375*childScale*ovalRatio;
  seed.position.set(mix(dotX,x,oTravel),mix(dotY,y,oTravel)+Math.sin(oTravel*Math.PI)*.85,mix(.1,1.4,oTravel)+Math.sin(oTravel*Math.PI)*.4);
  seed.rotation.set(0,-.26*phase(t,15.8,17.8),.12*phase(t,15.8,17.8),'YXZ');seed.scale.set(childScale,childScale*ovalRatio,childScale*mix(.14/(.4*seedStart),1,phase(t,15.8,18.3)));
  const silver=phase(t,18.1,19);seed.material.color.lerpColors(new T.Color('#2d5682'),new T.Color('#c4d1dc'),silver);seed.material.metalness=mix(.13,.78,silver);seed.material.roughness=mix(.48,.24,silver);seed.material.envMapIntensity=mix(.5,1.1,silver);seed.material.opacity=1-phase(t,18.6,19.5);seed.material.transparent=seed.material.opacity<1;seed.visible=t>=11.55&&t<19.5;
  const brandCamera=phase(t,10.3,13.2),productCamera=phase(t,17.5,19.9);
  camera.position.set(mix(mobile?1.6:2.5,0,brandCamera),mix(2.5,mobile?.3:.2,brandCamera),mix(mobile?18.8:16.3,mobile?20.8:16.7,brandCamera));
  camera.position.lerp(new T.Vector3(0,.4,mobile?17.6:15.4),productCamera);
  const target=new T.Vector3(mix(-.2,0,brandCamera),mix(.2,mobile?.3:.2,brandCamera),0).lerp(new T.Vector3(mobile?0:.3,.2,0),productCamera);
  const age=t-5.35,impact=age>=0&&age<.8?Math.exp(-age*7):0;
  const shakeX=Math.sin(age*38)*.025*impact,shakeY=Math.sin(age*49)*.052*impact;camera.position.x+=shakeX;camera.position.y+=shakeY;camera.lookAt(target);
  shock.visible=age>=0&&age<1.1;shockMaterial.uniforms.age.value=Math.max(0,age);
  const underSide=GROUND+Math.max(0,dRoot.position.y-grounded);
  const flamePower=fire.update(t,camera,{pressing:t>=4.35,underSide,left:dRoot.position.x+logo.footLeft*initialScale,right:dRoot.position.x+logo.footRight*initialScale});
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const center=project(seed.getWorldPosition(new T.Vector3())),top=project(seed.localToWorld(new T.Vector3(0,1.375,0))),bottom=project(seed.localToWorld(new T.Vector3(0,-1.375,0)));
  renderer.render(scene,camera);
  lastState={time:t,mobile,press,stand,spit,opening,oTravel,oTransform:{sameLogoObject:seed===logo.dotSolid,objectId:seed.uuid,visible:seed.visible,remainingO:false,sourceScale:seedStart,scale:childScale},logoScale:dScale,logoDepth:.14,fire:flamePower,fireCompression:fire.getState(),impact:{active:shock.visible,age,shakeX,shakeY},seedScreen:{...center,height:Math.abs(bottom.y-top.y)},quality:{pixelRatio:renderer.getPixelRatio(),width:renderer.domElement.width,height:renderer.domElement.height,shadow:2048,hdr:'2k',wordmarkWidth:2048,curveSegments:24,pixelBudget:6000000}};
  return lastState;
 }
 function dispose(){if(disposed)return;disposed=true;renderer.domElement.removeEventListener('webglcontextlost',lost);const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const m of materials)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();env?.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.domElement.remove();}
 return{resize,render,dispose,getState:()=>({...lastState,logoCut:logo.probe(),seedCenterFilled:seedMaker.centerFilled()})};
}
