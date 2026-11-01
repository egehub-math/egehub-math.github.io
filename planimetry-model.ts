export type P={x:number,y:number,name?:string};
export type Mode='triangle'|'right'|'isosceles'|'parallel'|'trapezoid'|'angles'|'diameters'|'cyclic'|'tangent'|'incquad';
export type Params=Record<string,number>;
export type Edge={a:P,b:P,kind?:string};
export type Control={key:string,label:string,min:number,max:number,step?:number};
export const modes:{id:Mode,name:string,group:string}[]=[
 {id:'triangle',name:'Произвольный',group:'Треугольник'},{id:'right',name:'Прямоугольный',group:'Треугольник'},{id:'isosceles',name:'Равнобедренный',group:'Треугольник'},
 {id:'parallel',name:'Параллелограмм',group:'Четырёхугольники'},{id:'trapezoid',name:'Трапеция',group:'Четырёхугольники'},
 {id:'angles',name:'Центральный и вписанный углы',group:'Окружность'},{id:'diameters',name:'Два диаметра',group:'Окружность'},{id:'cyclic',name:'Вписанный четырёхугольник',group:'Окружность'},{id:'tangent',name:'Касательная',group:'Окружность'},{id:'incquad',name:'Описанный четырёхугольник',group:'Окружность'}];
