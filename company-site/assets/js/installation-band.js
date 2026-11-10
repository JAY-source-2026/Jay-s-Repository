// Blue factory wrapping, referenced to the unmodified catalogue photograph.
// UVs sample only the package, excluding the white background and product label.
const PHOTO_QUAD = [[258,101],[820,275],[794,357],[222,185]];
function photoUV(u,v) {
  const [a,b,c,d]=PHOTO_QUAD;
  return [((a[0]*(1-u)+b[0]*u)*(1-v)+(d[0]*(1-u)+c[0]*u)*v)/900,
    1-((a[1]*(1-u)+b[1]*u)*(1-v)+(d[1]*(1-u)+c[1]*u)*v)/424];
}

export async function openingBandMaterials(T,renderer,textures) {
  const film=new T.MeshPhysicalMaterial({color:'#2c61a2',roughness:.46,metalness:0,clearcoat:.24,clearcoatRoughness:.36});
  film.name='opening-band-blue-printed-film';
  try {
    const photo=await new T.TextureLoader().loadAsync(new URL('../images/products/band.webp',import.meta.url).href);
    photo.colorSpace=T.SRGBColorSpace;
    photo.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(photo);
    film.map=photo;film.color.set('#ffffff');
  } catch(error) { console.warn('Band photograph unavailable; using blue wrapping.',error); }
  const seam=new T.MeshPhysicalMaterial({color:'#3266a4',roughness:.5,metalness:0,clearcoat:.18});
  seam.name='opening-band-folded-seal';
  return {bandFilm:film,bandSeam:seam};
}

// A sealed strip: long direction X, thickness Y, package width Z.
// The photograph remains intact; only mesh UV coordinates are transformed.
export function wrappedBandStrip({T,parent,length,thickness,width,materials,owned}) {
  const root=new T.Group();parent.add(root);
  Object.assign(root.userData,{component:'wrapped-opening-band',wrapper:'blue-printed-film',shape:'strip',length,width,thickness});
  const geo=new T.BoxGeometry(length,thickness,width,Math.max(8,Math.ceil(length/.035)),2,8);
  const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=x/length+.5;
    // Flatten the heat-sealed ends and subtly fold the film at the long edges.
    const end=Math.min(1,(length/2-Math.abs(x))/.009);
    const edge=Math.min(1,(width/2-Math.abs(z))/.004);
    const ripple=Math.sin(x*153+z*211)*Math.sin(x*67-z*89)*.00018*end*edge;
    p.setY(i,y*(.7+.3*end)*(.86+.14*edge)+Math.sign(y)*ripple);
    const v=Math.abs(n.getY(i))>.5?z/width+.5:(z>0?.96:.04)+y/width;
    uv.setXY(i,...photoUV(u,Math.max(0,Math.min(1,v))));
  }
  geo.computeVertexNormals();owned.add(geo);
  const piece=new T.Mesh(geo,[materials.bandSeam,materials.bandSeam,materials.bandFilm,materials.bandFilm,materials.bandFilm,materials.bandFilm]);
  piece.castShadow=true;piece.receiveShadow=true;root.add(piece);
  const sealGeo=new T.BoxGeometry(Math.min(.004,length*.025),thickness*.72,width*.985);owned.add(sealGeo);
  for(const sign of [-1,1]) {
    const seal=new T.Mesh(sealGeo,materials.bandSeam);seal.position.x=sign*(length/2-.003);root.add(seal);
  }
  return root;
}

export function wrappedBandRing({T,parent,inner,thickness,width,x=0,z=0,materials,owned}) {
  const root=new T.Group();root.position.set(x,0,z);parent.add(root);
  Object.assign(root.userData,{component:'wrapped-opening-band',wrapper:'blue-printed-film',shape:'ring',inner,thickness,width});
  const outer=inner+thickness,b=Math.min(.0008,thickness/8);
  const profile=[[inner+b,0],[outer-b,0],[outer,b],[outer,width-b],[outer-b,width],[inner+b,width],[inner,width-b],[inner,b],[inner+b,0]];
  const points=profile.map(([r,d])=>new T.Vector2(r,d));
  const geo=new T.LatheGeometry(points,96),uv=geo.attributes.uv;
  for(let i=0;i<uv.count;i++) {
    const d=profile[i%profile.length][1];
    uv.setXY(i,...photoUV(uv.getX(i),d/width));
  }
  geo.rotateX(Math.PI/2);owned.add(geo);
  const ring=new T.Mesh(geo,materials.bandFilm);ring.castShadow=true;ring.receiveShadow=true;root.add(ring);
  // The folded closing seam stays with the band during insertion and seeking.
  const seamGeo=new T.LatheGeometry(points,2,0,Math.min(.05,.004/outer));seamGeo.rotateX(Math.PI/2);owned.add(seamGeo);
  const seam=new T.Mesh(seamGeo,materials.bandSeam);seam.scale.set(1.0007,1.0007,1.0007);seam.position.z=-.00005;root.add(seam);
  return root;
}

export function wrappedDuctBands({T,parent,w,h,width,thickness,z,composite=false,isFloor=false,materials,owned}) {
  const pieces=[];
  function strip(length,t,x,y,vertical=false,layer=0) {
    const piece=wrappedBandStrip({T,parent,length,thickness:t,width,materials,owned});
    piece.position.set(x,y,z+width/2);if(vertical)piece.rotation.z=Math.PI/2;
    Object.assign(piece.userData,{layer,composite,side:vertical?(x<0?'left':'right'):(y<0?'bottom':'top')});pieces.push(piece);
  }
  // Keep the existing installation envelope. SFBI has a separate foil-faced
  // insulation body; only its intumescent strip receives the blue wrapping.
  for(const sign of [-1,1]) {
    const layers=composite?1:2,t=composite?(sign>0&&!isFloor?.02:.01):thickness/2;
    for(let layer=0;layer<layers;layer++) {
      const depth=composite?thickness-t:layer*t;
      for(let i=0;i<3;i++)strip((w+2*thickness)/3-.0006,t,(i-1)*(w+2*thickness)/3,sign*(h/2+depth+t/2),false,layer);
      const sideT=composite?.01:t,sideDepth=composite?thickness-sideT:layer*t;
      strip(h-.0006,sideT,sign*(w/2+sideDepth+sideT/2),0,true,layer);
    }
  }
  if(composite) {
    for(const sign of [-1,1]) {
      const topT=thickness-(sign>0&&!isFloor?.02:.01),sideT=thickness-.01;
      for(const [a,b,c,x,y] of [[w+2*sideT,topT,width,0,sign*(h/2+topT/2)],[sideT,h,width,sign*(w/2+sideT/2),0]]) {
        const geo=new T.BoxGeometry(a,b,c);owned.add(geo);
        const body=new T.Mesh(geo,materials.blanketFoil);body.position.set(x,y,z+width/2);
        body.userData.component='composite-band-insulation';parent.add(body);
      }
    }
  }
  return pieces;
}
