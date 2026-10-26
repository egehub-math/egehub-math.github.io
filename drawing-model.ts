export type Anchor={point:number[],indices?:number[],weights?:number[],planeIndices?:number[],face?:number,surface?:number};
export type ScreenPoint={x:number,y:number};
export type DrawingNavigation={start:(p:ScreenPoint)=>void,move:(p:ScreenPoint)=>void,end:()=>void,zoom?:(p:ScreenPoint,delta:number)=>void};
export type DrawingAdapter={pick:(x:number,y:number,plane?:Anchor,snap?:boolean)=>Anchor|null,project:(anchor:Anchor)=>ScreenPoint|null,requiresPlane?:boolean,revision?:()=>number|string,surfaceKey?:(anchor:Anchor)=>string,outline?:(anchor:Anchor)=>ScreenPoint[],navigation?:DrawingNavigation};
export type DrawingItem={id:number,kind:'pen'|'marker'|'line'|'arrow',anchors:Anchor[],color:string,width:number,cuts?:Anchor[][]};
export function anchoredCoordinates(anchor:Anchor,vertices:number[][]){
 if(!anchor.indices||!anchor.weights)return anchor.point;
 if(anchor.indices.some(i=>!vertices[i]))return null;
 return [0,1,2].map(axis=>anchor.indices!.reduce((sum,index,j)=>sum+vertices[index][axis]*anchor.weights![j],0));
}
export function distanceToStroke(p:ScreenPoint,points:ScreenPoint[]){
 let best=Infinity;
 for(let i=0;i<points.length;i++){
  const a=points[Math.max(0,i-1)],b=points[i],dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  best=Math.min(best,Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy));
 }
 return best;
}

export function midpointAnchor(a:Anchor,b:Anchor):Anchor{
 const point=a.point.map((v,i)=>(v+b.point[i])/2);
 if(!a.indices||!a.weights||!b.indices||!b.weights)return {point};
 const weights=new Map<number,number>();
 for(const anchor of [a,b])anchor.indices!.forEach((id,i)=>weights.set(id,(weights.get(id)||0)+anchor.weights![i]/2));
 return {point,indices:[...weights.keys()],weights:[...weights.values()],planeIndices:a.planeIndices,face:a.face,surface:a.surface};
}

export function sweepHitsStroke(from:ScreenPoint,to:ScreenPoint,points:ScreenPoint[],radius:number){
 if(distanceToStroke(from,points)<=radius||distanceToStroke(to,points)<=radius)return true;
 for(let i=0;i<points.length;i++){
  const a=points[Math.max(0,i-1)],b=points[i];
  if(distanceToStroke(a,[from,to])<=radius||distanceToStroke(b,[from,to])<=radius)return true;
  const rx=to.x-from.x,ry=to.y-from.y,sx=b.x-a.x,sy=b.y-a.y,den=rx*sy-ry*sx;
  if(Math.abs(den)<1e-10)continue;
  const ax=a.x-from.x,ay=a.y-from.y,t=(ax*sy-ay*sx)/den,u=(ax*ry-ay*rx)/den;
  if(t>=0&&t<=1&&u>=0&&u<=1)return true;
 }
 return false;
}
export const drawingEndpoint=(net:boolean,fold:number,playing:boolean)=>!net||(!playing&&(fold===0||fold===1));

export function drawingIntent(button:number,shift:boolean,tool:string){
 if(button!==0&&button!==2)return 'ignore';
 return button===2||shift||tool==='move'?'navigate':'draw';
}
export function historyShortcut(key:string,ctrl:boolean,meta:boolean,shift:boolean,alt:boolean,code=''):'undo'|'redo'|null{
 if(!(ctrl||meta)||alt)return null;
 const action=code?(code==='KeyZ'?'undo':code==='KeyY'?'redo':null):['z','я'].includes(key.toLowerCase())?'undo':['y','н'].includes(key.toLowerCase())?'redo':null;
 return action==='undo'&&shift?'redo':action;
}
export function shouldSelectSurface(adapter:DrawingAdapter,current:Anchor|null,hit:Anchor|null){
 return !!adapter.requiresPlane&&(!current||!!hit&&adapter.surfaceKey?.(hit)!==adapter.surfaceKey?.(current));
}

export function eraserCapsule(from:ScreenPoint,to:ScreenPoint,radius:number){
 const angle=Math.atan2(to.y-from.y,to.x-from.x),points:ScreenPoint[]=[];
 for(let i=0;i<=20;i++){const a=angle-Math.PI/2+i*Math.PI/20;points.push({x:to.x+radius*Math.cos(a),y:to.y+radius*Math.sin(a)});}
 for(let i=0;i<=20;i++){const a=angle+Math.PI/2+i*Math.PI/20;points.push({x:from.x+radius*Math.cos(a),y:from.y+radius*Math.sin(a)});}
 return points;
}

export function createEraserCut(api:DrawingAdapter,reference:Anchor,from:ScreenPoint,to:ScreenPoint,radius:number){
 const anchors=eraserCapsule(from,to,radius).map(p=>api.pick(p.x,p.y,reference,false));
 return anchors.some(a=>!a)?null:anchors as Anchor[];
}

