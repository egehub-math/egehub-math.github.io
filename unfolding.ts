import * as T from 'three';
export type Poly = {vertices:T.Vector3[],faces:number[][]};
export function faceGeometry(points:T.Vector3[]){const a:number[]=[];for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]])a.push(...p.toArray());const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.computeVertexNormals();return g;}
export function hingedTransforms(poly:Poly,t:number){
 const {vertices,faces}=poly,center=vertices.reduce((a,p)=>a.add(p),new T.Vector3()).divideScalar(vertices.length);
 const normals=faces.map(f=>{const n=new T.Vector3().crossVectors(vertices[f[1]].clone().sub(vertices[f[0]]),vertices[f[2]].clone().sub(vertices[f[0]])).normalize();const c=f.reduce((a,i)=>a.add(vertices[i]),new T.Vector3()).divideScalar(f.length);return n.dot(c.sub(center))<0?n.negate():n;});
 const matrices=faces.map(()=>new T.Matrix4()),visited=new Set([0]),queue=[0];
 while(queue.length){const parent=queue.shift()!;for(let child=0;child<faces.length;child++){if(visited.has(child))continue;const shared=faces[parent].filter(i=>faces[child].includes(i));if(shared.length!==2)continue;
  const pivot=vertices[shared[0]],axis=vertices[shared[1]].clone().sub(pivot).normalize();const angle=Math.atan2(axis.dot(new T.Vector3().crossVectors(normals[child],normals[parent])),normals[child].dot(normals[parent]));
  const rotation=new T.Matrix4().makeTranslation(...pivot.toArray()).multiply(new T.Matrix4().makeRotationAxis(axis,angle*t)).multiply(new T.Matrix4().makeTranslation(...pivot.clone().negate().toArray()));
  matrices[child].copy(matrices[parent]).multiply(rotation);visited.add(child);queue.push(child);
 }}return matrices;
}
function face(points:T.Vector3[],i:number,dark=false){const group=new T.Group();group.add(new T.Mesh(faceGeometry(points),new T.MeshStandardMaterial({color:dark?(i%2?0x975c70:0x7767b5):(i%2?0xf0cdd2:0xd4ccff),side:T.DoubleSide,roughness:.8})));group.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:dark?0xc9b9ed:0x7060ba})));return group;}
export function polyUnfold(poly:Poly,dark=false){const group=new T.Group(),parts=poly.faces.map((f,i)=>{const p=face(f.map(j=>poly.vertices[j]),i,dark);p.matrixAutoUpdate=false;group.add(p);return p;});return {group,update(t:number){const matrices=hingedTransforms(poly,t);parts.forEach((p,i)=>p.matrix.copy(matrices[i]));}};}
export function curvedPoints(kind:'cylinder'|'cone',r:number,h:number,t:number){
 const points:T.Vector3[]=[];const segments=96,rows=12,l=Math.hypot(r,h),beta0=Math.atan2(r,h),beta=beta0+(Math.PI/2-beta0)*t;
 for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){
  const theta=(i/segments*2-1)*Math.PI;
  if(kind==='cylinder'){const k=1-t;const x=k<1e-6?r*theta:r/k*Math.sin(k*theta),z=k<1e-6?r:r+r/k*(Math.cos(k*theta)-1);points.push(new T.Vector3(x,h*(j/rows-.5),z));}
  else{const s=l*j/rows,alpha=theta*Math.sin(beta0)/Math.sin(beta);points.push(new T.Vector3(s*Math.sin(beta)*Math.sin(alpha),h/2-s*Math.cos(beta),s*Math.sin(beta)*Math.cos(alpha)));}
 }return points;
}
export function curvedUnfold(kind:'cylinder'|'cone',r:number,h:number,dark=false){
 const group=new T.Group(),segments=96,rows=12,indices:number[]=[];for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const geo=new T.BufferGeometry();geo.setIndex(indices);geo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array((segments+1)*(rows+1)*3),3));
 group.add(new T.Mesh(geo,new T.MeshStandardMaterial({color:dark?0x7767b5:0xd4ccff,side:T.DoubleSide,roughness:.8})));
 const outlineGeo=new T.BufferGeometry();const outline=new T.LineLoop(outlineGeo,new T.LineBasicMaterial({color:dark?0xc9b9ed:0x7060ba}));group.add(outline);
 const caps:Array<{mesh:T.Mesh,line:T.LineLoop,top:boolean}>=[];
 for(const top of kind==='cylinder'?[false,true]:[false]){const cap=new T.Mesh(new T.CircleGeometry(r,96),new T.MeshStandardMaterial({color:dark?0x975c70:0xf0cdd2,side:T.DoubleSide,roughness:.8}));const circle=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:96},(_,i)=>new T.Vector3(r*Math.cos(i/96*Math.PI*2),r*Math.sin(i/96*Math.PI*2),0))),new T.LineBasicMaterial({color:dark?0xc9b9ed:0x7060ba}));cap.add(circle);group.add(cap);caps.push({mesh:cap,line:circle,top});}
 return {group,update(t:number){const points=curvedPoints(kind,r,h,t),attr=geo.getAttribute('position') as T.BufferAttribute;points.forEach((p,i)=>attr.setXYZ(i,p.x,p.y,p.z));attr.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();const boundary=[...points.slice(0,segments+1),...Array.from({length:rows},(_,j)=>points[(j+1)*(segments+1)+segments]),...points.slice(rows*(segments+1), (rows+1)*(segments+1)).reverse(),...Array.from({length:rows},(_,j)=>points[(rows-j-1)*(segments+1)])];outlineGeo.setFromPoints(boundary);
 for(const cap of caps){if(kind==='cylinder'){const angle=(cap.top?1:-1)*Math.PI/2*t;cap.mesh.rotation.x=-Math.PI/2+angle;cap.mesh.position.set(0,(cap.top?1:-1)*h/2+r*Math.sin(angle),r-r*Math.cos(angle));}else{const l=Math.hypot(r,h),beta=Math.atan2(r,h)+(Math.PI/2-Math.atan2(r,h))*t,angle=Math.PI*t;cap.mesh.rotation.x=-Math.PI/2+angle;cap.mesh.position.set(0,h/2-l*Math.cos(beta)+r*Math.sin(angle),l*Math.sin(beta)-r*Math.cos(angle));}}
 }};
}
