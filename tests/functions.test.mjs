import assert from 'node:assert/strict';
import {compileFunction} from '../function-parser.ts';
const p={a:2,b:-3,c:1};
for(const [text,x,expected] of [['a*x^2+b*x+c',2,3],['2x+1',3,7],['2(x+1)',3,8],['-x^2',3,-9],['2^-2',0,.25],['2^3^2',0,512],['ln(e)',0,1],['log(100)',0,2],['sqrt(x)',4,2],['abs(x)',-3,3],['y = x²',3,9],['√x',4,2],['1,5*x',2,3]])assert(Math.abs(compileFunction(text)(x,p)-expected)<1e-9,text);
for(const text of ['','x+','(x+1','x+1)','window','constructor(x)','Math.sin(x)','x;alert(1)','sin(x)','cos(x)','tan(x)','tg(x)','cot(x)','ctg(x)','asin(x)','acos(x)','atan(x)'])assert.throws(()=>compileFunction(text),undefined,text);
assert(Number.isNaN(compileFunction('sqrt(x)')(-1,p)));assert(!Number.isFinite(compileFunction('1/x')(0,p)));
console.log('Passed: algebraic expression parser, domains, invalid input and rejection of removed functions.');
