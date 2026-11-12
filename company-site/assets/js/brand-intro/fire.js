import * as T from '../vendor/three.module.min.js';
import {GROUND,phase,random} from './common.js?v=20261112s11';

const noise=`
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p+3.7;a*=.5;}return v;}
`;
const clipVertex='varying vec2 vUv;varying vec3 worldPoint;void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}';
const clipUniforms='uniform float time;uniform float strength;uniform float ceiling;uniform float left;uniform float right;';
const clipTest='if(worldPoint.y>ceiling||worldPoint.x<left||worldPoint.x>right)discard;';

// Layered volumetric-style flame: several turbulent tongues rise from a
// glowing bed, break into detached licks and cool from white-yellow to deep
// red. Colours follow a black-body ramp with a soft filmic roll-off.
const flameFragment=`varying vec2 vUv;varying vec3 worldPoint;${clipUniforms}uniform float seed;uniform float gain;uniform float spread;${noise}
vec3 blackbody(float h){
  vec3 c=vec3(.55,.035,.0)*smoothstep(0.,.22,h);
  c=mix(c,vec3(1.9,.26,.012),smoothstep(.16,.46,h));
  c=mix(c,vec3(3.3,1.15,.11),smoothstep(.42,.74,h));
  c=mix(c,vec3(3.3,2.05,.5),smoothstep(.74,1.08,h));
  return c;
}
void main(){
  if(worldPoint.y>ceiling)discard;
  float y=vUv.y,x=(vUv.x-.5)*2.;
  if(abs(x)>.985)discard;
  float t=time*(1.+seed*.06)+seed*11.;
  vec2 p=vec2(x*1.75*spread+seed*17.3,y*2.05-t*1.45);
  float w1=fbm(p*1.25+vec2(0.,-t*.3));
  float w2=fbm(p*2.7+vec2(w1*2.3,-t*1.05)+31.7);
  float w3=noise(p*7.+vec2(w2*2.2,-t*2.6));
  float w4=noise(p*15.+vec2(w3*1.5,-t*4.2));
  float sway=(w1-.5)*.78*y+(w2-.5)*.24*y+sin(t*1.7+seed*3.)*.045*y*y;
  float xx=x+sway;
  // Three tongues of different heights merge above a wide ember bed.
  float body=-1.;
  for(int i=0;i<3;i++){
    float fi=float(i);
    float off=(fi-1.)*.36+sin(seed*5.+fi*2.4)*.09;
    float top=mix(.6,1.,fract(sin(seed*3.1+fi*7.7)*91.3))*(.86+.14*sin(t*1.3+fi*2.1+seed));
    float yy=y/top;
    float width=mix(.44,.035,pow(clamp(yy,0.,1.),.66))/spread;
    body=max(body,(1.-abs(xx-off*(1.-y*.72))/width)*step(yy,1.)*(1.-smoothstep(.82,1.,yy)*.6));
  }
  float bed=(1.-abs(x)/(.6/spread))*(1.-smoothstep(0.,.24,y));
  body=max(body,bed);
  float erosion=w2*.62+w3*.27+w4*.11;
  float field=body*(1.12-y*.2)-erosion*(.34+y*1.2)+.17*(1.-y);
  float alpha=smoothstep(0.,.4,field)*smoothstep(0.,.045,y)*(1.-smoothstep(.86,1.,y))*(1.-smoothstep(.78,.97,abs(x)))*smoothstep(left-.12,left+.3,worldPoint.x)*(1.-smoothstep(right-.3,right+.12,worldPoint.x));
  if(alpha<.002)discard;
  float heat=clamp(field*(1.25-y*.5)+(1.-y)*.12,0.,1.2);
  vec3 color=blackbody(heat)*(.86+w4*.28);
  // Sooty, cooler tips and a faint blue seat where the fuel burns cleanly.
  color=mix(color,vec3(.5,.05,.004),smoothstep(.5,1.,y)*(1.-smoothstep(.2,.7,field))*.6);
  color+=vec3(.05,.12,.42)*smoothstep(.11,0.,y)*smoothstep(.2,.7,body);
  color=1.-exp(-color*gain);
  gl_FragColor=vec4(color,alpha*strength);
}`;

