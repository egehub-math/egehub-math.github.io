export function latexToExpression(source:string){
 const text=source.replace(/\\(?:left|right|displaystyle|textstyle)/g,'').replace(/\\[,;! ]/g,' ').replace(/\{,\}/g,'.').replace(/−/g,'-');let position=0;
 const skip=()=>{while(/\s/.test(text[position]||'')&&position<text.length)position++;};
 function argument():string{skip();const char=text[position];if(char==='{'||char==='('||char==='['){position++;return sequence(char==='{'?'}':char==='('?')':']');}if(char==='\\')return command();if(char==='-'||char==='+'){position++;return char+argument();}const number=text.slice(position).match(/^(?:\d+(?:[.,]\d*)?|[.,]\d+)/);if(number){position+=number[0].length;return number[0];}if(char&&/[a-zA-Zπ]/.test(char)){position++;return char;}throw new Error('Заполните все поля блока');}
 function command():string{
  position++;const match=text.slice(position).match(/^[a-zA-Z]+/);if(!match)throw new Error('Проверьте математический знак');const name=match[0];position+=name.length;
  if(['frac','dfrac','tfrac'].includes(name)){const top=argument(),bottom=argument();return `((${top})/(${bottom}))`;}
  if(name==='sqrt'){skip();let degree='';if(text[position]==='['){position++;degree=sequence(']');}const body=argument();return degree?`root((${body});(${degree}))`:`sqrt(${body})`;}
  if(name==='log'){skip();let base='10';if(text[position]==='_'){position++;base=argument();}return `logb((${argument()});(${base}))`;}
  const names:Record<string,string>={ln:'ln',exp:'exp'};
  if(name in names)return `${names[name]}(${argument()})`;
  if(name==='operatorname'){const operator=argument().replace(/\s/g,'');if(['abs','ln','log'].includes(operator))return `${operator}(${argument()})`;throw new Error('Эта операция пока не поддерживается');}
  if(name==='pi')return ' pi ';if(name==='exponentialE')return ' e ';
  if(name==='cdot'||name==='times')return '*';if(name==='div')return '/';
  if(name==='placeholder')throw new Error('Заполните все поля блока');
  if(name==='mathrm'||name==='mathit')return argument();
  if(name==='lvert'||name==='rvert')return '|';
  throw new Error(`Неизвестный блок: ${name}`);
 }
 function sequence(end=''):string{let result='';while(position<text.length){skip();if(position>=text.length)break;const char=text[position];if(end&&char===end){position++;return result;}if(char==='\\'){result+=command();continue;}if(char==='^'){position++;result+=`^(${argument()})`;continue;}if(char==='{'){position++;result+=`(${sequence('}')})`;continue;}if(char==='('){position++;result+=`(${sequence(')')})`;continue;}if(char==='['){position++;result+=`(${sequence(']')})`;continue;}if(char==='|'){position++;result+=`abs(${sequence('|')})`;continue;}if(/[a-zA-Z]/.test(char)){result+=' '+char+' ';position++;continue;}if('}])'.includes(char)&&end)throw new Error('Проверьте скобки');result+=char;position++;}if(end)throw new Error('Заполните блок и закройте скобки');return result;}
 const result=sequence().trim();if(!result)throw new Error('Соберите формулу из блоков');return result;
}
