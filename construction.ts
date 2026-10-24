import * as THREE from 'three';
export function auxiliaryConstruction(vertices:THREE.Vector3[],faces:number[][],plane:THREE.Plane){
 const scale=Math.max(...vertices.map(p=>p.length()),1), limit=scale*5;
 const traces:{from:THREE.Vector3,to:THREE.Vector3}[]=[],extensions:{from:THREE.Vector3,to:THREE.Vector3}[]=[],points:THREE.Vector3[]=[];
 let distant=0;
 for(const face of faces){
  const faceNormal=new THREE.Vector3().crossVectors(vertices[face[1]].clone().sub(vertices[face[0]]),vertices[face[2]].clone().sub(vertices[face[0]])).normalize();
  const direction=new THREE.Vector3().crossVectors(plane.normal,faceNormal).normalize();
  if(direction.lengthSq()<1e-12)continue;
  const hits:THREE.Vector3[]=[],facePoints:THREE.Vector3[]=[],faceExtensions:{from:THREE.Vector3,to:THREE.Vector3}[]=[];let crossesFace=false;
  const add=(p:THREE.Vector3)=>{if(!hits.some(q=>q.distanceTo(p)<1e-6))hits.push(p);};
  for(let i=0;i<face.length;i++){
   const a=vertices[face[i]],b=vertices[face[(i+1)%face.length]],da=plane.distanceToPoint(a),db=plane.distanceToPoint(b);
   if(Math.abs(da)<1e-7){add(a.clone());crossesFace=true;}
   if(da*db<0)crossesFace=true;
   if(Math.abs(da-db)<1e-8)continue;
   const t=da/(da-db),p=a.clone().lerp(b,t);
   if(p.length()>limit){distant++;continue;}
   add(p);
   if(t < -1e-7 || t > 1+1e-7){
    facePoints.push(p);
    const end=t<0?a:b;
    faceExtensions.push({from:end.clone(),to:p});
   }
  }
  if(hits.length>=2&&crossesFace){for(const p of facePoints)if(!points.some(q=>q.distanceTo(p)<1e-6))points.push(p);for(const e of faceExtensions)if(!extensions.some(q=>q.from.distanceTo(e.from)<1e-6&&q.to.distanceTo(e.to)<1e-6))extensions.push(e);hits.sort((a,b)=>a.dot(direction)-b.dot(direction));traces.push({from:hits[0].clone().addScaledVector(direction,-scale*.15),to:hits[hits.length-1].clone().addScaledVector(direction,scale*.15)});}
 }
 return {traces,extensions,points,distant};
}