export const defaults:Params={a:8,b:5,h:5,x:2,alpha:55,r:4,arc:80,c:130,d:225,t:38,skew:15,start:-40,cpos:50,ca:-145,cc:45,tangentA:-130,extension:2};
const planNumberFormat=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
export const fmt=(n:number)=>planNumberFormat.format(Number(n.toFixed(2)));
export const dist=(a:P,b:P)=>Math.hypot(a.x-b.x,a.y-b.y);
export const lerp=(a:P,b:P,t:number,name?:string):P=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,name});
export const angle=(a:P,o:P,b:P)=>Math.acos(Math.max(-1,Math.min(1,((a.x-o.x)*(b.x-o.x)+(a.y-o.y)*(b.y-o.y))/(dist(a,o)*dist(b,o)))))*180/Math.PI;
export const foot=(p:P,a:P,b:P,name?:string)=>lerp(a,b,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/dist(a,b)**2,name);
const pt=(r:number,degrees:number,name?:string):P=>({x:r*Math.cos(degrees*Math.PI/180),y:r*Math.sin(degrees*Math.PI/180),name});
export function buildPlane(mode:Mode,p:Params,geometryOnly=false){
 const points:P[]=[],edges:Edge[]=[],circles:{o:P,r:number,kind?:string}[]=[],fills:{points:P[],kind:string}[]=[],angles:{a:P,o:P,b:P,label?:string,kind?:string,requires?:string[]}[]=[],facts:{label:string,value:string,requires?:string[]}[]=[],controls:Control[]=[],formulas:string[]=[];
 let description='',area=0,perimeter=0;const O:P={x:0,y:0,name:'O'};
 const add=(a:P,b:P,kind='base')=>edges.push({a,b,kind});const fact=(label:string,n:number,suffix='',requires:string[]=[])=>{if(!geometryOnly)facts.push({label,value:fmt(n)+suffix,requires});};
 const ctl=(key:string,label:string,min:number,max:number,step=.1)=>controls.push({key,label,min,max,step});
 if(['triangle','right','isosceles'].includes(mode)){
  const A:P={x:0,y:0,name:'A'},B:P={x:p.a,y:0,name:'B'},C:P=mode==='right'?{x:0,y:p.b,name:'C'}:{x:mode==='isosceles'?p.a/2:p.x,y:p.h,name:'C'};
  points.push(A,B,C);area=p.a*C.y/2;const ab=dist(A,B),ac=dist(A,C),bc=dist(B,C);perimeter=ab+ac+bc;
  [[A,B],[B,C],[C,A]].forEach(([a,b])=>add(a,b));
  const H=foot(C,A,B,'H'),M=lerp(A,B,.5,'M'),D=lerp(A,B,ac/(ac+bc),'D'),E=lerp(C,A,.5,'E'),F=lerp(C,B,.5,'F');
  add(C,H,'height');add(C,M,'median');add(C,D,'bisector');add(E,F,'midline');points.push(H,M,D,E,F);
  fills.push({points:[C,E,F],kind:'midline'},{points:[A,B,F,E],kind:'remainder'});
  angles.push({a:A,o:C,b:B,kind:'angles'},{a:C,o:A,b:B,kind:'angles'},{a:A,o:B,b:C,kind:'angles'},{a:C,o:H,b:B,kind:'height'});
  if(mode==='right'){
   // Here the right angle is at C, as in the bank: rotate the same right triangle labels.
   A.name='C';B.name='B';C.name='A';H.name='H₀';M.name='M₀';D.name='D₀';
   edges.splice(3);points.splice(3);angles.splice(0);
   const HH=foot(A,B,C,'H'),MM=lerp(B,C,.5,'M'),DD=lerp(B,C,dist(A,B)/(dist(A,B)+dist(A,C)),'D');
   points.push(HH,MM,DD);add(A,HH,'height');add(A,MM,'median');add(A,DD,'bisector');
   angles.push({a:B,o:A,b:C,kind:'angles'},{a:A,o:C,b:B,kind:'angles'},{a:C,o:B,b:A,kind:'angles'},{a:A,o:HH,b:B,kind:'height'});
   angles.push({a:HH,o:A,b:MM,kind:'angles',requires:['height','median']},{a:DD,o:A,b:MM,kind:'angles',requires:['bisector','median']},{a:HH,o:A,b:DD,kind:'angles',requires:['height','bisector']});
   fills.splice(0);const aa=angle(A,C,B)*Math.PI/180;
   fact('sin A',Math.sin(aa),'',['angles']);fact('cos A',Math.cos(aa),'',['angles']);fact('tg A',Math.tan(aa),'',['angles']);fact('∠HCM',angle(HH,A,MM),'°',['height','median','angles']);fact('∠DCM',angle(DD,A,MM),'°',['bisector','median','angles']);fact('∠HCD',angle(HH,A,DD),'°',['height','bisector','angles']);
   formulas.push('AB^2=AC^2+BC^2','\\sin A=\\frac{BC}{AB},\\quad\\cos A=\\frac{AC}{AB}','CM=\\frac{AB}{2},\\quad CH=\\frac{AC\\cdot BC}{AB}');
   ctl('a','Катет BC',1,12);ctl('b','Катет AC',1,12);
   description='Угол C прямой. Высота CH, медиана CM и биссектриса CD проведены из вершины прямого угла. Включай их вместе и сравнивай углы.';
  }else{
   const denom=2*(A.x*(B.y-C.y)+B.x*(C.y-A.y)+C.x*(A.y-B.y));const ux=((A.x*A.x+A.y*A.y)*(B.y-C.y)+(B.x*B.x+B.y*B.y)*(C.y-A.y)+(C.x*C.x+C.y*C.y)*(A.y-B.y))/denom,uy=((A.x*A.x+A.y*A.y)*(C.x-B.x)+(B.x*B.x+B.y*B.y)*(A.x-C.x)+(C.x*C.x+C.y*C.y)*(B.x-A.x))/denom;
   circles.push({o:{x:ux,y:uy,name:'O'},r:Math.hypot(ux,uy),kind:'circumcircle'});
   circles.push({o:{x:(bc*A.x+ac*B.x+ab*C.x)/perimeter,y:ab*C.y/perimeter,name:'I'},r:2*area/perimeter,kind:'incircle'});
   const T=foot(A,B,C,'T');points.push(T);add(A,T,'height');
   const X:P={x:B.x+(p.extension??2),y:0,name:'K'};add(B,X,'exterior');points.push(X);angles.push({a:X,o:B,b:C,kind:'exterior'});
   fact('S малого треугольника',area/4,'',['midline']);fact('S оставшейся трапеции',3*area/4,'',['remainder']);fact('CH',C.y,'',['height']);fact('Высота из A',2*area/bc,'',['height']);fact('Радиус R',ab*ac*bc/(4*area),'',['circumcircle']);
   formulas.push('S=\\frac{1}{2}ah_a','EF=\\frac{AB}{2},\\quad S_{CEF}=\\frac{S_{ABC}}{4}','\\frac{AD}{DB}=\\frac{AC}{CB}','\\frac{a}{\\sin A}=2R');
   ctl('extension','Продолжение BK',.5,6);ctl('a','Основание AB',2,12);ctl('h','Высота CH',1,10);if(mode==='triangle')ctl('x','Смещение вершины C',-3,14);
   description=mode==='isosceles'?'AC = BC. Высота, медиана и биссектриса из C совпадают. Внешний угол равен сумме двух внутренних углов, не смежных с ним.':'Тяни любую точку или меняй параметры. Сравни высоту, медиану и биссектрису; исследуй среднюю линию и окружности.';
  }
 }else if(mode==='parallel'||mode==='trapezoid'){
  const A={x:0,y:0,name:'A'},B={x:p.x,y:p.h,name:'B'},C={x:p.x+(mode==='parallel'?p.a:p.b),y:p.h,name:'C'},D={x:p.a,y:0,name:'D'};points.push(A,B,C,D);for(let i=0;i<4;i++)add(points[i],points[(i+1)%4]);
  area=(p.a+(mode==='parallel'?p.a:p.b))*p.h/2;perimeter=dist(A,B)+dist(B,C)+dist(C,D)+dist(D,A);
  const H=foot(B,A,D,'H'),K=foot(B,C,D,'K');points.push(H,K);add(B,H,'height');if(mode==='parallel')add(B,K,'height');angles.push({a:B,o:H,b:D,kind:'height'});
  add(A,C,'diagonal');add(B,D,'diagonal');
  if(mode==='parallel'){
   const E=lerp(A,D,.5,'E');points.push(E);add(B,E,'midline');fills.push({points:[A,B,E],kind:'midline'},{points:[B,C,D,E],kind:'remainder'});
   fact('S треугольника ABE',area/4,'',['midline']);fact('S трапеции BCDE',3*area/4,'',['midline','remainder']);fact('Высота к AD',p.h,'',['height']);fact('Высота к CD',area/dist(A,B),'',['height']);formulas.push('S=ah_a=bh_b','S_{ABE}=\\frac14 S_{ABCD}');
   description='Противоположные стороны параллельны и равны. Точка E — середина AD. При изменении наклона отношение площадей остаётся тем же.';
  }else{
   const E=lerp(A,B,.5,'E'),F=lerp(D,C,.5,'F'),N=lerp(B,D,.5,'N');points.push(E,F,N);add(E,F,'midline');
   fact('Средняя линия EF',(p.a+p.b)/2,'',['midline']);fact('EN',p.a/2,'',['midline','diagonal']);fact('NF',p.b/2,'',['midline','diagonal']);formulas.push('EF=\\frac{AD+BC}{2}','S=\\frac{AD+BC}{2}h','EN=\\frac{AD}{2},\\quad NF=\\frac{BC}{2}');
   description='AD ∥ BC. Средняя линия соединяет середины боковых сторон. Диагональ BD делит её на отрезки, равные половинам оснований.';ctl('b','Верхнее основание BC',1,12);
  }
  ctl('a','Основание AD',2,12);ctl('h','Высота BH',1,10);ctl('x','Сдвиг верхнего основания',-5,8);
 }else{
  circles.push({o:O,r:p.r});ctl('r','Радиус',1,7);
  if(mode==='angles'||mode==='diameters'){
   const start=p.start??-40;const A=pt(p.r,start,'A'),B=pt(p.r,start+p.arc,'B'),C=pt(p.r,mode==='diameters'?start+180:start+p.arc+(360-p.arc)*(p.cpos??50)/100,'C');points.push(A,B,C,O);
   add(A,B,'chord');add(A,O);add(O,B);add(A,C);add(B,C);angles.push({a:A,o:O,b:B,kind:'angles',label:fmt(p.arc)+'°'},{a:A,o:C,b:B,kind:'angles'});
   if(mode==='diameters'){const D=pt(p.r,start+180+p.arc,'D');points.push(D);add(B,D);add(O,D);angles.push({a:A,o:O,b:D,kind:'diagonal'});fact('∠AOD',180-p.arc,'°',['diagonal']);}
   fact('Центральный ∠AOB',p.arc,'°',['angles']);fact('Вписанный ∠ACB',p.arc/2,'°',['angles']);fact('Длина хорды AB',dist(A,B),'',['chord']);formulas.push('\\angle AOB=2\\angle ACB','AB=2R\\sin\\frac{\\angle AOB}{2}');
   ctl('arc','Дуга AB, °',10,170,1);ctl('start','Поворот дуги, °',-180,180,1);if(mode==='angles')ctl('cpos','Положение C на большой дуге, %',10,90,1);description='Центральный и вписанный углы опираются на одну дугу AB. Вписанный угол равен половине градусной меры этой дуги.';
  }else if(mode==='cyclic'){
   const A=pt(p.r,p.ca??-145,'A'),B=pt(p.r,p.c,'B'),C=pt(p.r,p.cc??45,'C'),D=pt(p.r,-p.t,'D');points.push(A,B,C,D,O);for(let i=0;i<4;i++)add(points[i],points[(i+1)%4]);add(A,C,'diagonal');add(B,D,'diagonal');
   [A,B,C,D].forEach((o,i)=>angles.push({a:points[(i+3)%4],o,b:points[(i+1)%4],kind:'angles'}));
   fact('∠A + ∠C',180,'°',['angles']);fact('∠B + ∠D',180,'°',['angles']);fact('∠ABD',angle(A,B,D),'°',['diagonal','angles']);fact('∠ACD',angle(A,C,D),'°',['diagonal','angles']);fact('∠CAD',angle(C,A,D),'°',['diagonal','angles']);fact('∠ABC',angle(A,B,C),'°',['angles']);formulas.push('\\angle A+\\angle C=180^\\circ','\\angle B+\\angle D=180^\\circ','\\angle ABD=\\angle ACD');
   angles.push({a:A,o:B,b:D,kind:'diagonal',requires:['angles']},{a:A,o:C,b:D,kind:'diagonal',requires:['angles']},{a:C,o:A,b:D,kind:'diagonal',requires:['angles']});
   ctl('ca','Положение A, °',-175,-125,1);ctl('cc','Положение C, °',0,60,1);ctl('c','Положение B, °',65,195,1);ctl('t','Положение D, °',5,120,1);description='Все четыре вершины лежат на окружности. Тяни вершины по окружности. Противоположные углы в сумме дают 180°, а углы, опирающиеся на одну дугу, равны.';
  }else if(mode==='tangent'){
   const theta=p.t*Math.PI/180,A=pt(p.r,p.t,'A'),B=pt(p.r,0,'B'),C:P={x:p.r/Math.cos(theta),y:0,name:'C'};points.push(A,B,C,O);add(O,A);add(O,C);add(A,C);const ext=lerp(C,A,1.55);add(A,ext,'exterior');angles.push({a:O,o:A,b:C,kind:'angles'},{a:A,o:O,b:B,kind:'angles'},{a:A,o:C,b:O,kind:'angles'});
   fact('∠ACO',90-p.t,'°',['angles']);fact('Дуга AB',p.t,'°',['angles']);fact('Касательная AC',dist(A,C),'',['measure']);formulas.push('OA\\perp AC','\\angle ACO=90^\\circ-\\angle AOC','AC^2=OC^2-R^2');ctl('t','Дуга AB, °',10,75,1);description='Радиус OA перпендикулярен касательной AC в точке касания. Перемещай внешний угол и наблюдай за дугой AB.';
  }else{
   const degrees=[p.tangentA??-130,-40,p.alpha,145+p.skew],touch=degrees.map(d=>pt(p.r,d));
   const vertices=degrees.map((d,i)=>{let next=degrees[(i+1)%4];if(i===3)next+=360;const mid=(d+next)/2;return pt(p.r/Math.cos((next-d)/2*Math.PI/180),mid,['A','B','C','D'][i]);});points.push(...vertices,O);
   vertices.forEach((a,i)=>add(a,vertices[(i+1)%4]));touch.forEach((a,i)=>{a.name=['K','L','M','N'][i];add(O,a,'height');points.push(a);});
   const lengths=vertices.map((a,i)=>dist(a,vertices[(i+1)%4]));perimeter=lengths.reduce((a,b)=>a+b,0);area=p.r*perimeter/2;
   lengths.forEach((n,i)=>fact(['AB','BC','CD','DA'][i],n,'',['measure']));fact('AB + CD',lengths[0]+lengths[2],'',['measure']);fact('BC + DA',lengths[1]+lengths[3],'',['measure']);formulas.push('AB+CD=BC+DA','P=2(AB+CD)','S=rp,\\quad p=\\frac P2');ctl('tangentA','Наклон левой стороны, °',-160,-100,1);ctl('alpha','Положение касательной, °',25,90,1);ctl('skew','Наклон верхней стороны, °',-15,20,1);description='Каждая сторона касается окружности. Отрезки касательных из одной вершины равны, поэтому суммы противоположных сторон совпадают. Здесь p — полупериметр.';
  }
 }
 for(const circle of circles)if(circle.o.name&&!points.some(p=>p.name===circle.o.name))points.push(circle.o);
 if(area)fact('Площадь S',area);if(perimeter)fact('Периметр P',perimeter);
 return {points,edges,circles,fills,angles:angles.filter(v=>dist(v.a,v.o)>1e-8&&dist(v.b,v.o)>1e-8),facts,controls,formulas,description,area,perimeter};
}
