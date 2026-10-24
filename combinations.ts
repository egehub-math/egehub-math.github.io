import * as T from 'three';
import {metrics,type Shape} from './models.ts';
export type Combination='none'|'coneCylinder'|'cylinderBox'|'ballCylinder'|'coneBall'|'compareCylinders';
export const combinations:Record<Combination,string>={none:'Одна фигура',coneCylinder:'Конус в цилиндре',cylinderBox:'Цилиндр в параллелепипеде',ballCylinder:'Шар в цилиндре',coneBall:'Конус в шаре',compareCylinders:'Два цилиндра'};
export function combinationParts(kind:Combination,r:number,h:number,ratioR:number,ratioH:number,coneH:number){
 type Part={shape:Shape,a:number,b:number,h:number,position:[number,number,number],name:string,color:number};const parts:Part[]=[];
 const add=(shape:Shape,a:number,b:number,h:number,name:string,color:number,position:[number,number,number]=[0,0,0])=>parts.push({shape,a,b,h,position,name,color});
 if(kind==='coneCylinder'){add('cylinder',r,0,h,'Цилиндр',0x7968ff);add('cone',r,0,h,'Конус',0xff673b);}
 if(kind==='cylinderBox'){add('box',2*r,2*r,h,'Параллелепипед',0x7968ff);add('cylinder',r,0,h,'Цилиндр',0xff673b);}
 if(kind==='ballCylinder'){add('cylinder',r,0,2*r,'Цилиндр',0x7968ff);add('ball',r,0,2*r,'Шар',0xff673b);}
 if(kind==='coneBall'){const height=r*coneH,base=Math.sqrt(Math.max(0,r*r-(r-height)**2));add('ball',r,0,2*r,'Шар',0x7968ff);add('cone',base,0,height,'Конус',0xff673b,[0,r-height/2,0]);}
 if(kind==='compareCylinders'){const gap=r*(1+ratioR)+r*.6;add('cylinder',r,0,h,'Первый цилиндр',0x7968ff,[-gap/2,0,0]);add('cylinder',r*ratioR,0,h*ratioH,'Второй цилиндр',0xff673b,[gap/2,(h*ratioH-h)/2,0]);}
 return parts.map(p=>({...p,...metrics(p.shape,p.a,p.b,p.h)}));
}
export function combinationGroup(parts:ReturnType<typeof combinationParts>,visible:boolean[],dark=false){const group=new T.Group();parts.forEach((p,i)=>{if(!visible[i])return;let geo:T.BufferGeometry;
 if(p.shape==='box')geo=new T.BoxGeometry(p.a,p.h,p.b);else if(p.shape==='ball')geo=new T.SphereGeometry(p.a,64,32);else geo=new T.CylinderGeometry(p.shape==='cone'?0:p.a,p.a,p.h,96);
 const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:dark?(i===0?0xb6a5ff:0xffa27a):p.color,transparent:true,opacity:i===0?(dark?.23:.13):(dark?.48:.4),side:T.DoubleSide,depthWrite:false,roughness:.7}));mesh.position.set(...p.position);group.add(mesh);
 if(p.shape==='box'){const lines=new T.LineSegments(new T.EdgesGeometry(geo),new T.LineBasicMaterial({color:dark?(i===0?0xb6a5ff:0xffa27a):p.color}));lines.position.copy(mesh.position);group.add(lines);}else{
 const ring=(y:number,r:number)=>{const points=Array.from({length:96},(_,i)=>new T.Vector3(r*Math.cos(i/96*Math.PI*2),y,r*Math.sin(i/96*Math.PI*2)));const l=new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:dark?(i===0?0xb6a5ff:0xffa27a):p.color}));l.position.copy(mesh.position);group.add(l);};
 if(p.shape==='ball'){ring(0,p.a);for(const rotation of [0,Math.PI/2]){const points=Array.from({length:96},(_,i)=>new T.Vector3(p.a*Math.cos(i/96*Math.PI*2),p.a*Math.sin(i/96*Math.PI*2),0));const l=new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:dark?(i===0?0xb6a5ff:0xffa27a):p.color,transparent:true,opacity:.5}));l.rotation.y=rotation;l.position.copy(mesh.position);group.add(l);}}
 else{ring(-p.h/2,p.a);if(p.shape==='cylinder')ring(p.h/2,p.a);for(const sign of [-1,1]){const l=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(sign*p.a,-p.h/2,0),new T.Vector3(p.shape==='cone'?0:sign*p.a,p.h/2,0)]),new T.LineBasicMaterial({color:dark?(i===0?0xb6a5ff:0xffa27a):p.color}));l.position.copy(mesh.position);group.add(l);}}
 }});return group;}

