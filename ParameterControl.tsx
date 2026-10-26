import {createFramePublisher} from './frame-value';
import {useEffect,useId,useRef,useState} from 'react';
const numberFormat=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:6,useGrouping:false});
const formatBounded=(value:number)=>numberFormat.format(Number(value.toFixed(6)));
export function ParameterControl({label,value,onChange,min=1,max=8,step=.1,unrestrictedInput=false}:{label:string,value:number,onChange:(n:number)=>void,min?:number,max?:number,step?:number,unrestrictedInput?:boolean}){
 const format=unrestrictedInput?(n:number)=>n.toString().replace('.',','):formatBounded;
 const [sliderPreview,setSliderPreview]=useState(value);
 const sliderValue=Math.max(min,Math.min(max,sliderPreview));
 const callback=useRef(onChange);callback.current=onChange;
 const publisher=useRef<ReturnType<typeof createFramePublisher>|null>(null);
 if(!publisher.current)publisher.current=createFramePublisher(value=>callback.current(value),requestAnimationFrame,cancelAnimationFrame);
 const flush=()=>publisher.current!.flush();
 const publish=(next:number)=>{setSliderPreview(next);publisher.current!.publish(next);};
 const apply=(next:number)=>{setSliderPreview(next);publisher.current!.immediate(next);};
 useEffect(()=>{if(!publisher.current!.pending)setSliderPreview(value);},[value]);
 useEffect(()=>()=>publisher.current?.discard(),[]);
 const id=useId(),editing=useRef(false),skipBlur=useRef(false),[draft,setDraft]=useState(()=>format(value)),[error,setError]=useState('');
 useEffect(()=>{if(!editing.current){setDraft(format(value));setError('');}},[value]);
 const commit=()=>{
  const text=draft.trim();const next=Number(text.replace(',','.'));
  if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(text)||!Number.isFinite(next)){setError('Введите число');return;}
  if(!unrestrictedInput&&(next<min||next>max)){setError(`От ${format(min)} до ${format(max)}`);return;}
  setError('');setDraft(format(next));apply(next);
 };
 return <div className="slider parameterControl"><div className="parameterHead"><label htmlFor={id}>{label}</label><input id={id} className="parameterNumber" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} aria-label={`${label}: значение`} aria-invalid={Boolean(error)} aria-describedby={error?id+'-error':undefined} title={unrestrictedInput?`Любое конечное число. Ползунок: от ${format(min)} до ${format(max)}. Enter — применить, Esc — отменить.`:`От ${format(min)} до ${format(max)}. Enter — применить, Esc — отменить.`} value={draft} onFocus={()=>{editing.current=true;}} onChange={e=>{setDraft(e.target.value);setError('');}} onBlur={()=>{editing.current=false;if(skipBlur.current){skipBlur.current=false;return;}commit();}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit();skipBlur.current=true;e.currentTarget.blur();}else if(e.key==='Escape'){e.preventDefault();setDraft(format(value));setError('');editing.current=false;skipBlur.current=true;e.currentTarget.blur();}}}/></div><input aria-label={label} type="range" min={min} max={max} step="any" value={sliderValue} onPointerUp={flush} onPointerCancel={flush} onBlur={flush} onKeyDown={e=>{const direction=['ArrowRight','ArrowUp'].includes(e.key)?1:['ArrowLeft','ArrowDown'].includes(e.key)?-1:0;if(direction){e.preventDefault();const next=Math.max(min,Math.min(max,Number((sliderValue+direction*step).toFixed(10))));setDraft(format(next));setError('');apply(next);}}} onChange={e=>{const raw=+e.target.value;const next=Math.min(max,Math.max(min,Number((min+Math.round((raw-min)/step)*step).toFixed(10))));setDraft(format(next));setError('');publish(next);}}/>{error&&<small id={id+'-error'} className="numberError" role="status">{error}</small>}</div>;
}

