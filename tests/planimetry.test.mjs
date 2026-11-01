import assert from 'node:assert/strict';
import katex from 'katex';
import {buildPlane,defaults,modes,dist,angle} from '../planimetry-model.ts';
const near=(a,b,msg='')=>assert(Math.abs(a-b)<1e-7,`${msg}: ${a} != ${b}`);
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
for(const entry of modes){
 const base=buildPlane(entry.id,defaults);
 const cases=[defaults,...base.controls.flatMap(c=>[c.min,c.max].map(n=>({...defaults,[c.key]:n})))];
 for(const p of cases){const m=buildPlane(entry.id,p);
  for(const point of m.points)assert(Number.isFinite(point.x)&&Number.isFinite(point.y),entry.id+' finite point');
  for(const a of m.angles)assert(Number.isFinite(angle(a.a,a.o,a.b)),entry.id+' finite angle');
  for(const f of m.formulas)katex.renderToString(f,{throwOnError:true});
  if(m.area){const n=['parallel','trapezoid','incquad'].includes(entry.id)?4:3,poly=m.points.slice(0,n);const shoelace=Math.abs(poly.reduce((sum,a,i)=>{const b=poly[(i+1)%n];return sum+a.x*b.y-a.y*b.x;},0))/2;near(m.area,shoelace,entry.id+' polygon area');}
  if(entry.id==='triangle'||entry.id==='isosceles'){const [A,B,C,H,M,D,E,F]=m.points;near(dist(A,M),dist(M,B));near(dist(A,D)/dist(D,B),dist(A,C)/dist(C,B),'bisector');near(Math.abs(cross(C,E,F))/2,m.area/4,'middle triangle');const circle=m.circles[0];[A,B,C].forEach(v=>near(dist(v,circle.o),circle.r));}
  if(entry.id==='right'){const [C,B,A,H,M,D]=m.points;near(angle(A,C,B),90);near(dist(A,B)**2,dist(C,A)**2+dist(C,B)**2);near(dist(C,M),dist(A,B)/2);near((C.x-H.x)*(B.x-A.x)+(C.y-H.y)*(B.y-A.y),0);near(dist(A,D)/dist(D,B),dist(C,A)/dist(C,B));}
  if(entry.id==='cyclic'){const [A,B,C,D]=m.points;near(angle(D,A,B)+angle(B,C,D),180);near(angle(A,B,D),angle(A,C,D));}
  if(entry.id==='angles'||entry.id==='diameters'){const [A,B,C,O]=m.points;near(angle(A,O,B),2*angle(A,C,B));}
  if(entry.id==='tangent'){const [A,B,C,O]=m.points;near((O.x-A.x)*(C.x-A.x)+(O.y-A.y)*(C.y-A.y),0);near(dist(A,C)**2,dist(O,C)**2-p.r**2);}
  if(entry.id==='incquad'){const vs=m.points.slice(0,4),ls=vs.map((a,i)=>dist(a,vs[(i+1)%4]));near(ls[0]+ls[2],ls[1]+ls[3]);vs.forEach((a,i)=>near(Math.abs(cross(a,vs[(i+1)%4],{x:0,y:0}))/ls[i],p.r,'tangent distance'));}
 }
}
console.log('Passed: all 10 planimetry modes and parameter extremes; areas, angle invariants, bisectors, midlines, circumcircles, tangents and Pitot theorem.');
import {movePlanePoint,originPose,place,factsOnDrawing} from '../planimetry-interaction.ts';
let moved=0;
for(const {id} of modes){
 const m=buildPlane(id,defaults);
 for(const p of m.points.filter(p=>p.name)){
  const target={x:p.x+1.3,y:p.y-.7},result=movePlanePoint(id,defaults,originPose,p.name,target),next=buildPlane(id,result.params),hit=place(next.points.find(q=>q.name===p.name),result.pose);
  near(hit.x,target.x,id+' draggable '+p.name+' x');near(hit.y,target.y,id+' draggable '+p.name+' y');
  next.controls.forEach(c=>assert(result.params[c.key]>=c.min-1e-7&&result.params[c.key]<=c.max+1e-7,id+' valid constraints'));
  next.points.forEach(q=>assert(Number.isFinite(q.x)&&Number.isFinite(q.y),id+' drag remains finite'));
  if(id==='right'){const [C,B,A]=next.points;near(angle(A,C,B),90);}
  if(id==='isosceles'){const [A,B,C]=next.points;near(dist(A,C),dist(B,C));}
  if(id==='cyclic')next.points.slice(0,4).forEach(q=>near(dist(q,{x:0,y:0}),result.params.r));
  moved++;
 }
}
const labels=(mode,layers=[],measure=true)=>factsOnDrawing(mode,defaults,layers,measure).map(f=>f.label);
assert(!labels('triangle').includes('CH'));assert(labels('triangle',['height']).includes('CH'));
assert(!labels('triangle').includes('Высота из A'));assert(!labels('triangle').includes('Радиус R'));assert(labels('triangle',['circumcircle']).includes('Радиус R'));
assert(!labels('right',['height','angles']).includes('∠HCM'));assert(labels('right',['height','median','angles']).includes('∠HCM'));
assert(!labels('trapezoid',['midline']).includes('EN'));assert(labels('trapezoid',['midline','diagonal']).includes('EN'));
assert(!labels('incquad',[],false).includes('AB'));assert(labels('incquad',[],true).includes('AB'));
assert(!labels('cyclic',['angles']).includes('∠ABD'));assert(labels('cyclic',['angles','diagonal']).includes('∠ABD'));
console.log(`Passed: ${moved} named points move to the cursor in all 10 modes, constraints survive; facts require their visible constructions.`);
const {zoomPlaneView}=await import('../planimetry-interaction.ts');
const view={zoom:1.4,pan:{x:180,y:-70}},cursor={x:720,y:120};
for(const delta of [-900,-120,120,900,100000,-100000]){const z=zoomPlaneView(view,cursor,delta);near((cursor.x-500-z.pan.x)/z.zoom,(cursor.x-500-view.pan.x)/view.zoom,'cursor-anchored zoom x');near((cursor.y-340-z.pan.y)/z.zoom,(cursor.y-340-view.pan.y)/view.zoom,'cursor-anchored zoom y');assert(z.zoom>=.25&&z.zoom<=6);}
console.log('Passed: view zoom retains the cursor anchor and safe limits even with an offset figure.');
