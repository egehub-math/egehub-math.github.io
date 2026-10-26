import {gorePoints,GORE_COUNT,GORE_ROWS,GORE_COLUMNS} from './globe.ts';
import {curvedPoints,type Poly} from './unfolding.ts';
import {round,type Shape} from './models.ts';
import * as T from 'three';
import {anchoredCoordinates,type Anchor,type DrawingAdapter} from './drawing-model.ts';
export function stereoDrawing(camera:T.Camera,vertices:T.Vector3[],faces:number[][],host:HTMLElement,faceGroups?:number[]):DrawingAdapter{
 const ray=new T.Raycaster(),coordinates=vertices.map(v=>v.toArray()),worldCache=new WeakMap<Anchor,T.Vector3>(),projection=new T.Vector3();let cachedEdges:number[][]|null=null;
 const resolve=(anchor:Anchor)=>{const cached=worldCache.get(anchor);if(cached)return cached;const p=anchoredCoordinates(anchor,coordinates);if(!p)return null;const value=new T.Vector3(...p as [number,number,number]);worldCache.set(anchor,value);return value;};
 const project=(anchor:Anchor)=>{const p=resolve(anchor);if(!p)return null;const v=projection.copy(p).project(camera);if(v.z < -1||v.z>1)return null;return {x:(v.x+1)*host.clientWidth/2,y:(1-v.y)*host.clientHeight/2};};
 const bind=(point:T.Vector3,ids:number[],face?:number):Anchor=>{const triangle=new T.Triangle(...ids.map(i=>vertices[i]) as [T.Vector3,T.Vector3,T.Vector3]);const bary=triangle.getBarycoord(point,new T.Vector3());return {point:point.toArray(),indices:ids,planeIndices:ids,face,surface:face===undefined?undefined:faceGroups?.[face],weights:bary?.toArray()||[1,0,0]};};
 const surfaceKey=(anchor:Anchor)=>{const ids=anchor.planeIndices||anchor.indices;if(!ids||ids.length!==3)return '';const p=new T.Plane().setFromCoplanarPoints(...ids.map(i=>vertices[i]) as [T.Vector3,T.Vector3,T.Vector3]);const values=[...p.normal.toArray(),p.constant],sign=(values.find(x=>Math.abs(x)>1e-6)||1)<0?-1:1;return (anchor.surface===undefined?'':anchor.surface+'|')+values.map(x=>Math.round(x*sign*1e5)).join(':');};
 return {project,requiresPlane:true,surfaceKey,outline(anchor){const f=anchor.face===undefined?anchor.planeIndices:faces[anchor.face];return (f||[]).map(i=>project({point:coordinates[i]})).filter((p):p is {x:number,y:number}=>!!p);},pick(x,y,plane,snap=true){
  camera.updateMatrixWorld();ray.setFromCamera(new T.Vector2(x/host.clientWidth*2-1,1-y/host.clientHeight*2),camera);
  const planeIds=plane?.planeIndices||plane?.indices;
  if(planeIds?.length===3){const ids=planeIds;const p=new T.Plane().setFromCoplanarPoints(...ids.map(i=>vertices[i]) as [T.Vector3,T.Vector3,T.Vector3]);const hit=ray.ray.intersectPlane(p,new T.Vector3());return hit?{...bind(hit,ids,plane?.face),surface:plane?.surface}:null;}
  let best:Anchor|null=null,distance=Infinity;
  for(let faceIndex=0;faceIndex<faces.length;faceIndex++){const face=faces[faceIndex];for(let j=1;j<face.length-1;j++){
   const ids=[face[0],face[j],face[j+1]],hit=ray.ray.intersectTriangle(vertices[ids[0]],vertices[ids[1]],vertices[ids[2]],false,new T.Vector3());
   if(hit){const d=hit.distanceToSquared(ray.ray.origin);if(d<distance){best=bind(hit,ids,faceIndex);distance=d;}}
  }
  }
  if(!best)return null;
  if(!snap)return best;
  // Snap to visible vertices and edges only, avoiding the back of a transparent solid.
  const hit=resolve(best)!,planeIndices=best.planeIndices,face=best.face,surface=best.surface;let nearest=11;
  for(let i=0;i<vertices.length;i++){const a:Anchor={point:vertices[i].toArray(),indices:[i],weights:[1]},p=project(a);if(!p)continue;const d=Math.hypot(p.x-x,p.y-y);if(d<nearest&&vertices[i].distanceTo(ray.ray.origin)<=hit.distanceTo(ray.ray.origin)+.2){nearest=d;best={...a,planeIndices,face,surface};}}
  if(nearest<11)return best;
  if(!cachedEdges){const edges=new Set<string>();faces.forEach(f=>f.forEach((i,j)=>edges.add([i,f[(j+1)%f.length]].sort((a,b)=>a-b).join(','))));cachedEdges=[...edges].map(edge=>edge.split(',').map(Number));}
  for(const [i,j] of cachedEdges){const a=project({point:vertices[i].toArray()}),b=project({point:vertices[j].toArray()});if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(a.x+t*dx-x,a.y+t*dy-y);if(d>=nearest)continue;
   const target=vertices[j].clone().sub(vertices[i]),cross=new T.Vector3(),onEdge=new T.Vector3();ray.ray.distanceSqToSegment(vertices[i],vertices[j],cross,onEdge);const k=onEdge.clone().sub(vertices[i]).dot(target)/target.lengthSq();
   if(onEdge.distanceTo(ray.ray.origin)>hit.distanceTo(ray.ray.origin)+.2)continue;
   nearest=d;best={point:onEdge.toArray(),indices:[i,j],planeIndices,face,surface,weights:[1-k,k]};
  }
  return best;
 }};
}

