import assert from 'node:assert/strict';
import * as T from 'three';
import {solid,metrics} from '../models.ts';
import {hingedTransforms,curvedPoints} from '../unfolding.ts';
import {combinationParts} from '../combinations.ts';
const near=(a,b,msg)=>assert(Math.abs(a-b)<1e-6,msg+': '+a+' vs '+b);
for(const shape of ['cube','box','prism','oblique','pyramid','tetra']){
 const poly=solid(shape,4,3,5,2),flat=hingedTransforms(poly,1);
 for(const t of [0,.25,.5,.75,1]){
  const matrices=hingedTransforms(poly,t);
  poly.faces.forEach((f,i)=>{for(let j=0;j<f.length;j++){const p=poly.vertices[f[j]],q=poly.vertices[f[(j+1)%f.length]];near(p.distanceTo(q),p.clone().applyMatrix4(matrices[i]).distanceTo(q.clone().applyMatrix4(matrices[i])),shape+' edge changed length');}});
 }
 poly.faces.forEach((f,i)=>f.forEach(j=>near(poly.vertices[j].clone().applyMatrix4(flat[i]).y,poly.vertices[0].y,shape+' net not flat')));
 const closed=hingedTransforms(poly,0);closed.forEach(m=>m.elements.forEach((v,i)=>near(v,new T.Matrix4().elements[i],shape+' folded matrix')));
}
for(const kind of ['cylinder','cone']){
 const r=2,h=5,flat=curvedPoints(kind,r,h,1),closed=curvedPoints(kind,r,h,0);
 for(const p of flat)assert(p.toArray().every(Number.isFinite));
 if(kind==='cylinder'){flat.forEach(p=>near(p.z,r,'cylinder plane'));near(flat[96].x-flat[0].x,2*Math.PI*r,'rectangle width');}
 else{flat.forEach(p=>near(p.y,h/2,'cone plane'));const last=flat.slice(12*97);last.forEach(p=>near(Math.hypot(p.x,p.z),Math.hypot(r,h),'sector radius'));}
 const area=points=>{let result=0;for(let j=0;j<12;j++)for(let i=0;i<96;i++){const a=j*97+i,b=a+97;for(const tri of [[a,b,a+1],[a+1,b,b+1]]){const [p,q,r]=tri.map(k=>points[k]);result+=new T.Vector3().crossVectors(q.clone().sub(p),r.clone().sub(p)).length()/2;}}return result;};
 assert(Math.abs(area(flat)/area(closed)-1)<.002,'unfold changed surface area');
}
let p=combinationParts('coneCylinder',2,5,1,1,1);near(p[1].volume/p[0].volume,1/3,'cone ratio');
p=combinationParts('ballCylinder',2,5,1,1,1);near(p[0].h,4,'cylinder height');near(p[1].volume/p[0].volume,2/3,'ball ratio');
p=combinationParts('coneBall',2,5,1,1,1);near(p[1].a,2,'equatorial radius');near(p[1].h,2,'equatorial height');
for(const height of [.1,.5,1,1.5,1.9]){const parts=combinationParts('coneBall',2,5,1,1,height),c=parts[1];near(c.position[1]+c.h/2,2,'apex on sphere');near(c.a*c.a+(c.position[1]-c.h/2)**2,4,'base circle on sphere');}
near(metrics('oblique',4,3,5,3).volume,metrics('prism',4,3,5).volume,'shear preserves volume');
console.log('Passed: six polyhedron nets at five animation stages; exact flat endpoints; curved surface area; five composition constraints; oblique prism volume.');

// Constraints for the remaining two composition presets.
p=combinationParts('cylinderBox',2,5,1,1,1);
near(p[0].a,4,'box width');near(p[0].b,4,'box depth');near(p[1].volume/p[0].volume,Math.PI/4,'inscribed cylinder volume ratio');
p=combinationParts('compareCylinders',2,5,1.5,.5,1);
near(p[1].volume/p[0].volume,1.5**2*.5,'two cylinder scaling');
console.log('Passed: cylinder-in-box and independent cylinder comparison.');

