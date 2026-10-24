import * as T from 'three';
export type Shape='cube'|'box'|'prism'|'oblique'|'pyramid'|'tetra'|'cylinder'|'cone'|'ball'|'sphere';
export const names:Record<Shape,string>={cube:'Куб',box:'Параллелепипед',prism:'Треугольная призма',oblique:'Наклонная призма',pyramid:'Квадратная пирамида',tetra:'Треугольная пирамида',cylinder:'Цилиндр',cone:'Конус',ball:'Шар',sphere:'Сфера'};
export const curved=(s:Shape)=>['cylinder','cone','ball','sphere'].includes(s);
export const round=(s:Shape)=>s==='ball'||s==='sphere';
export const info:Record<Shape,{text:string,volume:string,area:string}>={
 cube:{text:'Куб ограничен шестью равными квадратами. Все рёбра равны, соседние грани перпендикулярны.',volume:'V=a^3',area:'S=6a^2'},
 box:{text:'Все грани прямоугольного параллелепипеда — прямоугольники. Противоположные грани равны и параллельны.',volume:'V=abh',area:'S=2(ab+ah+bh)'},
 prism:{text:'Прямая призма с равносторонним треугольником в основании. Её боковое ребро совпадает по длине с высотой.',volume:'V=\\frac{\\sqrt{3}}{4}a^2h',area:'S=\\frac{\\sqrt{3}}{2}a^2+3ah'},
 oblique:{text:'Основания равносторонние и параллельные. Верхнее сдвинуто на d. Высота h — расстояние между основаниями; боковое ребро длиннее высоты при ненулевом сдвиге.',volume:'V=S_{\\text{осн}}h',area:'S=2S_{\\text{осн}}+\\sum S_{\\text{бок. грани}}'},
 pyramid:{text:'Правильная пирамида с квадратным основанием. Её вершина находится над центром квадрата, высота перпендикулярна основанию.',volume:'V=\\frac{a^2h}{3}',area:'S=a^2+2a\\sqrt{h^2+\\frac{a^2}{4}}'},
 tetra:{text:'Треугольная пирамида с равносторонним основанием и вершиной над его центром. Это тетраэдр; все шесть рёбер равны только при h = a√(2/3).',volume:'V=\\frac{\\sqrt{3}}{12}a^2h',area:'S=\\frac{\\sqrt{3}}{4}a^2+\\frac{3a}{2}\\sqrt{h^2+\\frac{a^2}{12}}'},
 cylinder:{text:'Прямой круговой цилиндр: два равных круга в параллельных плоскостях. При разворачивании боковой поверхности получается прямоугольник со сторонами 2πr и h.',volume:'V=\\pi r^2h',area:'S=2\\pi r^2+2\\pi rh'},
 cone:{text:'Прямой круговой конус. Высота соединяет вершину с центром основания. Образующая l — отрезок от вершины до окружности основания. Развёртка боковой поверхности — сектор радиуса l.',volume:'V=\\frac{\\pi r^2h}{3}',area:'S=\\pi r^2+\\pi r\\sqrt{r^2+h^2}'},
 ball:{text:'Шар — тело из всех точек, расстояние от которых до центра не превышает r. Его граница — сфера. Сечение шара плоскостью — круг.',volume:'V=\\frac{4}{3}\\pi r^3',area:'S=4\\pi r^2'},
 sphere:{text:'Сфера — поверхность из точек на расстоянии r от центра. Она не является объёмным телом. Пересечение сферы плоскостью — окружность; при касании — точка.',volume:'V_{\\text{шара}}=\\frac{4}{3}\\pi r^3',area:'S=4\\pi r^2'}
};
export function solid(shape:Shape,a:number,b:number,h:number,shift=0){
 const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 if(round(shape)){const vertices:T.Vector3[]=[],faces:number[][]=[];const n=64,m=32;for(let j=0;j<=m;j++)for(let i=0;i<n;i++){const phi=j/m*Math.PI,theta=i/n*2*Math.PI;vertices.push(v(a*Math.sin(phi)*Math.cos(theta),a*Math.cos(phi),a*Math.sin(phi)*Math.sin(theta)));}for(let j=0;j<m;j++)for(let i=0;i<n;i++){const k=(i+1)%n;faces.push([j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i]);}return {vertices,faces};}
 if(shape==='cylinder'||shape==='cone'){const n=96,vertices:T.Vector3[]=Array.from({length:n},(_,i)=>v(a*Math.cos(i/n*2*Math.PI),-h/2,a*Math.sin(i/n*2*Math.PI))),faces:number[][]=[Array.from({length:n},(_,i)=>i)];if(shape==='cone'){vertices.push(v(0,h/2,0));for(let i=0;i<n;i++)faces.push([i,n,(i+1)%n]);}else{vertices.push(...Array.from({length:n},(_,i)=>v(a*Math.cos(i/n*2*Math.PI),h/2,a*Math.sin(i/n*2*Math.PI))));faces.push(Array.from({length:n},(_,i)=>n+i));for(let i=0;i<n;i++)faces.push([i,(i+1)%n,(i+1)%n+n,i+n]);}return {vertices,faces};}
 if(shape==='prism'||shape==='oblique'||shape==='tetra'){const r=a/Math.sqrt(3),vertices=[v(-a/2,-h/2,-r/2),v(a/2,-h/2,-r/2),v(0,-h/2,r)];if(shape==='tetra'){vertices.push(v(0,h/2,0));return {vertices,faces:[[0,2,1],[0,1,3],[1,2,3],[2,0,3]]};}const d=shape==='oblique'?shift:0;vertices.push(...vertices.map(p=>v(p.x+d,h/2,p.z)));return {vertices,faces:[[0,2,1],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]]};}
 if(shape==='pyramid')return {vertices:[v(-a/2,-h/2,-a/2),v(a/2,-h/2,-a/2),v(a/2,-h/2,a/2),v(-a/2,-h/2,a/2),v(0,h/2,0)],faces:[[0,1,2,3],[0,4,1],[1,4,2],[2,4,3],[3,0,4]]};
 const d=shape==='cube'?a:b,y=shape==='cube'?a:h;return {vertices:[v(-a/2,-y/2,-d/2),v(a/2,-y/2,-d/2),v(a/2,-y/2,d/2),v(-a/2,-y/2,d/2),v(-a/2,y/2,-d/2),v(a/2,y/2,-d/2),v(a/2,y/2,d/2),v(-a/2,y/2,d/2)],faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]};
}
export function metrics(shape:Shape,a:number,b:number,h:number,shift=0){
 if(shape==='cube')return {volume:a**3,area:6*a*a};if(shape==='box')return {volume:a*b*h,area:2*(a*b+a*h+b*h)};
 if(shape==='cylinder')return {volume:Math.PI*a*a*h,area:2*Math.PI*a*(a+h)};if(shape==='cone')return {volume:Math.PI*a*a*h/3,area:Math.PI*a*(a+Math.hypot(a,h))};if(round(shape))return {volume:shape==='sphere'?0:4/3*Math.PI*a**3,area:4*Math.PI*a*a};
 if(shape==='pyramid')return {volume:a*a*h/3,area:a*a+2*a*Math.hypot(h,a/2)};if(shape==='tetra')return {volume:Math.sqrt(3)/12*a*a*h,area:Math.sqrt(3)/4*a*a+1.5*a*Math.sqrt(h*h+a*a/12)};
 const base=Math.sqrt(3)/4*a*a;if(shape==='prism')return {volume:base*h,area:2*base+3*a*h};const {vertices}=solid(shape,a,b,h,shift),side=new T.Vector3(shift,h,0);let lateral=0;for(let i=0;i<3;i++)lateral+=new T.Vector3().crossVectors(vertices[(i+1)%3].clone().sub(vertices[i]),side).length();return {volume:base*h,area:2*base+lateral};
}
export function vertexName(shape:Shape,i:number){if(shape==='pyramid')return i===4?'S':'ABCD'[i];if(shape==='tetra')return i===3?'S':'ABC'[i];const n=shape==='prism'||shape==='oblique'?3:4;return 'ABCD'[i%n]+(i>=n?'₁':'');}
