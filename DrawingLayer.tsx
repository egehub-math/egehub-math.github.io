import {memo,useEffect,useRef,useState,type RefObject,type PointerEvent as ReactPointerEvent} from 'react';
import {sweepHitsStroke,createEraserCut,splitErasedItem,midpointAnchor,drawingIntent,historyShortcut,shouldSelectSurface,type Anchor,type DrawingAdapter,type DrawingItem,type ScreenPoint} from './drawing-model';
type Tool='move'|'pen'|'marker'|'line'|'arrow'|'erase';
type Board={items:DrawingItem[],redo:DrawingItem[][],undo:DrawingItem[][]};
type Gesture={id:number,kind:'draw'|'erase'|'navigate',before:DrawingItem[],};
const blank=():Board=>({items:[],redo:[],undo:[]});
export const DrawingLayer=memo(function DrawingLayer({enabled,active=true,adapter,scope,available=true,planeVersion='',unavailableMessage='В сочетаниях рисование недоступно. Развёртку останови на 0% или 100%.'}:{enabled:boolean,active?:boolean,adapter:RefObject<DrawingAdapter|null>,scope:string,available?:boolean,planeVersion?:string,unavailableMessage?:string}){
 const [tool,setTool]=useState<Tool>('move'),[color,setColor]=useState('#ff7043'),[width,setWidth]=useState(3),[eraserMode,setEraserMode]=useState<'object'|'pixels'>('object'),[eraserRadius,setEraserRadius]=useState(14),[message,setMessage]=useState(''),[boards,setBoards]=useState<Record<string,Board>>({}),[shiftHeld,setShiftHeld]=useState(false),[navigationActive,setNavigationActive]=useState(false),[planePicked,setPlanePicked]=useState(false);
 const board=boards[scope]||blank(),boardRef=useRef(board),canvas=useRef<HTMLCanvasElement>(null),draft=useRef<DrawingItem|null>(null),gesture=useRef<Gesture|null>(null),preview=useRef<DrawingItem[]|null>(null),selectedPlane=useRef<Anchor|null>(null),nextId=useRef(1),eraserCursor=useRef<ScreenPoint|null>(null),last=useRef<ScreenPoint|null>(null);
 boardRef.current=board;
 const settings=useRef({enabled,active,available,color,width,tool,eraserMode,eraserRadius,shiftHeld,navigationActive});settings.current={enabled,active,available,color,width,tool,eraserMode,eraserRadius,shiftHeld,navigationActive};
 const change=(items:DrawingItem[])=>setBoards(old=>{const b=old[scope]||blank();return {...old,[scope]:{...b,items,undo:[...b.undo.slice(-49),b.items],redo:[]}};});
 const undo=()=>setBoards(old=>{const b=old[scope]||blank();if(!b.undo.length)return old;return {...old,[scope]:{...b,items:b.undo[b.undo.length-1],undo:b.undo.slice(0,-1),redo:[...b.redo,b.items]}};});
 const redo=()=>setBoards(old=>{const b=old[scope]||blank();if(!b.redo.length)return old;return {...old,[scope]:{...b,items:b.redo[b.redo.length-1],redo:b.redo.slice(0,-1),undo:[...b.undo,b.items]}};});
 const resetGesture=()=>{if(gesture.current?.kind==='navigate')adapter.current?.navigation?.end();gesture.current=null;draft.current=null;preview.current=null;last.current=null;setNavigationActive(false);};
 const actionRef=useRef({undo,redo,resetGesture});actionRef.current={undo,redo,resetGesture};
 useEffect(()=>{actionRef.current.resetGesture();selectedPlane.current=null;setPlanePicked(false);setMessage('');setShiftHeld(false);},[scope,enabled,active,available,planeVersion]);
 useEffect(()=>{
  if(!enabled||!active)return;
  const editable=(e:KeyboardEvent)=>e.composedPath().some(t=>t instanceof HTMLElement&&(t.isContentEditable||t.matches('input,textarea,select,math-field')));
  const down=(e:KeyboardEvent)=>{if(editable(e))return;
   if(e.key==='Shift'){setShiftHeld(true);if(gesture.current&&gesture.current.kind!=='navigate'&&last.current){draft.current=null;preview.current=null;gesture.current={...gesture.current,kind:'navigate'};adapter.current?.navigation?.start(last.current);setNavigationActive(true);}}
   const shortcut=historyShortcut(e.key,e.ctrlKey,e.metaKey,e.shiftKey,e.altKey,e.code);if(shortcut){e.preventDefault();actionRef.current.resetGesture();actionRef.current[shortcut]();}
  };
  const up=(e:KeyboardEvent)=>{if(e.key==='Shift')setShiftHeld(false);};
  const blur=()=>{setShiftHeld(false);actionRef.current.resetGesture();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[enabled,active,adapter]);
 useEffect(()=>{const el=canvas.current;if(!el||!enabled||!active)return;const wheel=(e:WheelEvent)=>{if(!adapter.current?.navigation?.zoom)return;e.preventDefault();const r=el.getBoundingClientRect();adapter.current.navigation.zoom({x:e.clientX-r.left,y:e.clientY-r.top},e.deltaY);};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[enabled,active,adapter]);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  if(!active||(!enabled&&!board.items.length)){el.getContext('2d')?.clearRect(0,0,el.width,el.height);return;}
  let frame=0;const scratch=document.createElement('canvas'),backing=document.createElement('canvas');let previousBase:unknown[]=[],previousCursor:unknown[]=[];
  const same=(a:unknown[],b:unknown[])=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  const draw=()=>{frame=requestAnimationFrame(draw);if(document.hidden)return;const el=canvas.current,api=adapter.current;if(!el)return;const main=el.getContext('2d');if(!main)return;
   const w=el.clientWidth,h=el.clientHeight;if(w<=0||h<=0)return;const dpr=Math.min(devicePixelRatio||1,2),pw=Math.round(w*dpr),ph=Math.round(h*dpr),options=settings.current;
   if(!options.available){const key=['unavailable',pw,ph];if(!same(previousBase,key)){if(el.width!==pw||el.height!==ph){el.width=pw;el.height=ph;}main.setTransform(dpr,0,0,dpr,0,0);main.clearRect(0,0,w,h);previousBase=key;}return;}
   const items=preview.current||boardRef.current.items,current=draft.current;
   const baseKey=[api,api?.revision?.(),w,h,dpr,items,current,current?.anchors.length,current?.anchors[current.anchors.length-1],selectedPlane.current,options.enabled,options.available,options.tool];
   const cursor=eraserCursor.current,cursorKey=options.tool==='erase'&&!options.shiftHeld&&!options.navigationActive?[cursor?.x,cursor?.y,options.eraserRadius]:[];
   const baseChanged=!same(previousBase,baseKey);if(!baseChanged&&same(previousCursor,cursorKey))return;previousCursor=cursorKey;
   if(el.width!==pw||el.height!==ph){el.width=pw;el.height=ph;}main.setTransform(dpr,0,0,dpr,0,0);
   if(baseChanged){previousBase=baseKey;if(backing.width!==pw||backing.height!==ph){backing.width=pw;backing.height=ph;}const ctx=backing.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    if(api&&options.available){
     if(options.enabled&&selectedPlane.current&&api.outline&&options.tool!=='move'){const outline=api.outline(selectedPlane.current);if(outline.length>2){ctx.save();ctx.fillStyle='#a68bfa20';ctx.strokeStyle='#a68bfa';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();outline.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}}
     for(const item of [...items,...(current?[current]:[])]){
      const masked=!!item.cuts?.length;if(masked){if(scratch.width!==pw||scratch.height!==ph){scratch.width=pw;scratch.height=ph;}const m=scratch.getContext('2d')!;m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,pw,ph);m.setTransform(dpr,0,0,dpr,0,0);}
      const target=masked?scratch.getContext('2d')!:ctx;paintStroke(target,item,api);
      if(masked){target.save();target.globalCompositeOperation='destination-out';target.globalAlpha=1;for(const cut of item.cuts!){const polygon=cut.map(a=>api.project(a));if(polygon.some(p=>!p))continue;target.beginPath();polygon.forEach((p,i)=>i?target.lineTo(p!.x,p!.y):target.moveTo(p!.x,p!.y));target.closePath();target.fill();}target.restore();ctx.drawImage(scratch,0,0,w,h);}
     }
    }
   }
   main.clearRect(0,0,w,h);main.drawImage(backing,0,0,w,h);
   if(options.enabled&&options.available&&options.tool==='erase'&&!options.shiftHeld&&!options.navigationActive&&cursor){main.save();main.fillStyle='#a68bfa18';main.strokeStyle='#a68bfa';main.lineWidth=1;main.beginPath();main.arc(cursor.x,cursor.y,options.eraserRadius,0,Math.PI*2);main.fill();main.stroke();main.restore();}
  };draw();return()=>cancelAnimationFrame(frame);
 },[active,enabled,!!board.items.length,adapter]);
 const paintStroke=(ctx:CanvasRenderingContext2D,item:DrawingItem,api:DrawingAdapter)=>{
    const points=item.anchors.map(a=>api.project(a));if(!points.length)return;ctx.save();ctx.strokeStyle=item.color;ctx.fillStyle=item.color;ctx.lineWidth=item.width;ctx.lineCap='round';ctx.lineJoin='round';
    if(item.kind==='marker'){ctx.globalAlpha=.3;ctx.lineWidth=item.width*5;}ctx.beginPath();let connected=false;for(const p of points){if(!p){connected=false;continue;}if(!connected){ctx.moveTo(p.x,p.y);connected=true;}else ctx.lineTo(p.x,p.y);}if(points.length===1&&points[0]){ctx.lineTo(points[0].x+.1,points[0].y);}ctx.stroke();
    if(item.kind==='arrow'&&points.length>1){const p=points[points.length-2],q=points[points.length-1];if(p&&q){const angle=Math.atan2(q.y-p.y,q.x-p.x),size=10+item.width;ctx.beginPath();ctx.moveTo(q.x-size*Math.cos(angle-.45),q.y-size*Math.sin(angle-.45));ctx.lineTo(q.x,q.y);ctx.lineTo(q.x-size*Math.cos(angle+.45),q.y-size*Math.sin(angle+.45));ctx.stroke();}}
    ctx.restore();
 };
 const local=(e:ReactPointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const itemPoints=(item:DrawingItem)=>item.anchors.map(a=>adapter.current?.project(a)).filter((p):p is ScreenPoint=>!!p);
 const eraseSweep=(from:ScreenPoint,to:ScreenPoint)=>{
  const api=adapter.current;if(!api)return;const items=preview.current||boardRef.current.items;
  if(eraserMode==='object'){preview.current=items.flatMap(item=>splitErasedItem(item,api,()=>nextId.current++)).filter(item=>!sweepHitsStroke(from,to,itemPoints(item),eraserRadius+item.width*(item.kind==='marker'?2.5:.5)));return;}

  preview.current=items.map(item=>{
   if(!sweepHitsStroke(from,to,itemPoints(item),eraserRadius+item.width*(item.kind==='marker'?2.5:.5)))return item;
   const anchors=createEraserCut(api,item.anchors[0],from,to,eraserRadius);
   if(!anchors)return item;
   return {...item,cuts:[...(item.cuts||[]),anchors]};
  });
 };
 const capture=(e:ReactPointerEvent<HTMLCanvasElement>,kind:Gesture['kind'],extra:Partial<Gesture>={})=>{gesture.current={id:e.pointerId,kind,before:boardRef.current.items,...extra};e.currentTarget.setPointerCapture(e.pointerId);last.current=local(e);};
 const start=(e:ReactPointerEvent<HTMLCanvasElement>)=>{
  const intent=drawingIntent(e.button,e.shiftKey,tool);if(!enabled||!active||intent==='ignore')return;const p=local(e),api=adapter.current;if(!api)return;
  if(intent==='navigate'){e.preventDefault();resetGesture();capture(e,'navigate');api.navigation?.start(p);setNavigationActive(true);return;}
  if(e.button!==0||!available||gesture.current)return;e.preventDefault();
  if(tool==='erase'){capture(e,'erase');preview.current=boardRef.current.items;eraseSweep(p,p);return;}
  const freehand=tool==='pen'||tool==='marker',raw=api.pick(p.x,p.y,undefined,false);
  if(api.requiresPlane){
   const current=selectedPlane.current;
   if(shouldSelectSurface(api,current,raw)){if(!raw){setMessage('Сначала выбери грань одним касанием.');return;}selectedPlane.current=raw;setPlanePicked(true);setMessage('Грань выбрана. Следующим касанием можно рисовать.');return;}
  }
  let anchor=freehand?api.pick(p.x,p.y,selectedPlane.current||undefined,false):api.pick(p.x,p.y,undefined,true)||api.pick(p.x,p.y,selectedPlane.current||undefined,true);
  // Only geometric tools snap to existing annotations; freehand never does.
  if(!freehand){let nearest=12;for(const item of boardRef.current.items){const candidates=[...item.anchors];if((item.kind==='line'||item.kind==='arrow')&&item.anchors.length===2)candidates.push(midpointAnchor(item.anchors[0],item.anchors[1]));for(const candidate of candidates){const q=api.project(candidate);if(!q)continue;const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<nearest){nearest=d;anchor=candidate;}}}}
  if(!anchor){setMessage('Нажми на фигуру или выбранную плоскость.');return;}setMessage('');
  capture(e,'draw');draft.current={id:nextId.current++,kind:tool as DrawingItem['kind'],anchors:[anchor],color,width};
 };
 const move=(e:ReactPointerEvent<HTMLCanvasElement>)=>{
  const p=local(e);eraserCursor.current=p;const g=gesture.current;if(!g||g.id!==e.pointerId)return;const api=adapter.current;if(!api)return;
  if(g.kind==='navigate'){api.navigation?.move(p);last.current=p;return;}
  if(e.shiftKey||(e.buttons&2)!==0){draft.current=null;preview.current=null;g.kind='navigate';api.navigation?.start(last.current||p);api.navigation?.move(p);setNavigationActive(true);return;}
  if(g.kind==='erase'){if(last.current&&Math.hypot(p.x-last.current.x,p.y-last.current.y)<Math.max(1,eraserRadius/4))return;eraseSweep(last.current||p,p);last.current=p;return;}
  const item=draft.current;if(!item||last.current&&Math.hypot(p.x-last.current.x,p.y-last.current.y)<1)return;
  const freehand=item.kind==='pen'||item.kind==='marker',anchor=api.pick(p.x,p.y,freehand?item.anchors[0]:undefined,!freehand);if(!anchor)return;last.current=p;
  if(item.kind==='line'||item.kind==='arrow')item.anchors=[item.anchors[0],anchor];else if(item.anchors.length<5000)item.anchors.push(anchor);
 };
 const finish=(e:ReactPointerEvent<HTMLCanvasElement>,cancel=false)=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;
  if(!cancel){if(g.kind==='draw'&&draft.current)change([...g.before,draft.current]);else if(g.kind==='erase'&&preview.current&&preview.current!==g.before&&(preview.current.length!==g.before.length||preview.current.some((item,i)=>item!==g.before[i])))change(eraserMode==='pixels'&&adapter.current?preview.current.flatMap(item=>splitErasedItem(item,adapter.current!,()=>nextId.current++)):preview.current);}
  resetGesture();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 };
 return <><canvas className={'drawingOverlay'+(enabled&&available?' drawingInteractive':'')+((shiftHeld||navigationActive||tool==='move')?' drawingNavigate':'')+(tool==='erase'&&!shiftHeld&&!navigationActive?' drawingEraser':'')} ref={canvas} aria-label="Рисунки и подписи с привязкой к сцене" onContextMenu={e=>{if(enabled)e.preventDefault();}} onPointerLeave={()=>{if(!gesture.current)eraserCursor.current=null;}} onPointerDown={start} onPointerMove={move} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}/>{enabled&&active&&<section className="maximPanel" aria-label="Я — Максим: инструменты решения"><div className="maximPanelHead"><strong>Я — Максим</strong><span>Shift или правая кнопка — обзор · Ctrl/⌘ Z — отмена</span>{adapter.current?.requiresPlane&&<button disabled={!planePicked} onClick={()=>{resetGesture();selectedPlane.current=null;setPlanePicked(false);setMessage('Выбери грань одним касанием.');}}>Выбрать другую грань</button>}</div><div className="maximTools">{([['move','↻ Обзор'],['pen','Перо'],['marker','Маркер'],['line','Отрезок'],['arrow','Стрелка'],['erase','Ластик']] as [Tool,string][]).map(([key,label])=><button key={key} disabled={!available&&key!=='move'} className={tool===key?'active':''} aria-pressed={tool===key} onClick={()=>{resetGesture();setTool(key);setMessage('');}}>{label}</button>)}<label>Цвет<input aria-label="Цвет рисунка" type="color" value={color} onChange={e=>setColor(e.target.value)}/></label><label>Толщина<select aria-label="Толщина линии" value={width} onChange={e=>setWidth(+e.target.value)}>{[2,3,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button disabled={!board.undo.length} onClick={()=>{resetGesture();undo();}}>↶ Отмена</button><button disabled={!board.redo.length} onClick={()=>{resetGesture();redo();}}>↷ Повтор</button><button disabled={!board.items.length} onClick={()=>{resetGesture();change([]);}}>Очистить</button></div>{tool==='erase'&&<div className="eraserSettings"><div role="group" aria-label="Режим ластика"><button aria-pressed={eraserMode==='object'} className={eraserMode==='object'?'active':''} onClick={()=>setEraserMode('object')}>Объект целиком</button><button aria-pressed={eraserMode==='pixels'} className={eraserMode==='pixels'?'active':''} onClick={()=>setEraserMode('pixels')}>Пиксели</button></div><label>Радиус <input aria-label="Радиус ластика" type="range" min="2" max="80" step="1" value={eraserRadius} onChange={e=>setEraserRadius(+e.target.value)}/><strong>{eraserRadius} px</strong></label></div>}<p role="status">{!available?unavailableMessage:message||'Первое касание выбирает грань, следующее рисует. Shift или правая кнопка — временный обзор. Ластик работает при протягивании.'}</p></section>}</>;
});
