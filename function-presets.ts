import type {Parameters} from './function-parser';
import type {Family} from './graph-tools';
export const functionPresets:{id:Family,title:string,latex:string,params:Parameters}[]=[
 {id:'line',title:'Прямая',latex:'kx+b',params:{a:1,b:0,c:0,k:1}},
 {id:'quadratic',title:'Парабола',latex:'ax^2+bx+c',params:{a:1,b:0,c:0,k:1}},
 {id:'reciprocal',title:'Гипербола',latex:'\\frac{k}{x}',params:{a:1,b:0,c:0,k:1}},
 {id:'sqrt',title:'Квадратный корень',latex:'a\\sqrt{x}',params:{a:1,b:0,c:0,k:1}},
 {id:'exp',title:'Показательная',latex:'a^x',params:{a:2,b:0,c:0,k:1}},
 {id:'log',title:'Логарифмическая',latex:'\\log_a x',params:{a:2,b:0,c:0,k:1}}
];
