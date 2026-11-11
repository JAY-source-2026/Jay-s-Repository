import * as T from '../vendor/three.module.min.js';
import {GROUND,phase,random} from './common.js?v=20261111s4';

const noise=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p+3.7;a*=.5;}return v;}
`;
export function createFire(scene){
  const group=new T.Group();group.position.set(-.7,GROUND+.012,.42);scene.add(group);
  const uniforms={time:{value:0},strength:{value:1},smoke:{value:0},ceiling:{value:100},left:{value:-100},right:{value:100}};
  const flameMat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:'varying vec2 vUv;varying vec3 worldPoint;void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:`varying vec2 vUv;varying vec3 worldPoint;uniform float time;uniform float strength;uniform float ceiling;uniform float left;uniform float right;${noise}
    void main(){
      if(worldPoint.y>ceiling||worldPoint.x<left||worldPoint.x>right)discard;
      vec2 uv=vUv;float y=uv.y;float x=(uv.x-.5)*2.4;
      float flow=fbm(vec2(x*3.1,y*4.8-time*1.7));
      float warp=(flow-.5)*(.16+y*.55)+sin(y*8.-time*3.2)*.045;
      float envelope=pow(max(0.,1.-y),.72)*1.22;
      float base=1.-abs(x+warp)/max(.02,envelope);
      float turbulent=fbm(vec2(x*7.+sin(y*8.+time)*.4,y*6.5-time*3.7));
      float fingers=sin(x*11.+time*1.4+flow*5.)*.22*y;
      float field=base-(.28+turbulent*.62)*(.15+y*1.25)+fingers;
      float alpha=smoothstep(.02,.22,field)*smoothstep(0.,.07,y)*(1.-smoothstep(.75,1.,y));
      alpha*=strength;
      float hot=clamp(field*(1.1-y*.35),0.,1.);
      vec3 color=mix(vec3(1.5,.09,.008),vec3(3.6,.62,.025),smoothstep(.1,.5,hot));
      color=mix(color,vec3(5.,3.1,.65),smoothstep(.52,.93,hot));
      color*=.85+noise(vec2(x*28.,y*35.-time*9.))*.25;
      gl_FragColor=vec4(color,alpha);
    }`});
  const flame=new T.Mesh(new T.PlaneGeometry(3.8,4.4),flameMat);flame.position.y=2.2;group.add(flame);
  const smokeMat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float time;uniform float smoke;${noise}
    void main(){vec2 p=vUv;float n=fbm(vec2(p.x*5.5+sin(p.y*4.-time)*.3,p.y*5.-time*.45));float shape=pow(max(0.,1.-abs(p.x-.5)*2.),1.8)*sin(p.y*3.14159);float a=smoothstep(.3,.76,n)*shape*smoke*.42;gl_FragColor=vec4(vec3(.33,.38,.43)+n*.1,a);}`});
  const smoke=new T.Mesh(new T.PlaneGeometry(5.8,6.8),smokeMat);smoke.position.set(0,3.2,-.25);group.add(smoke);
  const light=new T.PointLight(0xff6b12,0,12,1.6);light.position.set(-.7,GROUND+1.2,1);scene.add(light);
  const r=random(81),count=90,positions=new Float32Array(count*3),seeds=[];
  for(let i=0;i<count;i++)seeds.push({x:(r()-.5)*2.7,y:r(),speed:.3+r()*.6,drift:(r()-.5)*1.3,size:.4+r()});
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));
  const embers=new T.Points(geo,new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'varying vec3 worldPoint;void main(){vec4 world=modelMatrix*vec4(position,1.);worldPoint=world.xyz;vec4 p=viewMatrix*world;gl_Position=projectionMatrix*p;gl_PointSize=clamp(28./-p.z,1.,5.);}',
    fragmentShader:'varying vec3 worldPoint;uniform float strength;uniform float ceiling;uniform float left;uniform float right;void main(){if(worldPoint.y>ceiling||worldPoint.x<left||worldPoint.x>right)discard;float d=length(gl_PointCoord-.5);gl_FragColor=vec4(2.5,.65,.08,smoothstep(.5,.1,d)*strength);}'
  }));group.add(embers);
  let state={};
  return {group,light,getState:()=>state,update(t,camera,contact){
    // The straight edge physically limits the flame volume. Once contact is
    // reached it stays extinguished, including when D stands up again.
    const pressing=contact.pressing,extinct=t>=5.35;
    const gap=pressing?Math.max(0,contact.underSide-(GROUND+.035)):4.4;
    const height=extinct?0:Math.min(4.4,gap),compression=1-height/4.4;
    const power=phase(t,0,.8)*Math.min(1,height/.38);
    uniforms.time.value=t;uniforms.strength.value=power;
    uniforms.ceiling.value=pressing?contact.underSide-.018:100;
    uniforms.left.value=pressing?contact.left+.02:-100;
    uniforms.right.value=pressing?contact.right-.02:100;
    uniforms.smoke.value=.1*power+(phase(t,5.05,5.55)*(1-phase(t,6.4,8.9)))*.65;
    const footprint=contact.right-contact.left;
    flame.scale.set(pressing?Math.min(1+compression*.35,footprint/3.8):1,height/4.4,1);
    flame.position.y=height/2;flame.rotation.set(0,Math.atan2(camera.position.x-group.position.x,camera.position.z-group.position.z),0);
    flame.visible=height>.001;embers.visible=height>.001;
    smoke.quaternion.copy(camera.quaternion);smoke.position.y=2.8+phase(t,5.35,8.9)*1.1;
    light.position.y=GROUND+Math.min(1.2,height*.5);light.intensity=power*Math.min(1,height/1.2)*(12+Math.sin(t*19)*1.8+Math.sin(t*31)*1.2);
    let emberTop=GROUND;
    for(let i=0;i<count;i++){const s=seeds[i],age=(t*s.speed+s.y)%1;
      const x=s.x+Math.sin(age*8+s.x)*age*.25+s.drift*age;
      positions[i*3]=pressing?Math.max(contact.left-group.position.x+.06,Math.min(contact.right-group.position.x-.06,x)):x;
      positions[i*3+1]=age*(pressing?Math.max(0,height-.03):5.1);positions[i*3+2]=Math.cos(i)*.12;
      emberTop=Math.max(emberTop,positions[i*3+1]+group.position.y);
    }
    geo.attributes.position.needsUpdate=true;group.visible=t<9.1;
    state={pressing,extinct,height,compression,underSide:contact.underSide,ceiling:uniforms.ceiling.value,flameTop:group.position.y+height,emberTop,power};
    return power;
  }};
}
