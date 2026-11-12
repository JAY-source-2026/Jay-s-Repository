import * as T from '../vendor/three.module.min.js';
import {HDRLoader} from './HDRLoader.js';
import {createLogo,createSeed} from './logo.js?v=20261112s11';
import {createFire} from './fire.js?v=20261112s11';
import {createImpact} from './impact.js?v=20261112s11';
import {GROUND,phase,mix,clamp,texture,mesh} from './common.js?v=20261112s11';

function wordmark(anisotropy){
 const c=document.createElement('canvas');c.width=4096;c.height=1120;const x=c.getContext('2d');x.scale(8/3,8/3);
 x.fillStyle='#f0f5fb';x.font='750 236px "Pretendard Variable"';x.textAlign='center';x.fillText('DOENC',768,252);
 x.fillStyle='#9cb7cd';x.font='400 40px "Pretendard Variable"';x.fillText('주식회사 디오이엔씨',768,345);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=anisotropy;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;
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
 try{const hdr=await new HDRLoader().loadAsync(new URL('../../media/intro/studio_small_09_2k.hdr',import.meta.url).href),pmrem=new T.PMREMGenerator(renderer);env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;scene.environmentIntensity=.85;scene.environmentRotation.y=.7;hdr.dispose();pmrem.dispose();}catch{ /* Directional studio lighting remains available. */ }
 scene.add(new T.HemisphereLight(0xc6dfff,0x0b1320,1.1));
 const key=new T.DirectionalLight(0xe8f1ff,2.5);key.position.set(-5,8,7);key.castShadow=true;key.shadow.mapSize.set(4096,4096);Object.assign(key.shadow.camera,{left:-9,right:9,top:8,bottom:-8,near:.5,far:35});key.shadow.bias=-.0002;key.shadow.normalBias=.02;scene.add(key);
 const rim=new T.DirectionalLight(0x84baff,1.5);rim.position.set(6,4,-4);scene.add(rim);
 const floor=mesh(new T.PlaneGeometry(120,120),new T.MeshStandardMaterial({color:'#091523',roughness:.5,metalness:.07,envMap:env?.texture,envMapIntensity:.02,dithering:true}),scene);floor.rotation.x=-Math.PI/2;floor.position.y=GROUND;floor.castShadow=false;
 // Shallow satin-blue extrusion keeps the original mark clean at its display size.
 const steel=new T.Color('#b9c3ce'),steelEdge=new T.Color('#c9d2db'),brand=new T.Color('#2d5682'),brandEdge=new T.Color('#27507a'),jacketSilver=new T.Color('#a9b8c7');
 const blue=new T.MeshPhysicalMaterial({color:'#2f5f93',metalness:.22,roughness:.36,clearcoat:.55,clearcoatRoughness:.16,envMapIntensity:.85,dithering:true});
 const edge=new T.MeshPhysicalMaterial({color:'#27527f',metalness:.3,roughness:.3,clearcoat:.6,clearcoatRoughness:.14,envMapIntensity:1,dithering:true});
 const logo=await createLogo(scene,blue,edge),dRoot=logo.root,words=wordmark(renderer.capabilities.getMaxAnisotropy());scene.add(words);
 const seedMaker=createSeed(blue.clone(),logo.seedContour,logo.dotSolid),seed=seedMaker.seed;scene.add(seed);
 const fire=createFire(scene),impactFx=createImpact(scene,5.35);
 const shockMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{age:{value:-1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float age;void main(){float r=length((vUv-.5)*2.);float radius=.13+age*.8;float ring=exp(-pow((r-radius)/.055,2.));float dust=exp(-pow((r-radius+.07)/.12,2.))*.22;float a=(ring+dust)*exp(-age*3.2)*.34;gl_FragColor=vec4(.45,.57,.66,a);}' });
 const shock=new T.Mesh(new T.PlaneGeometry(10,10),shockMaterial);shock.rotation.x=-Math.PI/2;shock.position.set(-.7,GROUND+.022,.1);scene.add(shock);
 const shadowTex=texture(256,(c,s)=>{const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.3,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,s,s);});
 const dShadow=new T.Mesh(new T.PlaneGeometry(5,2.2),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));dShadow.rotation.x=-Math.PI/2;dShadow.position.set(-.7,GROUND+.012,.1);scene.add(dShadow);
 let mobile=false,width=1,height=1,lastState={};
 const project=v=>{v.project(camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2};};
 function resize(w,h){width=w;height=h;mobile=w<=760;renderer.setPixelRatio(Math.min(3,Math.max(2,devicePixelRatio),Math.sqrt(9000000/(w*h))));renderer.setSize(w,h);camera.aspect=w/h;camera.fov=mobile?38:34;camera.updateProjectionMatrix();}
 function render(t){
  const fall=clamp(t-4.35),age=t-5.35,enter=phase(t,2.4,4.35),press=fall*fall*(.3+.7*fall),stand=phase(t,6.45,8.05),shake=phase(t,8.05,8.3)*(1-phase(t,9.45,9.75));
  // Spit: D leans back and swells (wind-up), then snaps forward and
  // contracts as the O shoots out, and rocks to rest.
  const windup=phase(t,9.5,10.12),spitAge=t-10.15,kick=spitAge>=0?Math.exp(-spitAge*5):0,whip=spitAge>=0?kick*Math.cos(spitAge*16):windup;
  const lean=.17*whip*(1-phase(t,11.3,11.6)),swell=1+.075*whip*(1-phase(t,11.3,11.6));
  const angle=mix(logo.pressAngle,0,stand)+Math.sin((t-8.1)*19)*.07*shake+lean,initialScale=.62;
  const grounded=logo.floorCenter(angle,initialScale*swell),pressX=-.7-(logo.footLeft+logo.footRight)*initialScale/2;
  const settle=phase(t,11.45,13.2),brandScale=mobile?.26:.32,dScale=mix(initialScale,brandScale,settle)*swell;
  const thud=age>=0&&age<1.2?Math.exp(-age*6.5):0,bounce=Math.abs(Math.sin(age*13))*.045*thud,squash=Math.cos(age*26)*.035*thud;
  dRoot.position.set(mix(mix(-7,pressX,enter),mobile?-.275:-1.75,settle),mix(mix(3.3,grounded,press)+bounce,mobile?.84:.18,settle),.1);
  // The falling D is a thick polished-metal block; it thins and takes the
  // original logo blue while it settles into the brand lockup.
  const depthScale=mix(2.9,1,settle),tilt=mix(-.36,0,settle);
  for(const [m,from,to]of [[blue,steel,brand],[edge,steelEdge,brandEdge]]){m.color.lerpColors(from,to,settle);m.metalness=mix(.9,.12,settle);m.roughness=mix(.44,.4,settle);m.envMapIntensity=mix(2,.75,settle);m.clearcoat=mix(0,.4,settle);}
  dRoot.rotation.set(0,tilt,angle);dRoot.scale.set(dScale,dScale*(1-.035*Math.sin(t*25)*shake),depthScale);
  if(thud){const c=Math.cos(angle),s=Math.sin(angle),sx=1+squash*s*s-squash*.5*c*c,sy=1+squash*c*c-squash*.5*s*s;dRoot.scale.set(dScale*sx,dScale*sy,depthScale);}
  const spitTravel=clamp(spitAge/.72),spit=1-(1-spitTravel)**3;logo.update(t,spit);
  const logoFade=1-phase(t,16.8,18.9);blue.transparent=edge.transparent=logoFade<1;blue.opacity=edge.opacity=logoFade;dRoot.visible=t>=2.4&&logoFade>.001;
  words.position.set(mobile?0:1.215,mobile?-.28:.22,.05);words.scale.setScalar(mobile?.736:.8);words.material.opacity=phase(t,11.8,13.3)*logoFade;words.visible=words.material.opacity>.001;
  dShadow.position.x=dRoot.position.x;dShadow.scale.setScalar(dScale);dShadow.material.opacity=.65*enter*logoFade;dShadow.visible=dRoot.visible;
  dRoot.updateMatrixWorld(true);const dotWorld=dRoot.localToWorld(new T.Vector3(logo.dotCenter.x,logo.dotCenter.y,0)),dotX=dotWorld.x,dotY=dotWorld.y;
  // The landed O jiggles like something just spat out.
  const landed=t-10.87,jiggle=landed>=0&&landed<.9?Math.exp(-landed*6)*Math.cos(landed*24)*.16:0;
  const oTravel=phase(t,14.85,17.05),growth=phase(t,17.05,19.85),opening=phase(t,15.3,18.3),seedStart=logo.dotRX*dScale/1.375;
  const childScale=mix(seedStart,.6,oTravel)+growth*.4,ovalRatio=mix(logo.dotRY/logo.dotRX,1,phase(t,15.4,17.5));seedMaker.update(opening,phase(t,17.7,18.8));
  const x=mobile?-.65:-1.7,y=GROUND+1.375*childScale*ovalRatio;
  seed.position.set(mix(dotX,x,oTravel),mix(dotY,y,oTravel)+Math.sin(oTravel*Math.PI)*.85,mix(dotWorld.z,1.4,oTravel)+Math.sin(oTravel*Math.PI)*.4);
  // The ring turns edge-on; the product image takes over at that instant
  // (no cross-fade, so nothing shows through behind the jacket).
  const turn=clamp((t-18.4)/.55),flip=turn*turn;
  seed.rotation.set(0,tilt+mix(-.26*phase(t,15.8,17.8),-Math.PI/2,flip),angle*(1-settle)+.12*phase(t,15.8,17.8)*(1-flip),'YXZ');seed.scale.set(childScale*(1+jiggle),childScale*ovalRatio*(1-jiggle),childScale*depthScale*mix(.14/(.4*seedStart),1,phase(t,15.8,18.3)));
  const silver=phase(t,17.6,18.4);seed.material.color.copy(blue.color).lerp(jacketSilver,silver);seed.material.metalness=mix(blue.metalness,.7,silver);seed.material.roughness=mix(blue.roughness,.3,silver);seed.material.envMapIntensity=mix(blue.envMapIntensity,.9,silver);seed.material.clearcoat=mix(blue.clearcoat,0,silver);seed.material.opacity=1;seed.material.transparent=false;seed.visible=spit===1&&t<18.95;
  const brandCamera=phase(t,10.3,13.2),productCamera=phase(t,17.5,19.9);
  camera.position.set(mix(mobile?1.6:2.5,0,brandCamera),mix(2.5,mobile?.3:.2,brandCamera),mix(mobile?18.8:16.3,mobile?20.8:16.7,brandCamera));
  camera.position.lerp(new T.Vector3(0,.4,mobile?17.6:15.4),productCamera);
  const target=new T.Vector3(mix(-.2,0,brandCamera),mix(.2,mobile?.3:.2,brandCamera),0).lerp(new T.Vector3(mobile?0:.3,.2,0),productCamera);
  // Ground tremor: a sharp jolt followed by a decaying low rumble.
  const impact=age>=0&&age<1.7?Math.exp(-age*3.4):0;
  const shakeX=(Math.sin(age*37+.5)*.045+Math.sin(age*15)*.02)*impact,shakeY=(Math.sin(age*46)*.095+Math.sin(age*21+1)*.055)*impact,roll=Math.sin(age*29)*.008*impact;
  camera.position.x+=shakeX;camera.position.y+=shakeY;target.y+=shakeY*.35;camera.lookAt(target);camera.rotateZ(roll);
  shock.visible=age>=0&&age<1.1;shockMaterial.uniforms.age.value=Math.max(0,age);
  const underSide=GROUND+Math.max(0,dRoot.position.y-grounded);
  const flamePower=fire.update(t,camera,{pressing:t>=4.35,underSide,left:dRoot.position.x+logo.footLeft*initialScale,right:dRoot.position.x+logo.footRight*initialScale});
  impactFx.update(t,{left:dRoot.position.x+logo.footLeft*initialScale,right:dRoot.position.x+logo.footRight*initialScale,z:.1});
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const center=project(seed.getWorldPosition(new T.Vector3())),top=project(seed.localToWorld(new T.Vector3(0,1.375,0))),bottom=project(seed.localToWorld(new T.Vector3(0,-1.375,0)));
  renderer.render(scene,camera);
  lastState={time:t,mobile,press,stand,spit,opening,oTravel,oTransform:{sameLogoObject:seed===logo.dotSolid,objectId:seed.uuid,visible:seed.visible,remainingO:false,sourceScale:seedStart,scale:childScale},logoScale:dScale,logoDepth:.14,fire:flamePower,fireCompression:fire.getState(),impact:{active:shock.visible,age,shakeX,shakeY,roll,bounce},seedScreen:{...center,height:Math.abs(bottom.y-top.y)},quality:{pixelRatio:renderer.getPixelRatio(),width:renderer.domElement.width,height:renderer.domElement.height,shadow:4096,hdr:'2k',wordmarkWidth:4096,curveSegments:72,pixelBudget:9000000}};
  return lastState;
 }
 function dispose(){if(disposed)return;disposed=true;renderer.domElement.removeEventListener('webglcontextlost',lost);const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const m of materials)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();env?.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.domElement.remove();}
 try{renderer.compile(scene,camera);}catch{ /* Shaders compile on first frame instead. */ }
 return{resize,render,dispose,getState:()=>({...lastState,logoCut:logo.probe(),seedCenterFilled:seedMaker.centerFilled()})};
}
