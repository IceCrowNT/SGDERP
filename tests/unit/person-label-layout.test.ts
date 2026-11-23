import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutPersonLabels, labelsOverlap, type LabelBox } from '../../src/lib/office-3d/person-label-layout';
const label = (key: string, x: number, y = 150): LabelBox => ({key,x,y,w:140,h:40});
test('two overlapping names share the horizontal correction equally', () => {
 const result = layoutPersonLabels([label('a',200),label('b',280)],600,400);
 assert.equal(result.length,2);
 assert.equal(result[0].x,166); assert.equal(result[1].x,314);
 assert.equal(result[0].y,150); assert.equal(result[1].y,150);
 assert.equal(labelsOverlap(result[0],result[1]),false);
});
test('edge-constrained name gives remaining correction to its neighbour', () => {
 const result=layoutPersonLabels([label('a',74),label('b',150)],400,300);
 assert.equal(result[0].x,74);assert.equal(result[1].x,222);
 assert.ok(result.every(b=>b.x-b.w/2>=4&&b.x+b.w/2<=396));
});
test('three crowded names use a bounded second row without overlap', () => {
 const result=layoutPersonLabels([label('a',150),label('b',170),label('c',190)],340,300);
 assert.equal(result.length,3);
 result.forEach((a,i)=>result.slice(i+1).forEach(b=>assert.equal(labelsOverlap(a,b),false)));
});
test('non-colliding names remain anchored and repeated input is stable', () => {
 const input=[label('a',150),label('b',400)];
 const a=layoutPersonLabels(input,600,300), b=layoutPersonLabels(input.slice().reverse(),600,300);
 assert.deepEqual(a,b); assert.equal(a[0].x,150); assert.equal(a[1].x,400);
 assert.deepEqual(input,[label('a',150),label('b',400)]);
});
test('priority does not reverse the pair or change horizontal separation', () => {
 const input=[label('a',200),label('b',280)];
 const first=layoutPersonLabels(input,600,400);
 const selected=layoutPersonLabels([{...input[0],priority:3},input[1]],600,400);
 assert.deepEqual(first.map(b=>[b.key,b.x,b.y]),selected.map(b=>[b.key,b.x,b.y]));
});
test('respects reserved labels and impossible viewport dimensions', () => {
 const obstacle=label('reserved',200);
 const result=layoutPersonLabels([label('a',200)],400,300,[obstacle]);
 assert.equal(result.length,1); assert.equal(labelsOverlap(result[0],obstacle),false);
 assert.deepEqual(layoutPersonLabels([label('a',50)],100,100),[]);
});
