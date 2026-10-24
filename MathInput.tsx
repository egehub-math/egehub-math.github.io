/// <reference types="vite/client" />
import {useEffect,useRef} from 'react';
import {MathfieldElement} from 'mathlive';
MathfieldElement.fontsDirectory=import.meta.env.BASE_URL+'mathlive/fonts';
MathfieldElement.soundsDirectory=null;
MathfieldElement.computeEngine=null;
export type MathEditor=MathfieldElement;
export function MathInput({value,label,onChange,onActivate,onReady}:{value:string,label:string,onChange:(value:string)=>void,onActivate:(editor:MathfieldElement)=>void,onReady?:(editor:MathfieldElement|null)=>void}){
 const host=useRef<HTMLDivElement>(null),editor=useRef<MathfieldElement|null>(null),change=useRef(onChange),activate=useRef(onActivate),ready=useRef(onReady);change.current=onChange;activate.current=onActivate;ready.current=onReady;
 useEffect(()=>{const field=new MathfieldElement();editor.current=field;field.mathVirtualKeyboardPolicy='manual';field.smartFence=true;field.setAttribute('aria-label',label);field.value=value;const input=()=>change.current(field.value),focus=()=>activate.current(field);field.addEventListener('input',input);field.addEventListener('focusin',focus);host.current?.appendChild(field);ready.current?.(field);return()=>{ready.current?.(null);field.removeEventListener('input',input);field.removeEventListener('focusin',focus);field.remove();editor.current=null;};},[]);
 useEffect(()=>{const field=editor.current;if(field&&field.value!==value)field.setValue(value,{silenceNotifications:true});},[value]);
 return <div className="mathInputHost" ref={host}/>;
}

