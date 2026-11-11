import * as T from '../vendor/three.module.min.js';
export const GROUND=-1.8;
export const clamp=x=>Math.max(0,Math.min(1,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export const phase=(t,a,b)=>{let x=clamp((t-a)/(b-a));return x*x*x*(x*(x*6-15)+10);};
export function texture(size, draw, repeat=1) {
  const canvas = document.createElement('canvas'); canvas.width=canvas.height=size;
  draw(canvas.getContext('2d'),size);
  const tex = new T.CanvasTexture(canvas); tex.colorSpace=T.SRGBColorSpace;
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeat,repeat);return tex;
}
// Deterministic micro-textures; no generated or substituted product photographs.
export function random(seed=19){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function material(color,roughness=.5,metalness=0){return new T.MeshStandardMaterial({color,roughness,metalness});}
export function mesh(geometry,mat,parent){const m=new T.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
