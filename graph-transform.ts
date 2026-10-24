export type CursorPoint={x:number,y:number,snapped:boolean,kind:'grid'|'intersection'|null};
export function snapGraphPoint(x:number,y:number,scale:number,extra:{x:number,y:number}[]=[],radius=6):CursorPoint{
 const plain:CursorPoint={x,y,snapped:false,kind:null};if(!Number.isFinite(x+y)||scale<=0)return plain;
 const candidates=[{x:Math.round(x),y:Math.round(y),kind:'grid' as const},...extra.filter(p=>Number.isFinite(p.x+p.y)).map(p=>({...p,kind:'intersection' as const}))];
 let best=Math.min(radius,scale*.16),result=plain;
 for(const point of candidates){const distance=Math.hypot((point.x-x)*scale,(point.y-y)*scale);if(distance<best){best=distance;result={...point,snapped:true};}}return result;
}

