import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeControlFlow} from '../control-flow.mjs';
const g=source=>analyzeControlFlow('example.mjs',source).graphs[0];
const typeNodes=(graph,type)=>graph.nodes.filter(n=>n.type===type);
const outgoing=(graph,id)=>graph.edges.filter(e=>e.from===id);

test('straight-line path enters function and ends at return',()=>{
  const x=g('function f(a){const x=a+1;return x;}');
  assert.ok(x.entry);assert.ok(x.exit);
  const entry=outgoing(x,x.entry)[0];
  assert.equal(entry.kind,'enter');
  assert.equal(x.nodes.find(n=>n.id===entry.to).type,'VariableDeclaration');
  assert.equal(outgoing(x,typeNodes(x,'return')[0].id)[0].kind,'return');
});
test('if/else has two named decision branches',()=>{
  const x=g('function f(a){if(a){return 1;}else{return 2;}}');
  const choice=typeNodes(x,'if')[0];
  assert.deepEqual(outgoing(x,choice.id).map(e=>e.kind).sort(),['false','true']);
  assert.equal(typeNodes(x,'return').length,2);
});
test('if without else has fall-through path',()=>{
  const x=g('function f(a){if(a){return 1;}return 2;}');
  const choice=typeNodes(x,'if')[0],paths=outgoing(x,choice.id);
  assert.equal(paths.length,2);
  assert.ok(paths.every(e=>x.nodes.find(n=>n.id===e.to).type==='return'));
});
test('while has back edge and condition exit',()=>{
  const x=g('function f(a){while(a){a=0;}return a;}');
  const loop=typeNodes(x,'while')[0];
  assert.deepEqual(outgoing(x,loop.id).map(e=>e.kind).sort(),['false','true']);
  assert.ok(x.edges.some(e=>e.to===loop.id&&e.kind==='next'));
});
test('do-while begins in body and returns to condition',()=>{
  const x=g('function f(a){do{a=0;}while(a);return a;}');
  const loop=typeNodes(x,'do-while-condition')[0];
  assert.ok(x.edges.some(e=>e.to===loop.id&&e.kind==='next'));
  assert.deepEqual(outgoing(x,loop.id).map(e=>e.kind).sort(),['false','true']);
});
test('for loop limitations are explicit, no invented update handling',()=>{
  const x=g('function f(){for(let i=0;i<3;i++){work();}return 2;}');
  assert.ok(x.limitations.includes('for-update-not-modeled'));
  assert.ok(x.limitations.includes('for-initializer-not-modeled'));
  assert.equal(x.confidence,'partial');
});
test('unsupported switch is disconnected rather than falsely resolved',()=>{
  const x=g('function f(a){switch(a){case 1:return 1;}return 0;}');
  assert.ok(x.limitations.includes('unsupported-control-flow:SwitchStatement'));
  assert.equal(outgoing(x,typeNodes(x,'SwitchStatement')[0].id).length,0);
});
test('early return does not have successor to later code',()=>{
  const x=g('function f(){return 1; const unused=2;}');
  assert.equal(outgoing(x,typeNodes(x,'return')[0].id)[0].to,x.exit);
  assert.ok(!outgoing(x,typeNodes(x,'return')[0].id).some(e=>x.nodes.find(n=>n.id===e.to).type==='VariableDeclaration'));
});
test('source is never executed and no files are changed',()=>{
  globalThis.__cfgProbe=0;
  const report=analyzeControlFlow('example.mjs','globalThis.__cfgProbe=5; function f(){return 1;}');
  assert.equal(globalThis.__cfgProbe,0);
  assert.equal(report.mode,'read-only');
  assert.equal(report.changesApplied,false);
  delete globalThis.__cfgProbe;
});
test('syntax error reported with parse location',()=>{
  const r=analyzeControlFlow('broken.mjs','const x=1;\nfunction (');
  assert.equal(r.parsed,false);
  assert.equal(r.error.line,2);
  assert.equal(r.graphs.length,0);
});
test('arrow functions outside scope are explicitly untracked',()=>{
  const r=analyzeControlFlow('example.mjs','const fn=x=>x+1;');
  assert.equal(r.graphs.length,0);
  assert.equal(r.untracked[0].reason,'assigned-function-not-expanded');
});
