export type NumericFunction=(x:number)=>number;
export function intersections(f:NumericFunction,g:NumericFunction,lo:number,hi:number){
 if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo>=hi)return {points:[] as {x:number,y:number}[],coincident:false};
 const samples=2048,step=(hi-lo)/samples,points:{x:number,y:number}[]=[],difference=(x:number)=>{const a=f(x),b=g(x);return Number.isFinite(a)&&Number.isFinite(b)&&Math.max(Math.abs(a),Math.abs(b))<1e10?a-b:NaN;};
 let finite=0,equal=0;for(let i=0;i<=32;i++){const y=difference(lo+(hi-lo)*i/32);if(Number.isFinite(y)){finite++;if(Math.abs(y)<1e-10)equal++;}}if(finite>20&&equal===finite)return {points,coincident:true};
 const add=(x:number)=>{const y=f(x),residual=difference(x);if(!Number.isFinite(y)||!Number.isFinite(residual)||Math.abs(residual)>1e-7||points.some(p=>Math.abs(p.x-x)<Math.max(1e-5,(hi-lo)*1e-8)))return;points.push({x,y});};
 const values=Array.from({length:samples+1},(_,i)=>difference(lo+i*step));
 for(let i=0;i<=samples;i++){if(Math.abs(values[i])<1e-10)add(lo+i*step);if(i===0||!Number.isFinite(values[i-1])||!Number.isFinite(values[i])||values[i-1]*values[i]>=0)continue;let a=lo+(i-1)*step,b=lo+i*step,fa=values[i-1];for(let j=0;j<80;j++){const mid=(a+b)/2,fm=difference(mid);if(!Number.isFinite(fm))break;if(fa*fm<=0)b=mid;else{a=mid;fa=fm;}}add((a+b)/2);}
 // Local minima of |f-g| catch tangencies that do not change sign.
 for(let i=1;i<samples;i++){const before=Math.abs(values[i-1]),here=Math.abs(values[i]),after=Math.abs(values[i+1]);if(!Number.isFinite(before+here+after)||here>=before||here>=after)continue;let a=lo+(i-1)*step,b=lo+(i+1)*step;const ratio=(Math.sqrt(5)-1)/2;for(let j=0;j<70;j++){const x=b-ratio*(b-a),y=a+ratio*(b-a),fx=Math.abs(difference(x)),fy=Math.abs(difference(y));if(!Number.isFinite(fx+fy))break;if(fx<fy)b=y;else a=x;}add((a+b)/2);}
 return {points:points.sort((a,b)=>a.x-b.x).slice(0,100),coincident:false};
}
export type Family='line'|'quadratic'|'reciprocal'|'sqrt'|'exp'|'log';
export function fitPoints(family:Family,points:{x:number,y:number}[]){
 const required=family==='line'?2:family==='quadratic'?3:1;
 if(points.length<required||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Укажите корректные координаты точек');
 const use=points.slice(0,required),p=use[0],pretty=(n:number)=>Number(n.toPrecision(12)).toString(),group=(n:number)=>`(${pretty(n)})`;
 if(family==='line'){const q=use[1];if(Math.abs(q.x-p.x)<1e-12)throw new Error('У точек должны различаться x');const k=(q.y-p.y)/(q.x-p.x),b=p.y-k*p.x;return {latex:`${pretty(k)}x${b<0?'':'+'}${pretty(b)}`,text:`${group(k)}*x+${group(b)}`};}
 if(family==='quadratic'){const q=use[1],r=use[2];if(Math.min(Math.abs(p.x-q.x),Math.abs(p.x-r.x),Math.abs(q.x-r.x))<1e-12)throw new Error('Нужны три различных x');const a=((r.y-p.y)/(r.x-p.x)-(q.y-p.y)/(q.x-p.x))/(r.x-q.x),b=(q.y-p.y)/(q.x-p.x)-a*(q.x+p.x),c=p.y-a*p.x*p.x-b*p.x;if(Math.abs(a)<1e-12)throw new Error('Эти точки задают прямую, а не параболу');return {latex:`${pretty(a)}x^2${b<0?'':'+'}${pretty(b)}x${c<0?'':'+'}${pretty(c)}`,text:`${group(a)}*x^2+${group(b)}*x+${group(c)}`};}
 if(family==='reciprocal'){if(p.x===0)throw new Error('Для k/x точка не может иметь x = 0');const k=p.x*p.y;return {latex:`\\frac{${pretty(k)}}{x}`,text:`${group(k)}/x`};}
 if(family==='sqrt'){if(p.x<=0)throw new Error('Для определения a нужна точка с x > 0');const a=p.y/Math.sqrt(p.x);return {latex:`${pretty(a)}\\sqrt{x}`,text:`${group(a)}*sqrt(x)`};}
 if(family==='exp'){if(p.x===0||p.y<=0)throw new Error('Нужна точка с x ≠ 0 и y > 0');const a=Math.exp(Math.log(p.y)/p.x);if(!Number.isFinite(a)||a<=0)throw new Error('Не удалось определить основание');return {latex:`${pretty(a)}^{x}`,text:`${group(a)}^x`};}
 if(family==='log'){if(p.x<=0||p.x===1||p.y===0)throw new Error('Нужна точка с x > 0, x ≠ 1 и y ≠ 0');const a=Math.exp(Math.log(p.x)/p.y);if(!Number.isFinite(a)||a<=0||a===1)throw new Error('Основание должно быть положительным и не равным 1');return {latex:`\\log_{${pretty(a)}}x`,text:`logb(x;${group(a)})`};}
 throw new Error('Выберите вид зависимости');
}
