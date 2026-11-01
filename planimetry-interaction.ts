import {buildPlane,dist,type Mode,type Params,type P} from './planimetry-model.ts';
export type Pose={x:number,y:number,angle:number};
export const originPose:Pose={x:0,y:0,angle:0};
export const place=(p:P,pose:Pose):P=>({x:pose.x+p.x*Math.cos(pose.angle)-p.y*Math.sin(pose.angle),y:pose.y+p.x*Math.sin(pose.angle)+p.y*Math.cos(pose.angle),name:p.name});
export const unplace=(p:P,pose:Pose):P=>({x:(p.x-pose.x)*Math.cos(pose.angle)+(p.y-pose.y)*Math.sin(pose.angle),y:-(p.x-pose.x)*Math.sin(pose.angle)+(p.y-pose.y)*Math.cos(pose.angle)});
function solve(matrix:number[][],rhs:number[]){
 const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]);
 for(let col=0;col<n;col++){
  let pivot=col;for(let i=col+1;i<n;i++)if(Math.abs(a[i][col])>Math.abs(a[pivot][col]))pivot=i;
  [a[col],a[pivot]]=[a[pivot],a[col]];const d=a[col][col];if(Math.abs(d)<1e-14)return rhs.map(()=>0);
  for(let j=col;j<=n;j++)a[col][j]/=d;
  for(let i=0;i<n;i++)if(i!==col){const m=a[i][col];for(let j=col;j<=n;j++)a[i][j]-=m*a[col][j];}
 }
 return a.map(row=>row[n]);
}
/** Inverse constrained construction: move any named point while retaining the shape's invariants. */
export function movePlanePoint(mode:Mode,params:Params,pose:Pose,name:string,target:P,options:{iterations?:number,fixed?:P[]}={}){
 if(!Number.isFinite(target.x)||!Number.isFinite(target.y))return {params,pose};
 const original=buildPlane(mode,params,true),index=original.points.findIndex(p=>p.name===name);if(index<0)return {params,pose};
 const controls=original.controls,n=controls.length,values=[...controls.map(c=>params[c.key]),pose.x,pose.y,pose.angle],start=[...values];
 const primaryCount=['parallel','trapezoid','cyclic','incquad'].includes(mode)?4:3;
 const fixed=options.fixed||original.points.slice(0,primaryCount).map(p=>place(p,pose));
 const decode=(v:number[])=>({params:{...params,...Object.fromEntries(controls.map((c,i)=>[c.key,v[i]]))},pose:{x:v[n],y:v[n+1],angle:v[n+2]}});
 const residual=(v:number[])=>{const state=decode(v),m=buildPlane(mode,state.params,true),p=place(m.points[index],state.pose),r=[(p.x-target.x)*5,(p.y-target.y)*5];
  for(let i=0;i<primaryCount;i++){if(i===index)continue;const q=place(m.points[i],state.pose);r.push((q.x-fixed[i].x)*.18,(q.y-fixed[i].y)*.18);}
  for(let i=0;i<v.length;i++)r.push((v[i]-start[i])*(i<n?.015/Math.max(controls[i].max-controls[i].min,1):i===n+2?.03:.006));
  return r;
 };
 for(let iteration=0;iteration<(options.iterations??6);iteration++){
  const r=residual(values),jac=values.map((v,i)=>{const h=i<n?Math.max((controls[i].max-controls[i].min)*1e-5,1e-5):1e-5,trial=[...values];trial[i]=v+h;const next=residual(trial);return next.map((x,j)=>(x-r[j])/h);});
  const matrix=values.map((_,i)=>values.map((_,j)=>jac[i].reduce((sum,x,k)=>sum+x*jac[j][k],i===j?.002:0))),rhs=jac.map(col=>-col.reduce((sum,x,k)=>sum+x*r[k],0)),delta=solve(matrix,rhs);
  let accepted=false;const cost=r.reduce((s,v)=>s+v*v,0);
  for(const amount of [1,.5,.2,.05]){const next=values.map((v,i)=>{const step=delta[i]*amount;return i<n?Math.max(controls[i].min,Math.min(controls[i].max,v+step)):v+Math.max(i===n+2?-.4:-4,Math.min(i===n+2?.4:4,step));}),nr=residual(next);if(nr.reduce((s,v)=>s+v*v,0)<cost){values.splice(0,values.length,...next);accepted=true;break;}}
  if(!accepted||Math.hypot(r[0],r[1])<1e-5)break;
 }
 const state=decode(values),hit=place(buildPlane(mode,state.params,true).points[index],state.pose);
 // At parameter bounds, translating the construction keeps the selected point under the cursor.
 state.pose.x+=target.x-hit.x;state.pose.y+=target.y-hit.y;
 return state;
}
export function factsOnDrawing(mode:Mode,params:Params,layers:string[],measure:boolean){return buildPlane(mode,params).facts.filter(f=>(f.requires||[]).every(key=>key==='measure'?measure:layers.includes(key)));}
export function zoomPlaneView(view:{zoom:number,pan:P},cursor:P,delta:number){
 const zoom=Math.max(.25,Math.min(6,view.zoom*Math.exp(-delta*.001))),ratio=zoom/view.zoom;
 return {zoom,pan:{x:cursor.x-500-(cursor.x-500-view.pan.x)*ratio,y:cursor.y-340-(cursor.y-340-view.pan.y)*ratio}};
}
