import * as T from '../vendor/three.module.min.js';
import {GROUND,random,texture} from './common.js?v=20261112s9';

// Landing effects for the moment D slams the fire out: dust rolling away
// along the floor and sparks squeezed out from under the straight edge.
// Everything is a pure function of the time since impact, so seeking works.
export function createImpact(scene,impactTime){
  const group=new T.Group();scene.add(group);
  const r=random(207);
  const puffTexture=texture(256,(c,s)=>{
    const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.35,'rgba(255,255,255,.42)');g.addColorStop(.7,'rgba(255,255,255,.1)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,s,s);
    c.globalCompositeOperation='destination-out';for(let i=0;i<70;i++){const a=r()*6.283,d=s*(.18+r()*.3),q=s*(.03+r()*.08),h=c.createRadialGradient(s/2+Math.cos(a)*d,s/2+Math.sin(a)*d,0,s/2+Math.cos(a)*d,s/2+Math.sin(a)*d,q);h.addColorStop(0,'rgba(0,0,0,.35)');h.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=h;c.fillRect(0,0,s,s);}
  });
  const puffs=[];
  for(let i=0;i<22;i++){
    const side=i%2?1:-1,mat=new T.SpriteMaterial({map:puffTexture,color:new T.Color().setHSL(.58,.1,.36+r()*.14),transparent:true,depthWrite:false,opacity:0,rotation:r()*6.283});
    const sprite=new T.Sprite(mat);sprite.renderOrder=6;group.add(sprite);
    puffs.push({sprite,side,reach:.7+r()*2.5,depth:(r()-.35)*1.5,size:.55+r()*.9,rise:.12+r()*.55,delay:r()*.09,spin:(r()-.5)*1.4,base:mat.rotation});
  }
  const count=90,positions=new Float32Array(count*3),life=new Float32Array(count),seeds=[];
  for(let i=0;i<count;i++){const side=i%2?1:-1,angle=.08+r()*.62,speed=2.2+r()*5.2;seeds.push({side,edge:r(),vx:Math.cos(angle)*speed*side,vy:Math.sin(angle)*speed,vz:(r()-.3)*2.4,ttl:.35+r()*.75});}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('life',new T.BufferAttribute(life,1));
  const sparks=new T.Points(geo,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'attribute float life;varying float age;void main(){age=life;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(52.*(1.-life*.7)/-p.z,1.,6.);}',
    fragmentShader:'varying float age;void main(){if(age<0.||age>=1.)discard;float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);vec3 c=mix(vec3(1.,.78,.36),vec3(1.,.2,.02),smoothstep(0.,.75,age));gl_FragColor=vec4(c,a*a*(1.-smoothstep(.6,1.,age)));}'
  }));sparks.renderOrder=7;sparks.frustumCulled=false;group.add(sparks);
  return{group,update(t,foot){
    const age=t-impactTime,active=age>=0&&age<2.6;group.visible=active;if(!active)return;
    for(const p of puffs){
      const a=Math.max(0,age-p.delay),travel=1-Math.exp(-a*2.6),grow=p.size*(.35+1.5*(1-Math.exp(-a*2.1)));
      p.sprite.position.set((p.side>0?foot.right:foot.left)+p.side*(p.reach*travel-.15),GROUND+grow*.32+p.rise*a*.5,foot.z+p.depth*travel);
      p.sprite.scale.set(grow*1.55,grow,1);p.sprite.material.rotation=p.base+p.spin*a;
      p.sprite.material.opacity=.24*Math.min(1,a*14)*Math.exp(-a*1.6);
    }
    for(let i=0;i<count;i++){const s=seeds[i],k=age/s.ttl;life[i]=age>0?k:-1;
      const x0=s.side>0?foot.right-s.edge*.25:foot.left+s.edge*.25,drag=(1-Math.exp(-age*2.4))/2.4;
      let y=GROUND+.03+s.vy*drag-3.4*age*age;if(y<GROUND+.015)y=GROUND+.015;
      positions[i*3]=x0+s.vx*drag;positions[i*3+1]=y;positions[i*3+2]=foot.z+.2+s.vz*drag;
    }
    geo.attributes.position.needsUpdate=true;geo.attributes.life.needsUpdate=true;
  }};
}
