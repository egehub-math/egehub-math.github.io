import * as T from 'three';
export const GORE_COUNT=30;
export const GORE_ROWS=40;
export const GORE_COLUMNS=4;
// t=0: assembled sphere; t=1: flat radial gores, hinged at the south pole.
export function gorePoints(r:number,index:number,t:number){
 const opening=T.MathUtils.clamp(t,0,1),k=1-opening,center=index/GORE_COUNT*Math.PI*2,half=Math.PI/GORE_COUNT,points:T.Vector3[]=[];
 for(let row=0;row<=GORE_ROWS;row++){
  const alpha=row/GORE_ROWS*Math.PI,sine=Math.sin(alpha);
  const radial=k<1e-5?r*alpha:r/k*Math.sin(k*alpha);
  const y=k<1e-5?-r:-r+r/k*(1-Math.cos(k*alpha));
  for(let column=0;column<=GORE_COLUMNS;column++){
   const delta=(column/GORE_COLUMNS*2-1)*half;
   const along=radial+r*sine*(Math.cos(delta)-1)*(1-opening);
   const across=r*sine*((1-opening)*Math.sin(delta)+opening*delta);
   points.push(new T.Vector3(along*Math.cos(center)-across*Math.sin(center),y,along*Math.sin(center)+across*Math.cos(center)));
  }
 }return points;
}
export function globeUnfold(r:number,dark=false){
 const group=new T.Group(),indices:number[]=[];
 for(let row=0;row<GORE_ROWS;row++)for(let column=0;column<GORE_COLUMNS;column++){const a=row*(GORE_COLUMNS+1)+column,b=a+GORE_COLUMNS+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const parts=Array.from({length:GORE_COUNT},(_,i)=>{
  const geometry=new T.BufferGeometry();geometry.setIndex(indices);geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array((GORE_ROWS+1)*(GORE_COLUMNS+1)*3),3));
  const material=new T.MeshStandardMaterial({color:(dark?[0x7767b5,0xa66a80,0xb87860]:[0xc7bfff,0xf0c9cd,0xffd5c8])[i%3],side:T.DoubleSide,roughness:.8});group.add(new T.Mesh(geometry,material));
  const outlineGeometry=new T.BufferGeometry(),outline=new T.LineLoop(outlineGeometry,new T.LineBasicMaterial({color:dark?0xd4bde7:0x7760a0,transparent:true,opacity:.8}));group.add(outline);
  const parallels=Array.from({length:3},()=>{const geo=new T.BufferGeometry();group.add(new T.Line(geo,new T.LineBasicMaterial({color:dark?0xd0b8e7:0xa78fba,transparent:true,opacity:.45})));return geo;});
  return {geometry,outlineGeometry,parallels};
 });
 return {group,update(t:number){parts.forEach((part,i)=>{
  const points=gorePoints(r,i,t),attr=part.geometry.getAttribute('position') as T.BufferAttribute;points.forEach((p,j)=>attr.setXYZ(j,p.x,p.y,p.z));attr.needsUpdate=true;part.geometry.computeVertexNormals();part.geometry.computeBoundingSphere();
  const outline=[...Array.from({length:GORE_ROWS+1},(_,j)=>points[j*(GORE_COLUMNS+1)]),...Array.from({length:GORE_ROWS+1},(_,j)=>points[(GORE_ROWS-j)*(GORE_COLUMNS+1)+GORE_COLUMNS])];part.outlineGeometry.setFromPoints(outline);
  part.parallels.forEach((geo,j)=>{const row=Math.round((j+1)/4*GORE_ROWS);geo.setFromPoints(points.slice(row*(GORE_COLUMNS+1),(row+1)*(GORE_COLUMNS+1)));});
 });}};
}
