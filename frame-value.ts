export function createFramePublisher(callback:(value:number)=>void,schedule:(run:()=>void)=>number,cancel:(id:number)=>void){
 let next:number|null=null,frame:number|null=null;
 const discard=()=>{if(frame!==null)cancel(frame);frame=null;next=null;};
 const flush=()=>{if(frame!==null)cancel(frame);frame=null;if(next!==null){const value=next;next=null;callback(value);}};
 return {get pending(){return next!==null;},publish(value:number){next=value;if(frame===null)frame=schedule(()=>{frame=null;flush();});},flush,discard,immediate(value:number){discard();callback(value);}};
}
