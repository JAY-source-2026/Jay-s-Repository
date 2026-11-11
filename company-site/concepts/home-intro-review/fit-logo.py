from pathlib import Path
import json,math
src=Path('company-site/concepts/logo-story/assets/logo-contours.json');data=json.loads(src.read_text())
def add(a,b):return [a[0]+b[0],a[1]+b[1]]
def sub(a,b):return [a[0]-b[0],a[1]-b[1]]
def mul(a,s):return [a[0]*s,a[1]*s]
def dot(a,b):return a[0]*b[0]+a[1]*b[1]
def norm(a):return mul(a,1/(math.hypot(*a) or 1))
def bez(c,t):
 s=1-t;return [s*s*s*c[0][j]+3*s*s*t*c[1][j]+3*s*t*t*c[2][j]+t*t*t*c[3][j] for j in [0,1]]
def fit(p,left,right,error=.7):
 if len(p)==2:
  d=math.dist(*p)/3;return [[p[0],add(p[0],mul(left,d)),add(p[-1],mul(right,d)),p[-1]]]
 distances=[0]
 for a,b in zip(p,p[1:]):distances.append(distances[-1]+math.dist(a,b))
 u=[d/distances[-1] for d in distances];c00=c01=c11=x0=x1=0
 for point,t in zip(p,u):
  s=1-t;b0=s*s*s;b1=3*s*s*t;b2=3*s*t*t;b3=t*t*t
  a0=mul(left,b1);a1=mul(right,b2);tmp=sub(point,add(mul(p[0],b0+b1),mul(p[-1],b2+b3)))
  c00+=dot(a0,a0);c01+=dot(a0,a1);c11+=dot(a1,a1);x0+=dot(a0,tmp);x1+=dot(a1,tmp)
 det=c00*c11-c01*c01
 a=(x0*c11-x1*c01)/det if abs(det)>1e-10 else 0
 b=(x1*c00-x0*c01)/det if abs(det)>1e-10 else 0
 if a<1e-5 or b<1e-5:a=b=math.dist(p[0],p[-1])/3
 c=[p[0],add(p[0],mul(left,a)),add(p[-1],mul(right,b)),p[-1]]
 worst,i=max((math.dist(bez(c,t),point),i) for i,(point,t) in enumerate(zip(p,u)))
 if worst<=error:return [c]
 i=max(1,min(len(p)-2,i));tangent=norm(sub(p[i-1],p[i+1]))
 return fit(p[:i+1],left,tangent,error)+fit(p[i:],mul(tangent,-1),right,error)
paths={}
for key in ['outer','hole','dot']:
 raw=data['smooth'][key];n=len(raw);sigma=4;radius=12
 weights=[math.exp(-.5*(k/sigma)**2) for k in range(-radius,radius+1)];total=sum(weights)
 p=[[sum(raw[(i+k+n)%n][j]*weights[k+radius] for k in range(-radius,radius+1))/total for j in [0,1]] for i in range(n)]
 half=n//2
 t0=norm(sub(p[2],p[-2]));th=norm(sub(p[half+2],p[half-2]))
 curves=fit(p[:half+1],t0,mul(th,-1))+fit(p[half:]+[p[0]],th,mul(t0,-1))
 paths[key]={'start':curves[0][0],'curves':[[*c[1],*c[2],*c[3]] for c in curves]}
data['source']='../../images/doenc_mark.png';data['paths']=paths;data['vectorMethod']='Cubic Bezier fit to original logo contours; additional 2-source-pixel contour smoothing removes compression waviness; max fitting distance 0.7 source pixels. Original proportions, holes and placement are preserved.'
Path('company-site/assets/media/intro/logo-vector.json').write_text(json.dumps(data,separators=(',',':')))
print({key:len(path['curves']) for key,path in paths.items()})
