import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeScopes} from '../scope-analyzer.mjs';

const ref=(r,name,line)=>r.references.find(x=>x.name===name&&(!line||x.line===line));
const binding=(r,name,kind)=>r.bindings.find(x=>x.name===name&&(!kind||x.kind===kind));

test('resolves lexical const and references with accurate positions',()=>{
  const r=analyzeScopes('sample.mjs','const number=1;\nconst result=number+1;');
  assert.equal(r.parsed,true);
  assert.equal(ref(r,'number',2).binding,binding(r,'number').id);
  assert.equal(ref(r,'number',2).column,14);
  assert.equal(r.summary.resolved,1);
});

test('detects scope shadowing and resolves to nearest binding',()=>{
  const r=analyzeScopes('sample.mjs','const value=1;\n{ const value=2; value; }\nvalue;');
  assert.equal(r.shadowing.length,1);
  const uses=r.references.filter(x=>x.name==='value');
  assert.equal(uses.length,2);
  assert.notEqual(uses[0].binding,uses[1].binding);
  assert.equal(uses[1].binding,binding(r,'value').id);
});

test('resolves function hoisting, parameters and calls without executing code',()=>{
  globalThis.__genesisScopeNotExecuted=0;
  const r=analyzeScopes('sample.mjs','work(4);\nfunction work(x){ globalThis.__genesisScopeNotExecuted=900; return x; }');
  assert.equal(ref(r,'work').binding,binding(r,'work','function').id);
  assert.equal(ref(r,'x').binding,binding(r,'x','param').id);
  assert.equal(globalThis.__genesisScopeNotExecuted,0);
  delete globalThis.__genesisScopeNotExecuted;
});

test('recognizes named imports and ignores noncomputed property keys',()=>{
  const r=analyzeScopes('sample.mjs','import {fetchData as load} from "./lib.mjs";\nconst item={load};\nload();\nitem.load;');
  const b=binding(r,'load','import');
  assert.ok(b);
  assert.equal(r.references.filter(x=>x.name==='load').length,2);
  assert.ok(r.references.filter(x=>x.name==='load').every(x=>x.binding===b.id));
  assert.equal(r.references.filter(x=>x.name==='item').length,1);
});

test('handles destructuring, default values, catch bindings',()=>{
  const r=analyzeScopes('sample.mjs','const outer=3;\nconst {x: renamed=outer}={};\ntry{ throw 1; }catch(err){ renamed+err; }');
  assert.equal(ref(r,'outer').binding,binding(r,'outer').id);
  assert.equal(ref(r,'renamed').binding,binding(r,'renamed').id);
  assert.equal(ref(r,'err').binding,binding(r,'err','catch').id);
});

test('does not mistake method names or labels for variable references',()=>{
  const r=analyzeScopes('sample.mjs','label: { const obj={go(){return 1}}; obj.go(); break label; }');
  assert.equal(r.references.filter(x=>['label','go'].includes(x.name)).length,0);
});

test('records external references as ambiguous, not proven errors',()=>{
  const r=analyzeScopes('sample.mjs','console.log(window.location);');
  assert.equal(ref(r,'console').status,'external-or-unresolved');
  assert.equal(ref(r,'window').status,'external-or-unresolved');
  assert.equal(r.shadowing.length,0);
});

test('parser syntax errors are explicit and no code executed',()=>{
  const r=analyzeScopes('bad.mjs','const x=;');
  assert.equal(r.parsed,false);
  assert.ok(r.error.line>0);
  assert.equal(r.bindings.length,0);
});