// Globe gores: spherical endpoint, matching seams, planar leaves and finite intermediates.
const {gorePoints,GORE_COUNT,GORE_ROWS,GORE_COLUMNS}=await import('../globe.ts');
assert.equal(GORE_COUNT,30);
const radius=2.5;
let flatArea=0;
for(let i=0;i<GORE_COUNT;i++){
 const closed=gorePoints(radius,i,0),next=gorePoints(radius,(i+1)%GORE_COUNT,0),flat=gorePoints(radius,i,1);
 closed.forEach(p=>near(p.length(),radius,'globe radius'));
 for(let row=0;row<=GORE_ROWS;row++)near(closed[row*(GORE_COLUMNS+1)+GORE_COLUMNS].distanceTo(next[row*(GORE_COLUMNS+1)]),0,'gore seam gap');
 flat.forEach(p=>near(p.y,-radius,'flat leaf plane'));
 for(const opening of [.1,.25,.5,.75,.9])gorePoints(radius,i,opening).forEach(p=>assert(p.toArray().every(Number.isFinite),'nonfinite gore'));
 near(flat[0].distanceTo(flat[GORE_COLUMNS]),0,'south leaf tip');near(flat[GORE_ROWS*(GORE_COLUMNS+1)].distanceTo(flat[(GORE_ROWS+1)*(GORE_COLUMNS+1)-1]),0,'north leaf tip');
 for(let row=0;row<GORE_ROWS;row++)for(let column=0;column<GORE_COLUMNS;column++){
  const a=row*(GORE_COLUMNS+1)+column,b=a+GORE_COLUMNS+1;
  for(const tri of [[a,b,a+1],[a+1,b,b+1]]){const [p,q,r]=tri.map(j=>flat[j]);flatArea+=new T.Vector3().crossVectors(q.clone().sub(p),r.clone().sub(p)).length()/2;}
 }
}
assert(Math.abs(flatArea/(4*Math.PI*radius**2)-1)<.002,'flat gores area');
console.log('Passed: 30 globe gores, closed seams, planar pointed leaves, intermediate positions and total flat area.');

// All regular bases used by the unified prism and pyramid catalog.
for(const n of [3,4,5,6])for(const shape of ['prism','oblique','pyramid']){
 const a=3,h=5,shift=1.7,poly=solid(shape,a,2,h,shift,n),m=metrics(shape,a,2,h,shift,n);
 const expectedBase=n*a*a/(4*Math.tan(Math.PI/n));
 near(m.volume,expectedBase*h/(shape==='pyramid'?3:1),'polygon volume');
 assert.equal(poly.vertices.length,shape==='pyramid'?n+1:2*n);
 assert.equal(poly.faces.length,shape==='pyramid'?n+1:n+2);
 const edges=new Map();let area=0,volume=0;
 const center=poly.vertices.reduce((sum,p)=>sum.add(p),new T.Vector3()).divideScalar(poly.vertices.length);
 for(const f of poly.faces){
  for(let j=0;j<f.length;j++){const key=[f[j],f[(j+1)%f.length]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}
  for(let j=1;j<f.length-1;j++){
   const [p,q,r]=[f[0],f[j],f[j+1]].map(i=>poly.vertices[i]);
   area+=new T.Vector3().crossVectors(q.clone().sub(p),r.clone().sub(p)).length()/2;
   volume+=Math.abs(p.clone().sub(center).dot(new T.Vector3().crossVectors(q.clone().sub(center),r.clone().sub(center))))/6;
  }
 }
 edges.forEach(count=>assert.equal(count,2,'closed manifold'));
 near(area,m.area,shape+n+' surface matches mesh');near(volume,m.volume,shape+n+' volume matches mesh');
 near(poly.vertices.length-edges.size+poly.faces.length,2,'Euler');
 for(let i=0;i<n;i++)near(poly.vertices[i].distanceTo(poly.vertices[(i+1)%n]),a,'regular base side');
 for(const t of [0,.25,.5,.75,1]){
  const transforms=hingedTransforms(poly,t);
  poly.faces.forEach((f,i)=>f.forEach((j,k)=>near(poly.vertices[j].distanceTo(poly.vertices[f[(k+1)%f.length]]),poly.vertices[j].clone().applyMatrix4(transforms[i]).distanceTo(poly.vertices[f[(k+1)%f.length]].clone().applyMatrix4(transforms[i])),'new net rigid')));
  if(t===1)poly.faces.forEach((f,i)=>f.forEach(j=>near(poly.vertices[j].clone().applyMatrix4(transforms[i]).y,-h/2,'new net planar')));
 }
}
const {vertexName,polygonTheory}=await import('../models.ts');
const {default:katex}=await import('katex');
for(const n of [3,4,5,6])for(const shape of ['prism','oblique','pyramid']){
 const theory=polygonTheory(shape,n);
 for(const key of ['volume','area','base','perimeter','apothem'])katex.renderToString(theory[key],{throwOnError:true});
 const poly=solid(shape,3,2,5,1,n),labels=poly.vertices.map((_,i)=>vertexName(shape,i,n));assert.equal(new Set(labels).size,labels.length);
}
console.log('Passed: all 12 polygonal models, mesh areas/volumes, manifold topology, rigid and planar nets, labels and theory formulas.');
