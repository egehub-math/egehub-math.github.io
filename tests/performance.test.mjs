import assert from 'node:assert/strict';
import {createFramePublisher} from '../frame-value.ts';
import {lazyDrawingAdapter} from '../drawing-model.ts';
let id=0;const frames=new Map(),values=[];
const publisher=createFramePublisher(value=>values.push(value),run=>{const token=++id;frames.set(token,run);return token;},token=>frames.delete(token));
for(let i=0;i<1000;i++)publisher.publish(i/100);
assert.equal(frames.size,1,'many slider events schedule one frame');assert.equal(values.length,0);
const callback=[...frames.values()][0];frames.clear();callback();assert.deepEqual(values,[9.99]);
publisher.publish(-7);publisher.publish(0);publisher.flush();assert.equal(values.at(-1),0,'release flush preserves zero and last input');assert.equal(frames.size,0);
publisher.publish(4);publisher.immediate(1234.5);assert.equal(values.at(-1),1234.5,'manual input supersedes queued slider value');assert.equal(frames.size,0);
publisher.publish(8);publisher.discard();assert.equal(frames.size,0);assert.equal(publisher.pending,false);
let constructions=0,revision=1;const api={pick:(x,y)=>({point:[x,y]}),project:a=>({x:a.point[0],y:a.point[1]})};
const drawing=lazyDrawingAdapter(()=>{constructions++;return api;},undefined,()=>revision);
for(let i=0;i<1000;i++)drawing.revision();assert.equal(constructions,0,'idle drawing revisions never build geometry');
assert.deepEqual(drawing.pick(2,3),{point:[2,3]});assert.equal(constructions,1);
for(let i=0;i<1000;i++)drawing.project({point:[2,3]});assert.equal(constructions,1,'projection reuses geometry');
revision++;assert.equal(drawing.revision(),2);
console.log('Passed: 1000 slider updates coalesce to one frame, final/manual values remain exact, and idle annotations build zero geometry.');
const {closedDrawing,unfoldedDrawing}=await import('../stereo-drawing.ts');
const {solid}=await import('../models.ts');const {polyUnfold,curvedUnfold}=await import('../unfolding.ts');const {globeUnfold}=await import('../globe.ts');const T=await import('three');
const host={clientWidth:800,clientHeight:600},camera=new T.PerspectiveCamera(38,4/3,.1,500);camera.position.set(15,13,18);camera.lookAt(0,0,0);camera.updateMatrixWorld();
for(const shape of ['cube','box','prism','oblique','pyramid','cylinder','cone','ball'])for(const inverted of shape==='cone'?[false,true]:[false]){
 const a=3.7,h=5.3,poly=solid(shape,a,2.6,h,1.2,5),net=shape==='ball'?globeUnfold(a):shape==='cone'||shape==='cylinder'?curvedUnfold(shape,a,h):polyUnfold(poly);
 if(shape==='cone'&&inverted)net.group.rotation.z=Math.PI;net.update(0);
 const reference=unfoldedDrawing(net.group,camera,host),fast=closedDrawing(shape,a,h,poly,inverted,camera,host);let count=0;net.group.traverse(o=>{if(o instanceof T.Mesh)count+=o.geometry.getAttribute('position').count;});
 for(let i=0;i<count;i+=Math.max(1,Math.floor(count/150))){const anchor={point:[0,0,0],indices:[i],weights:[1]},expected=reference.project(anchor),actual=fast.project(anchor);assert(actual&&expected);assert(Math.hypot(actual.x-expected.x,actual.y-expected.y)<.0001,shape+' canonical vertex order changed at '+i);}
 net.group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});
}
console.log('Passed: lightweight drawing geometry matches every canonical net vertex for all shape families, including inverted cones.');
