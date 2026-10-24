import assert from 'node:assert/strict';
import {snapGraphPoint} from '../graph-transform.ts';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8);
let p=snapGraphPoint(1.04,1.03,50);assert(p.snapped);near(p.x,1);near(p.y,1);
assert(!snapGraphPoint(1.2,1.2,50).snapped);assert(!snapGraphPoint(1.3,1.3,6).snapped);
p=snapGraphPoint(Math.sqrt(2)+.02,2+.02,50,[{x:Math.sqrt(2),y:2}]);assert.equal(p.kind,'intersection');near(p.x,Math.sqrt(2));
console.log('Passed: permanent weak grid snapping, free movement away from nodes, low-zoom radius and function intersections.');