export function createFire(scene){
  const group=new T.Group();group.position.set(-.7,GROUND+.012,.42);scene.add(group);
  const uniforms={time:{value:0},strength:{value:1},smoke:{value:0},ceiling:{value:100},left:{value:-100},right:{value:100},glow:{value:0},haloFade:{value:1}};
  const shared={time:uniforms.time,strength:uniforms.strength,ceiling:uniforms.ceiling,left:uniforms.left,right:uniforms.right};
  // Back-to-front flame sheets give depth and parallax as the camera moves.
  const layers=[[-.16,1.12,3.1,.36,.86],[0,1,7.4,.46,1],[.15,.8,12.9,.34,1.22]].map(([z,size,seed,gain,spread])=>{
    const mat=new T.ShaderMaterial({uniforms:{...shared,seed:{value:seed},gain:{value:gain},spread:{value:spread}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,vertexShader:clipVertex,fragmentShader:flameFragment});
    const sheet=new T.Mesh(new T.PlaneGeometry(3.8*size,4.4),mat);sheet.position.set(0,2.2,z);sheet.renderOrder=3;group.add(sheet);return sheet;
  });
  const flame=layers[1];
  // Soft bloom around the flame body.
  const haloMat=new T.ShaderMaterial({uniforms:{...shared,glow:uniforms.glow,haloFade:uniforms.haloFade},transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,side:T.DoubleSide,vertexShader:clipVertex,
    fragmentShader:`varying vec2 vUv;varying vec3 worldPoint;${clipUniforms}uniform float glow;uniform float haloFade;void main(){vec2 p=(vUv-vec2(.5,.36))*vec2(2.,1.7);float d=dot(p,p);float a=exp(-d*5.5)*.34+exp(-d*22.)*.3;gl_FragColor=vec4(vec3(1.,.36,.07)*a*glow*haloFade,1.);}`});
  const halo=new T.Mesh(new T.PlaneGeometry(9,7),haloMat);halo.position.set(0,2.4,-.47);halo.renderOrder=2;group.add(halo);
  // Warm light pooled on the floor under and around the fire.
  const poolMat=new T.ShaderMaterial({uniforms:{glow:uniforms.glow,time:uniforms.time},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float glow;uniform float time;${noise}void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.35));float flick=.9+.1*noise(vec2(time*7.,3.));float a=(exp(-d*d*9.)*.55+exp(-d*d*60.)*.75)*flick;gl_FragColor=vec4(vec3(1.,.33,.05)*a*glow,1.);}`});
  const pool=new T.Mesh(new T.PlaneGeometry(11,11),poolMat);pool.rotation.x=-Math.PI/2;pool.position.set(0,.004,0);pool.renderOrder=1;group.add(pool);
  const smokeMat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float time;uniform float smoke;${noise}
    void main(){vec2 p=vUv;float w=fbm(vec2(p.x*3.2,p.y*2.6-time*.3));float n=fbm(vec2(p.x*5.5+(w-.5)*2.4,p.y*4.6-time*.5)+w*1.7);
      float spreadX=mix(.28,1.,smoothstep(0.,.8,p.y));float shape=pow(max(0.,1.-abs(p.x-.5+(w-.5)*.22)*2./spreadX),1.5)*smoothstep(0.,.12,p.y)*(1.-smoothstep(.55,1.,p.y));
      float a=smoothstep(.34,.8,n)*shape*smoke*.5;vec3 c=mix(vec3(.2,.19,.2),vec3(.42,.45,.5),p.y)+(n-.5)*.14;gl_FragColor=vec4(c,a);}`});
  const smoke=new T.Mesh(new T.PlaneGeometry(5.8,6.8),smokeMat);smoke.position.set(0,3.2,-.25);smoke.renderOrder=4;group.add(smoke);
  const light=new T.PointLight(0xff7a1e,0,14,1.5);light.position.set(-.7,GROUND+1.2,1);scene.add(light);
  const r=random(81),count=150,positions=new Float32Array(count*3),life=new Float32Array(count*2),seeds=[];
  for(let i=0;i<count;i++){seeds.push({x:(r()-.5)*2.3,y:r(),speed:.24+r()*.5,drift:(r()-.5)*1.7,curl:2+r()*7,depth:(r()-.5)*.5});life[i*2+1]=.35+r()*.9;}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('life',new T.BufferAttribute(life,2));
  const embers=new T.Points(geo,new T.ShaderMaterial({uniforms:{...shared},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'attribute vec2 life;varying vec3 worldPoint;varying float age;varying float size;void main(){age=life.x;size=life.y;vec4 world=modelMatrix*vec4(position,1.);worldPoint=world.xyz;vec4 p=viewMatrix*world;gl_Position=projectionMatrix*p;gl_PointSize=clamp(46.*life.y*(1.-age*.6)/-p.z,1.,7.);}',
    fragmentShader:`varying vec3 worldPoint;varying float age;varying float size;${clipUniforms}void main(){${clipTest}float d=length(gl_PointCoord-.5);float core=smoothstep(.5,.0,d);float twinkle=.65+.35*sin(time*(17.+size*23.)+size*40.);vec3 c=mix(vec3(1.,.74,.32),vec3(1.,.22,.02),smoothstep(.05,.8,age));gl_FragColor=vec4(c*twinkle,core*core*strength*(1.-smoothstep(.72,1.,age)));}`
  }));embers.renderOrder=5;group.add(embers);
  let state={};
  return {group,light,getState:()=>state,update(t,camera,contact){
    // The straight edge physically limits the flame volume. Once contact is
    // reached it stays extinguished, including when D stands up again.
    const pressing=contact.pressing,extinct=t>=5.35;
    const gap=pressing?Math.max(0,contact.underSide-(GROUND+.035)):4.4;
    const height=extinct?0:Math.min(4.4,gap),compression=1-height/4.4;
    const power=Math.min(1,height/.38);
    // The visible tongues reach about 3 units, so the flame only starts to
    // squash at the moment the falling edge meets its tips.
    const sheetHeight=extinct?0:4.4*Math.min(1,gap/3),squeeze=1-sheetHeight/4.4;
    const flicker=.86+.09*Math.sin(t*17.3)+.06*Math.sin(t*29.1+1.3)+.05*Math.sin(t*7.7+.4);
    uniforms.time.value=t;uniforms.strength.value=power;
    uniforms.ceiling.value=pressing?contact.underSide-.018:100;
    uniforms.left.value=pressing?contact.left+.02:-100;
    uniforms.right.value=pressing?contact.right-.02:100;
    uniforms.haloFade.value=(1-squeeze)*(1-squeeze);uniforms.glow.value=power*Math.min(1,height/1.6)*(1-squeeze*.6)*flicker;
    uniforms.smoke.value=.16*power+(phase(t,5.05,5.55)*(1-phase(t,6.4,8.9)))*.7;
    const yaw=Math.atan2(camera.position.x-group.position.x,camera.position.z-group.position.z);
    const widen=1+squeeze*.1;
    for(const sheet of layers){sheet.scale.set(widen,sheetHeight/4.4,1);sheet.position.y=sheetHeight/2;sheet.rotation.set(0,yaw,0);sheet.visible=height>.001;}
    halo.scale.set(1,Math.max(.001,sheetHeight/4.4),1);halo.position.y=sheetHeight*.55;halo.rotation.set(0,yaw,0);halo.visible=height>.001;
    pool.visible=uniforms.glow.value>.001;embers.visible=height>.001;
    smoke.quaternion.copy(camera.quaternion);smoke.position.y=2.8+phase(t,5.35,8.9)*1.1;
    light.position.y=GROUND+Math.min(1.2,height*.5);light.intensity=power*Math.min(1,height/1.2)*34*flicker;
    let emberTop=GROUND;
    for(let i=0;i<count;i++){const s=seeds[i],age=(t*s.speed+s.y)%1;
      const x=s.x*(1-age*.45)+Math.sin(age*s.curl+s.x*5)*age*.34+s.drift*age*age;
      positions[i*3]=pressing?Math.max(contact.left-group.position.x+.06,Math.min(contact.right-group.position.x-.06,x)):x;
      positions[i*3+1]=age*Math.min(5.6,pressing?Math.max(0,height-.03):5.6);positions[i*3+2]=s.depth*(1-age*.5);
      life[i*2]=age;
      emberTop=Math.max(emberTop,positions[i*3+1]+group.position.y);
    }
    geo.attributes.position.needsUpdate=true;geo.attributes.life.needsUpdate=true;group.visible=t<9.1;
    state={pressing,extinct,height,compression,underSide:contact.underSide,ceiling:uniforms.ceiling.value,flameTop:group.position.y+height,emberTop,power};
    return power;
  }};
}