export function interpolateAnchor(a:Anchor,b:Anchor,t:number):Anchor{
 if(t<=1e-10)return a;if(t>=1-1e-10)return b;
 const point=a.point.map((x,i)=>x+(b.point[i]-x)*t);
 if(!a.indices||!a.weights||!b.indices||!b.weights)return {point};
 const weights=new Map<number,number>();
 for(const [anchor,factor] of [[a,1-t],[b,t]] as [Anchor,number][])anchor.indices!.forEach((id,i)=>weights.set(id,(weights.get(id)||0)+anchor.weights![i]*factor));
 return {point,indices:[...weights.keys()],weights:[...weights.values()],planeIndices:a.planeIndices,face:a.face,surface:a.surface};
}
// A gap is certified only when a complete brush-width disk fits inside an erased patch.
function erasedInterval(a:ScreenPoint,b:ScreenPoint,polygon:ScreenPoint[],radius:number):[number,number]|null{
 if(polygon.length<3)return null;
 let area=0;polygon.forEach((p,i)=>{const q=polygon[(i+1)%polygon.length];area+=p.x*q.y-q.x*p.y;});if(Math.abs(area)<1e-10)return null;
 const sign=area>0?1:-1;let lo=0,hi=1;
 for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);if(length<1e-10)continue;
  const start=sign*(dx*(a.y-p.y)-dy*(a.x-p.x))/length-radius,slope=sign*(dx*(b.y-a.y)-dy*(b.x-a.x))/length;
  if(Math.abs(slope)<1e-10){if(start<0)return null;continue;}
  const boundary=-start/slope;if(slope>0)lo=Math.max(lo,boundary);else hi=Math.min(hi,boundary);
  if(hi-lo<1e-8)return null;
 }
 return hi-lo>1e-8?[Math.max(0,lo),Math.min(1,hi)]:null;
}
export function splitErasedItem(item:DrawingItem,api:DrawingAdapter,nextId:()=>number):DrawingItem[]{
 if(!item.cuts?.length||item.anchors.length<2)return [item];
 const polygons=item.cuts.map(cut=>cut.map(a=>api.project(a))).filter((p):p is ScreenPoint[]=>p.every(q=>!!q));
 const radius=item.width*(item.kind==='marker'?2.5:.5),fragments:Anchor[][]=[];let current:Anchor[]=[],changed=false;
 const flush=()=>{if(current.length)fragments.push(current);current=[];};
 for(let i=1;i<item.anchors.length;i++){
  const a=item.anchors[i-1],b=item.anchors[i],p=api.project(a),q=api.project(b);if(!p||!q){if(!current.length)current.push(a);current.push(b);continue;}
  const ranges=polygons.map(poly=>erasedInterval(p,q,poly,radius)).filter((r):r is [number,number]=>!!r).sort((a,b)=>a[0]-b[0]);
  if(!ranges.length){if(!current.length)current.push(a);current.push(b);continue;}
  changed=true;const merged:[number,number][]=[];for(const r of ranges){const last=merged[merged.length-1];if(last&&r[0]<=last[1]+1e-8)last[1]=Math.max(last[1],r[1]);else merged.push([...r]);}
  const at=(t:number)=>{
   if(t<=1e-9)return a;if(t>=1-1e-9)return b;
   // Perspective projection is nonlinear in world coordinates: solve for the screen-space boundary.
   const dx=q.x-p.x,dy=q.y-p.y,den=dx*dx+dy*dy;if(den<1e-12)return interpolateAnchor(a,b,t);
   let lo=0,hi=1;for(let j=0;j<30;j++){const mid=(lo+hi)/2,projected=api.project(interpolateAnchor(a,b,mid));if(!projected)return interpolateAnchor(a,b,t);const u=((projected.x-p.x)*dx+(projected.y-p.y)*dy)/den;if(u<t)lo=mid;else hi=mid;}
   return interpolateAnchor(a,b,(lo+hi)/2);
  };
  let cursor=0;for(const [lo,hi] of merged){if(lo>cursor+1e-8){if(!current.length)current.push(at(cursor));current.push(at(lo));}flush();cursor=hi;}
  if(cursor<1-1e-8)current=[at(cursor),b];
 }
 flush();if(!changed)return [item];
 return fragments.map((anchors,i)=>({...item,id:i===0?item.id:nextId(),anchors,kind:item.kind==='arrow'&&anchors[anchors.length-1]!==item.anchors[item.anchors.length-1]?'line':item.kind}));
}

// Geometry for annotations is expensive (especially globe gores); build it only on first use.
export function lazyDrawingAdapter(factory:()=>DrawingAdapter,navigation?:DrawingAdapter['navigation'],revision?:()=>number|string):DrawingAdapter{
 let instance:DrawingAdapter|null=null;
 const get=()=>instance||(instance=factory());
 return {requiresPlane:true,navigation,revision,pick:(...args)=>get().pick(...args),project:anchor=>get().project(anchor),surfaceKey:anchor=>get().surfaceKey?.(anchor)||'',outline:anchor=>get().outline?.(anchor)||[]};
}
