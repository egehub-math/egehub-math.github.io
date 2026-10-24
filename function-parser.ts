export type Parameters={a:number,b:number,c:number,k?:number};
type Evaluate=(x:number,p:Parameters)=>number;
const functions:Record<string,(n:number)=>number>={abs:Math.abs,sqrt:Math.sqrt,ln:Math.log,log:Math.log10,lg:Math.log10,exp:Math.exp};
export function compileFunction(source:string):Evaluate{
 const text=source.trim().toLowerCase().replace(/^\s*(?:y|f\(x\))\s*=\s*/,'').replace(/π/g,'pi').replace(/х/g,'x').replace(/−/g,'-').replace(/[×·]/g,'*').replace(/²/g,'^2').replace(/³/g,'^3').replace(/√\s*(x|\d+(?:[.,]\d+)?)/g,'sqrt($1)').replace(/√/g,'sqrt').replace(/,/g,'.');

 if(!text)throw new Error('Введите формулу');if(text.length>1200)throw new Error('Формула слишком длинная');
 const raw:string[]=[];let pos=0;
 while(pos<text.length){if(/\s/.test(text[pos])){pos++;continue;}const match=text.slice(pos).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|^[a-z]+|^[+*/^();\-]/);if(!match)throw new Error(`Неизвестный символ: ${text[pos]}`);raw.push(match[0]);pos+=match[0].length;if(raw.length>500)throw new Error('Слишком сложная формула');}
 const tokens:string[]=[];for(let i=0;i<raw.length;i++){const before=raw[i-1],current=raw[i];const ends=before&&(before===')'||/^\d|^\./.test(before)||['x','a','b','c','k','pi','e'].includes(before));const starts=current==='('||/^\d|^\./.test(current)||/^[a-z]/.test(current);if(ends&&starts)tokens.push('*');tokens.push(current);}
 let cursor=0;
 function expression(minimum=0):Evaluate{
  const token=tokens[cursor++];let left:Evaluate;
  if(token==='+'||token==='-'){const right=expression(25);left=token==='-'?(x,p)=>-right(x,p):right;}
  else if(token==='('){left=expression();if(tokens[cursor++]!==')')throw new Error('Не хватает закрывающей скобки');}
  else if(token&&/^\d|^\./.test(token)){const n=Number(token);if(!Number.isFinite(n))throw new Error('Число слишком большое');left=()=>n;}
  else if(token==='x')left=x=>x;
  else if(token==='a'||token==='b'||token==='c'||token==='k')left=(_,p)=>p[token]??1;
  else if(token==='pi'||token==='e')left=()=>token==='pi'?Math.PI:Math.E;
  else if(token==='logb'||token==='root'){if(tokens[cursor++]!=='(')throw new Error('Проверьте блок');const inner=expression();if(tokens[cursor++]!==';')throw new Error('Укажите основание или степень корня');const base=expression();if(tokens[cursor++]!==')')throw new Error('Не хватает скобки');left=(x,p)=>{const n=inner(x,p),b=base(x,p);if(token==='logb')return n>0&&b>0&&b!==1?Math.log(n)/Math.log(b):NaN;if(b===0)return NaN;return n<0&&Number.isInteger(b)&&Math.abs(b%2)===1?-((-n)**(1/b)):n>=0?n**(1/b):NaN;};}
  else if(token&&Object.hasOwn(functions,token)){if(tokens[cursor++]!=='(')throw new Error(`Используйте ${token}(x)`);const inner=expression();if(tokens[cursor++]!==')')throw new Error('Не хватает закрывающей скобки');const fn=functions[token];left=(x,p)=>fn(inner(x,p));}
  else throw new Error(token?`Неизвестное выражение: ${token}`:'Не хватает числа или x');
  while(cursor<tokens.length){const op=tokens[cursor],binding=op==='+'||op==='-'?10:op==='*'||op==='/'?20:op==='^'?30:-1;if(binding<minimum)break;cursor++;const right=expression(op==='^'?binding:binding+1),previous=left;if(op==='+')left=(x,p)=>previous(x,p)+right(x,p);else if(op==='-')left=(x,p)=>previous(x,p)-right(x,p);else if(op==='*')left=(x,p)=>previous(x,p)*right(x,p);else if(op==='/')left=(x,p)=>previous(x,p)/right(x,p);else left=(x,p)=>previous(x,p)**right(x,p);}
  return left;
 }
 const result=expression();if(cursor!==tokens.length)throw new Error('Проверьте скобки и знаки действий');return result;
}