// Capture the actual visible geometry at an unfolded endpoint, including transformed caps and gores.
export function unfoldedDrawing(group:T.Group,camera:T.Camera,host:HTMLElement){
 const vertices:T.Vector3[]=[],faces:number[][]=[],faceGroups:number[]=[];let surface=0;group.updateMatrixWorld(true);
 group.traverse(object=>{if(!(object instanceof T.Mesh))return;const surfaceId=surface++;const geometry=object.geometry,position=geometry.getAttribute('position');if(!position)return;const offset=vertices.length;for(let i=0;i<position.count;i++)vertices.push(new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld));const index=geometry.getIndex();for(let i=0;i<(index?.count??position.count);i+=3){const f=[0,1,2].map(j=>offset+(index?index.getX(i+j):i+j));if(new T.Triangle(...f.map(k=>vertices[k]) as [T.Vector3,T.Vector3,T.Vector3]).getArea()>1e-10){faces.push(f);faceGroups.push(surfaceId);}}});
 return stereoDrawing(camera,vertices,faces,host,faceGroups);
}

// Same vertex order as the closed net, without constructing meshes, materials, normals or outlines.
export function closedDrawing(shape:Shape,a:number,h:number,poly:Poly,inverted:boolean,camera:T.Camera,host:HTMLElement){
 const vertices:T.Vector3[]=[],faces:number[][]=[],groups:number[]=[];
 const add=(points:T.Vector3[])=>{const offset=vertices.length;for(const p of points)vertices.push(p.set(Math.fround(p.x),Math.fround(p.y),Math.fround(p.z)));return offset;};
 const tri=(a:number,b:number,c:number,group:number)=>{const p=vertices[a],q=vertices[b],r=vertices[c],ux=q.x-p.x,uy=q.y-p.y,uz=q.z-p.z,vx=r.x-p.x,vy=r.y-p.y,vz=r.z-p.z;const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;if(x*x+y*y+z*z>4e-20){faces.push([a,b,c]);groups.push(group);}};
 if(round(shape)){
  for(let leaf=0;leaf<GORE_COUNT;leaf++){const offset=add(gorePoints(a,leaf,0));for(let row=0;row<GORE_ROWS;row++)for(let col=0;col<GORE_COLUMNS;col++){const i=offset+row*(GORE_COLUMNS+1)+col,j=i+GORE_COLUMNS+1;tri(i,j,i+1,leaf);tri(i+1,j,j+1,leaf);}}
 }else if(shape==='cylinder'||shape==='cone'){
  const segments=96,rows=12;add(curvedPoints(shape,a,h,0));for(let row=0;row<rows;row++)for(let col=0;col<segments;col++){const i=row*(segments+1)+col,j=i+segments+1;tri(i,j,i+1,0);tri(i+1,j,j+1,0);}
  let group=1;for(const top of shape==='cylinder'?[false,true]:[false]){const y=(top?1:-1)*h/2,points=[new T.Vector3(0,y,0)];for(let i=0;i<=segments;i++){const angle=i/segments*2*Math.PI;points.push(new T.Vector3(Math.fround(a*Math.cos(angle)),y,-Math.fround(a*Math.sin(angle))));}const offset=vertices.length;vertices.push(...points);for(let i=1;i<=segments;i++)tri(offset+i,offset+i+1,offset,group);group++;}
  if(shape==='cone'&&inverted){const rotation=new T.Matrix4().makeRotationZ(Math.PI);vertices.forEach(p=>p.applyMatrix4(rotation));}
 }else{
  poly.faces.forEach((face,group)=>{for(let i=1;i<face.length-1;i++){const offset=add([face[0],face[i],face[i+1]].map(j=>poly.vertices[j].clone()));tri(offset,offset+1,offset+2,group);}});
 }
 return stereoDrawing(camera,vertices,faces,host,groups);
}
