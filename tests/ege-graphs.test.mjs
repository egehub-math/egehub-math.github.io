import assert from 'node:assert/strict';
import {compileFunction} from '../function-parser.ts';
import {latexToExpression} from '../latex-expression.ts';
import {intersections,fitPoints} from '../graph-tools.ts';
const params={a:2,b:1,c:-3,k:5},near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),latex=(s,p=params)=>{const f=compileFunction(latexToExpression(s));return x=>f(x,p);};
for(const [source,x,y] of [[String.raw`\frac{k}{x}`,10,.5],[String.raw`\sqrt{36}`,0,6],[String.raw`\sqrt[3]{-8}`,0,-2],[String.raw`\log_{0.5}\left(x\right)`,8,-3],[String.raw`\left(\frac{1}{2}\right)^x`,-3,8],[String.raw`a x^2+b x+c`,2,7],[String.raw`\frac{1{,}5}{x}`,3,.5]])near(latex(source)(x),y);
assert(Number.isNaN(latex(String.raw`\log_{1}x`)(2)));
assert.throws(()=>latexToExpression(String.raw`\placeholder{}`));assert.throws(()=>latex(String.raw`\frac{x}{}`));
const line=fitPoints('line',[{x:0,y:-1},{x:1,y:1}]);near(latex(line.latex)(7),13);
const quad=fitPoints('quadratic',[{x:0,y:2},{x:1,y:0},{x:2,y:0}]);near(latex(quad.latex)(-3),20);
near(latex(fitPoints('reciprocal',[{x:5,y:1}]).latex)(10),.5);near(latex(fitPoints('sqrt',[{x:1,y:-3}]).latex)(36),-18);near(latex(fitPoints('exp',[{x:-1,y:2}]).latex)(-3),8);near(latex(fitPoints('log',[{x:2,y:-1}]).latex)(8),-3);
for(const [f,g,wanted] of [[x=>2*x-1,x=>x+3,[4]],[x=>x*x-x,x=>5*x,[0,6]],[x=>2/x,x=>x,[ -Math.sqrt(2),Math.sqrt(2)]],[x=>3*Math.sqrt(x),x=>x,[0,9]],[x=>(x-1.234)**2,()=>0,[1.234]],[x=>1/x,()=>0,[]]]){const found=intersections(f,g,-10,10);assert.equal(found.points.length,wanted.length);wanted.forEach((x,i)=>near(found.points[i].x,x));}
assert(intersections(x=>x*x,x=>x*x,-5,5).coincident);assert.throws(()=>fitPoints('line',[{x:1,y:1},{x:1,y:2}]));assert.throws(()=>fitPoints('log',[{x:1,y:0}]));
console.log('Passed: structured fractions, roots, logarithm bases, six EGE function families; line/parabola/hyperbola/root intersections; tangency and pole rejection.');

const {functionPresets}=await import('../function-presets.ts');
assert.equal(functionPresets.length,6);
const expected=[2,4,.5,Math.sqrt(2),4,1];functionPresets.forEach((preset,i)=>near(latex(preset.latex,preset.params)(2),expected[i]));
for(const expression of [String.raw`\sin x`,String.raw`\cos x`,String.raw`\tan x`,String.raw`\operatorname{ctg}(x)`])assert.throws(()=>latex(expression));
console.log('Passed: six EGE presets and no trigonometry in formula evaluation.');
