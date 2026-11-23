import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {analyzeAST,inspectASTFiles} from '../analyzer.mjs';

const has=(report,rule)=>report.findings.filter(f=>f.rule===rule);
test('AST reports exact node locations and never executes scanned code',()=>{
  globalThis.genesisAstProbe=0;
  const src='const x=1;\n eval("globalThis.genesisAstProbe=99");\n';
  const r=analyzeAST('x.js',src);
  assert.equal(r.parsed,true);
  assert.equal(has(r,'AST001')[0].line,2);
  assert.equal(has(r,'AST001')[0].column,2);
  assert.equal(globalThis.genesisAstProbe,0);
  delete globalThis.genesisAstProbe;
});
test('ignores comments, literals and detects expressions in template strings',()=>{
  const src='// eval("x")\nconst x="eval(1)";\nconst y='+String.fromCharCode(96)+'ok '+String.fromCharCode(36)+'{eval("test")}'+String.fromCharCode(96)+';\n';
  const r=analyzeAST('x.mjs',src);
  assert.equal(has(r,'AST001').length,1);
});
test('tracks static and literal dynamic module imports',()=>{
  const src='import v from "./one.mjs";\nconst y=import("./two.mjs");\nconst z=import(name);';
  const r=analyzeAST('x.mjs',src);
  assert.equal(r.imports.length,2);
  assert.equal(r.imports[0].specifier,'./one.mjs');
  assert.equal(has(r,'AST007').length,1);
});
test('records other hazards with AST nodes',()=>{
  const r=analyzeAST('x.js','new Function("return 1");\ndocument.write("hello");\nlocalStorage.clear();\nnode.innerHTML = "ok";');
  for(const rule of ['AST002','AST003','AST004','AST005'])assert.equal(has(r,rule).length,1);
});
test('duplicates only within same block, not across separate blocks',()=>{
  const distinct=analyzeAST('x.js','{ function foo(){} }\n{ function foo(){} }');
  assert.equal(has(distinct,'AST006').length,0);
  const duplicates=analyzeAST('x.js','function foo(){}\nfunction foo(){}');
  assert.ok(has(duplicates,'AST006').length===1 || has(duplicates,'AST000').length===1);
});
test('syntax error uses parser line and column',()=>{
  const r=analyzeAST('x.mjs','const x=1;\nfunction (');
  assert.equal(r.parsed,false);
  assert.equal(has(r,'AST000')[0].line,2);
});
test('read-only file access and symlink boundaries',()=>{
  const folder=mkdtempSync(join(tmpdir(),'genesis-ast-test-'));
  const other=mkdtempSync(join(tmpdir(),'genesis-ast-other-'));
  try{
    writeFileSync(join(folder,'safe.mjs'),'export const x=1;\n');
    writeFileSync(join(other,'secret.mjs'),'const x=1;\n');
    symlinkSync(join(other,'secret.mjs'),join(folder,'escape.mjs'));
    const result=inspectASTFiles(['safe.mjs'],{root:folder});
    assert.equal(result.changesApplied,false);
    assert.equal(result.files[0].parsed,true);
    assert.throws(()=>inspectASTFiles(['escape.mjs'],{root:folder}),/außerhalb/);
    assert.throws(()=>inspectASTFiles(['../outside.mjs'],{root:folder}));
  }finally{rmSync(folder,{recursive:true,force:true});rmSync(other,{recursive:true,force:true});}
});

test('detects equivalent bracket and bare Function forms without evaluating source',()=>{
 const r=analyzeAST('hazards.mjs',[
  'Function("return 1")',
  'new Function("return 2")',
  'document["write"]("sample")',
  'localStorage["clear"]()',
  'element["innerHTML"] = untrusted',
 ].join(';\n'));
 assert.equal(has(r,'AST002').length,2);
 assert.equal(has(r,'AST003').length,1);
 assert.equal(has(r,'AST004').length,1);
 assert.equal(has(r,'AST005').length,1);
 assert.equal(r.parsed,true);
});
test('dynamic computed properties and inert strings are not treated as known hazards',()=>{
 const r=analyzeAST('safe.mjs',[
  'const prop = "innerHTML"',
  'element[prop] = "text"',
  'localStorage[method]()',
  'document[action]("sample")',
  'const message = "Function(\\\"x\\\")"',
 ].join(';\n'));
 assert.equal(r.parsed,true);
 for(const rule of ['AST002','AST003','AST004','AST005'])
  assert.equal(has(r,rule).length,0,rule);
});

test('B1 resolves shadowed global members through function parameters',()=>{
 const source=[
  'function local(document, localStorage) { document.write("local"); localStorage.clear(); }',
  'const arrow = (document) => document.write("arrow");',
  'function destructured({document}) { document.write("destructured"); }',
  'document.write("global");',
  'localStorage.clear();'
 ].join('\n');
 const r=analyzeAST('bindings.mjs',source);
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,1);
 assert.equal(has(r,'AST004').length,1);
 assert.equal(has(r,'AST005')[0].line,4);
 assert.equal(has(r,'AST004')[0].line,5);
});
test('B1 handles shadowing only inside the parameter scope and nested functions',()=>{
 const r=analyzeAST('nested.mjs',[
  'function outer(document) {',
  '  function inner(){ document.write("still local"); }',
  '}',
  'function other(){ document.write("global"); }'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,1);
 assert.equal(has(r,'AST005')[0].line,4);
});

test('B2 lexical declarations shadow only inside their blocks, including before initialization',()=>{
 const source=[
  '{',
  ' document.write("tdz");',
  ' let document = {write(){}};',
  ' const localStorage = {clear(){}};',
  ' localStorage.clear();',
  '}',
  'document.write("global");',
  'localStorage.clear();'
 ].join('\n');
 const r=analyzeAST('blocks.mjs',source);
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(f=>f.line),[7]);
 assert.deepEqual(has(r,'AST004').map(f=>f.line),[8]);
});
test('B2 var hoists through nested blocks but stops at function boundaries',()=>{
 const source=[
  'function local(){',
  ' document.write("hoisted");',
  ' if(true){var document = {write(){}};}',
  '}',
  'document.write("global");'
 ].join('\n');
 const r=analyzeAST('hoist.mjs',source);
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(f=>f.line),[5]);
});
test('B2 imports and catch parameters shadow globals only in their own scopes',()=>{
 const module=analyzeAST('imports.mjs','import {document} from "./mock.mjs"; document.write("local");');
 assert.equal(module.parsed,true);
 assert.equal(has(module,'AST005').length,0);
 const source=[
  'try { throw Error("x"); } catch ({document}) { document.write("local"); }',
  'document.write("global");'
 ].join('\n');
 const r=analyzeAST('catch.mjs',source);
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(f=>f.line),[2]);
});
test('B2 for-loop bindings remain local while var is function hoisted',()=>{
 const source=[
  'for (let document of [{write(){}}]) document.write("local");',
  'document.write("global");',
  'function f(){',
  ' localStorage.clear();',
  ' for(var localStorage of [{clear(){}}]) {}',
  '}'
 ].join('\n');
 const r=analyzeAST('loops.mjs',source);
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(f=>f.line),[2]);
 assert.equal(has(r,'AST004').length,0);
});

test('B3 explicit globalThis members survive shadowing of shorter global names',()=>{
 const r=analyzeAST('explicit.mjs',[
  'function f(document, localStorage){',
  ' document.write("local");',
  ' localStorage.clear();',
  ' globalThis.document.write("global");',
  ' globalThis["localStorage"]["clear"]();',
  '}'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[5]);
});
test('B3 never treats a shadowed globalThis object as the real global object',()=>{
 const r=analyzeAST('fake-global.mjs',[
  'function f(globalThis){',
  ' globalThis.document.write("local");',
  ' globalThis.localStorage.clear();',
  '}',
  'globalThis.document.write("global");',
  'globalThis.localStorage.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[5]);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[6]);
});

test('B3 immutable direct aliases of global document and storage are detected',()=>{
 const r=analyzeAST('aliases.mjs',[
  'const doc = globalThis.document;',
  'const store = localStorage;',
  'doc.write("global");',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[4]);
});
test('B3 aliases are not inferred from shadowed origins or mutable bindings',()=>{
 const r=analyzeAST('non-aliases.mjs',[
  'function f(globalThis, document){',
  ' const doc = globalThis.document;',
  ' const other = document;',
  ' let mutable = globalThis.document;',
  ' doc.write("not verified global");',
  ' other.write("not verified global");',
  ' mutable.write("not verified global");',
  '}'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});
test('B3 alias resolution respects shadowing and declaration order',()=>{
 const r=analyzeAST('alias-order.mjs',[
  'doc.write("before declaration");',
  'const doc = globalThis.document;',
  'doc.write("after declaration");',
  '{ const doc = {write(){}}; doc.write("local"); }',
  'doc.write("outer alias");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3,5]);
});

test('B4 local Function bindings suppress only locally shadowed dynamic-compilation alerts',()=>{
 const r=analyzeAST('shadow-function.mjs',[
  '{',
  ' const Function = class LocalCompiler {};',
  ' Function("local");',
  ' new Function("local");',
  '}',
  'Function("global");',
  'new Function("global");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST002').map(x=>x.line),[6,7]);
});
test('B4 non-strict script eval parameters shadow the global builtin in nested calls',()=>{
 const r=analyzeAST('shadow-eval.cjs',[
  'function outer(eval){',
  ' eval("local");',
  ' function inner(){ eval("also local"); }',
  '}',
  'eval("global");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST001').map(x=>x.line),[5]);
});
test('B4 global eval and Function remain detected when only unrelated names are bound',()=>{
 const r=analyzeAST('global-execution.mjs',[
  'const unrelated = 1;',
  'eval("global");',
  'Function("return 1");',
  'new Function("return 2");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST001').map(x=>x.line),[2]);
 assert.deepEqual(has(r,'AST002').map(x=>x.line),[3,4]);
});

test('B5 explicit globalThis eval and Function calls remain detected despite shadowed short names',()=>{
 const r=analyzeAST('global-builtins.cjs',[
  'function local(eval, Function){',
  ' eval("local");',
  ' Function("local");',
  ' globalThis.eval("global");',
  ' globalThis["Function"]("return 1");',
  ' new globalThis.Function("return 2");',
  '}'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST001').map(x=>x.line),[4]);
 assert.deepEqual(has(r,'AST002').map(x=>x.line),[5,6]);
});
test('B5 shadowed globalThis does not impersonate the global eval or Function',()=>{
 const r=analyzeAST('local-builtins.mjs',[
  'function local(globalThis){',
  ' globalThis.eval("local");',
  ' globalThis.Function("local");',
  ' new globalThis.Function("local");',
  '}',
  'globalThis.eval("global");',
  'new globalThis.Function("global");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST001').map(x=>x.line),[6]);
 assert.deepEqual(has(r,'AST002').map(x=>x.line),[7]);
});

test('B6 immutable aliases resolve exactly one additional hop',()=>{
 const r=analyzeAST('alias-chain.mjs',[
  'const first = globalThis.document;',
  'const second = first;',
  'second.write("known origin");',
  'const store = globalThis.localStorage;',
  'const next = store;',
  'next.clear();',
  'const third = second;',
  'third.write("too deep to confirm");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[6]);
});
test('B6 never infers chains through mutable or shadowed sources',()=>{
 const r=analyzeAST('unknown-chain.mjs',[
  'let mutable = globalThis.document;',
  'const alias = mutable;',
  'alias.write("unknown");',
  'function f(globalThis){',
  ' const one = globalThis.document;',
  ' const two = one;',
  ' two.write("local");',
  '}'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});
test('B6 alias chains respect declaration order and lexical shadowing',()=>{
 const r=analyzeAST('ordered-chain.mjs',[
  'const first = globalThis.document;',
  'second.write("before declaration");',
  'const second = first;',
  'second.write("after declaration");',
  '{const second = {write(){}}; second.write("local");}'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});

test('C1 explicit method reassignment invalidates later known document alias calls',()=>{
 const r=analyzeAST('mutated-document.mjs',[
  'const doc = globalThis.document;',
  'doc.write("known original method");',
  'doc.write = () => {};',
  'doc.write("method changed");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[2]);
});
test('C1 explicit storage clear reassignment stops confirmed alias-method warning',()=>{
 const r=analyzeAST('mutated-storage.mjs',[
  'const store = globalThis.localStorage;',
  'store.clear();',
  'store["clear"] = () => {};',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[2]);
});
test('C1 unrelated property writes do not invalidate a known alias method',()=>{
 const r=analyzeAST('unrelated-property.mjs',[
  'const doc = globalThis.document;',
  'doc.title = "changed";',
  'doc.write("still considered known");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
});

test('C2 conditional mutation cannot erase the potential warning after a branch',()=>{
 const r=analyzeAST('branch.mjs',[
  'const doc = globalThis.document;',
  'if (unknown) { doc.write = () => {}; }',
  'doc.write("may still be original");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
});
test('C2 loop and exception-path writes do not globally invalidate alias origin',()=>{
 const r=analyzeAST('paths.mjs',[
  'const doc = globalThis.document;',
  'while (unknown) { doc.write = () => {}; }',
  'try { doc.write = () => {}; } catch(error) {}',
  'doc.write("possible original");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});
test('C2 defining a function does not execute its alias mutation',()=>{
 const r=analyzeAST('deferred.mjs',[
  'const store = globalThis.localStorage;',
  'function later() { store.clear = () => {}; }',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[3]);
});
test('C2 straight-line reassignment still invalidates known alias calls',()=>{
 const r=analyzeAST('straight.mjs',[
  'const doc = globalThis.document;',
  '{ doc.write = () => {}; }',
  'doc.write("changed");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});

test('C3 direct method write invalidates sibling aliases of the same known object',()=>{
 const r=analyzeAST('sibling-aliases.mjs',[
  'const first = globalThis.document;',
  'const second = first;',
  'first.write("original");',
  'second.write = () => {};',
  'first.write("replaced");',
  'second.write("replaced");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 // The first call to the replacement may itself restore a built-in method.
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3,6]);
});
test('C3 storage method mutation propagates across distinct direct aliases',()=>{
 const r=analyzeAST('storage-aliases.mjs',[
  'const first = globalThis.localStorage;',
  'const second = localStorage;',
  'first.clear();',
  'second.clear = () => {};',
  'first.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[3]);
});
test('C3 uncertain branch mutations preserve possible findings across aliases',()=>{
 const r=analyzeAST('branch-aliases.mjs',[
  'const first = globalThis.document;',
  'const second = first;',
  'if (unknown) second.write = () => {};',
  'first.write("possibly original");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});
test('C3 a different object origin and unrelated property mutation are unaffected',()=>{
 const r=analyzeAST('separate-origins.mjs',[
  'const doc = globalThis.document;',
  'const store = globalThis.localStorage;',
  'doc.write = () => {};',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[4]);
});

test('C4 both simple if-else arms definitely replace the same method',()=>{
 const r=analyzeAST('joined.mjs',[
  'const doc = globalThis.document;',
  'const copy = doc;',
  'if (flag) { doc.write = () => {}; } else { copy.write = () => {}; }',
  'doc.write("replaced on either path");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});
test('C4 one-armed possible overwrite keeps a finding with reduced confidence',()=>{
 const r=analyzeAST('maybe.mjs',[
  'const doc = globalThis.document;',
  'if (flag) doc.write = () => {};',
  'doc.write("could still be original");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
 assert.equal(has(r,'AST005')[0].confidence,'medium');
});
test('C4 two distinct targets cannot be merged into a guaranteed overwrite',()=>{
 const r=analyzeAST('mixed.mjs',[
  'const doc = globalThis.document;',
  'const store = globalThis.localStorage;',
  'if (flag) { doc.write = () => {}; } else { store.clear = () => {}; }',
  'doc.write("maybe original");',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[5]);
 assert.equal(has(r,'AST004')[0].confidence,'medium');
});
test('C4 complex branch bodies are not treated as proven writes',()=>{
 const r=analyzeAST('complex.mjs',[
  'const doc = globalThis.document;',
  'if(flag){ sideEffect(); doc.write = () => {}; } else { doc.write = () => {}; }',
  'doc.write("not proven replaced");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
});

test('C5 self-assignment must not suppress subsequent document warning',()=>{
 const r=analyzeAST('self.mjs',[
  'const doc = globalThis.document;',
  'doc.write = doc.write;',
  'doc.write("still original");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
});
test('C5 unknown assignment origin cannot prove method replacement',()=>{
 const r=analyzeAST('unknown-replacement.mjs',[
  'const store = globalThis.localStorage;',
  'store.clear = maybeMethod;',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[3]);
});
test('C5 both if arms must prove a fresh replacement before joining',()=>{
 const r=analyzeAST('nonproof-join.mjs',[
  'const doc = globalThis.document;',
  'if(flag) doc.write = doc.write; else doc.write = () => {};',
  'doc.write("could still be original");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
});
test('C5 proven fresh function assignments still invalidate in straight line and both arms',()=>{
 const straight=analyzeAST('fresh.mjs',[
  'const doc=globalThis.document;',
  'doc.write = function(){};',
  'doc.write("replaced");'
 ].join('\n'));
 assert.equal(straight.parsed,true);
 assert.equal(has(straight,'AST005').length,0);
 const joined=analyzeAST('fresh-join.mjs',[
  'const doc=globalThis.document;',
  'if(flag){doc.write=()=>{};}else{doc.write=function(){};}',
  'doc.write("replaced");'
 ].join('\n'));
 assert.equal(joined.parsed,true);
 assert.equal(has(joined,'AST005').length,0);
});

test('C6 intervening unknown call revokes prior method replacement certainty',()=>{
 const r=analyzeAST('call-barrier.mjs',[
  'const doc = globalThis.document;',
  'doc.write = () => {};',
  'unknownCallback();',
  'doc.write("could be restored");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});
test('C6 constructor side effects revoke method replacement certainty',()=>{
 const r=analyzeAST('constructor-barrier.mjs',[
  'const store = globalThis.localStorage;',
  'store.clear = () => {};',
  'new UnknownClass();',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[4]);
});
test('C6 mere function declaration does not revoke straight-line replacement',()=>{
 const r=analyzeAST('deferred-barrier.mjs',[
  'const doc = globalThis.document;',
  'doc.write = () => {};',
  'function later(){ unknownCallback(); }',
  'doc.write("still locally replaced");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});
test('C6 unknown calls before a proven replacement do not invalidate its later effect',()=>{
 const r=analyzeAST('barrier-order.mjs',[
  'const doc = globalThis.document;',
  'unknownCallback();',
  'doc.write = () => {};',
  'doc.write("replaced afterward");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});

test('C7 top-level await revokes previous method replacement certainty',()=>{
 const r=analyzeAST('await-state.mjs',[
  'const doc = globalThis.document;',
  'doc.write = () => {};',
  'await pending;',
  'doc.write("could be restored during suspension");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});
test('C7 await before a fresh method replacement does not cancel later certainty',()=>{
 const r=analyzeAST('await-then-replace.mjs',[
  'const store = globalThis.localStorage;',
  'await pending;',
  'store.clear = () => {};',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST004').length,0);
});
test('C7 top-level await in a separate block revokes outer known-method state',()=>{
 const r=analyzeAST('await-block.mjs',[
  'const doc = globalThis.document;',
  'doc.write = () => {};',
  '{ await pending; }',
  'doc.write("possibly restored");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});
test('C7 inert async function declaration does not suspend the enclosing execution',()=>{
 const r=analyzeAST('deferred-await.mjs',[
  'const doc = globalThis.document;',
  'doc.write = () => {};',
  'async function later(){ await pending; }',
  'doc.write("still replaced without calling later");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});

test('C8 side-effecting argument executes before the outer aliased method',()=>{
 const r=analyzeAST('argument-order.mjs',[
  'const doc = globalThis.document;',
  'doc.write = () => {};',
  'doc.write(unknownCallback());'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[3]);
});
test('C8 nested argument expressions may restore storage method before invocation',()=>{
 const r=analyzeAST('nested-argument.mjs',[
  'const store = globalThis.localStorage;',
  'store.clear = () => {};',
  'store.clear([0, sideEffect()].length);'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[3]);
});
test('C8 passing an inert closure must not imply executing its body',()=>{
 const r=analyzeAST('closure-argument.mjs',[
  'const doc = globalThis.document;',
  'doc.write = () => {};',
  'doc.write(() => unknownCallback());'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});
test('C8 simple pure arguments retain the straight-line replacement result',()=>{
 const r=analyzeAST('pure-arguments.mjs',[
  'const doc = globalThis.document;',
  'doc.write = () => {};',
  'doc.write(1, "hello", true);'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});

test('C9 condition is evaluated before a two-arm method replacement is joined',()=>{
 const r=analyzeAST('join-order.mjs',[
  'const doc = globalThis.document;',
  'if(doc.write("condition")) doc.write = () => {}; else doc.write = () => {};',
  'doc.write("method replaced after condition");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[2]);
});
test('C9 nested right-hand call occurs before the assignment takes effect',()=>{
 const r=analyzeAST('assignment-order.mjs',[
  'const doc = globalThis.document;',
  'doc.write = (doc.write("original"), () => {});',
  'doc.write("unproven replacement");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[2,3]);
});
test('C9 side-effectful branch condition does not undo certain assignments in both arms',()=>{
 const r=analyzeAST('conditional-effects.mjs',[
  'const store = globalThis.localStorage;',
  'if(unknownCallback()) store.clear = () => {}; else store.clear = function(){};',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST004').length,0);
});
test('C9 straightforward statement order remains intact across multiple replacements',()=>{
 const r=analyzeAST('sequential.mjs',[
  'const doc = globalThis.document;',
  'doc.write("original");',
  'doc.write = () => {};',
  'doc.write("replaced");',
  'unknownCallback();',
  'doc.write("possibly restored");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[2,6]);
});

test('C10 delete revokes a previously confirmed method replacement',()=>{
 const r=analyzeAST('deleted-method.mjs',[
  'const doc=globalThis.document;',
  'doc.write=()=>{};',
  'delete doc.write;',
  'doc.write("may resolve differently");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});
test('C10 unknown replacement value invalidates earlier certainty',()=>{
 const r=analyzeAST('unknown-value.mjs',[
  'const store=globalThis.localStorage;',
  'store.clear=()=>{};',
  'store.clear=maybeClear;',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[4]);
});
test('C10 compound or update writes invalidate known methods across aliases',()=>{
 const r=analyzeAST('compound-update.mjs',[
  'const doc=globalThis.document;',
  'const copy=doc;',
  'copy.write=()=>{};',
  'doc.write+=suffix;',
  'copy.write("maybe changed");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[5]);
});
test('C10 unrelated mutations do not revoke confirmed method replacement',()=>{
 const r=analyzeAST('unrelated-mutation.mjs',[
  'const doc=globalThis.document;',
  'doc.write=()=>{};',
  'delete doc.title;',
  'doc.write("known replacement");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});

test('C11 effectful optional if path revokes earlier known replacement',()=>{
 const r=analyzeAST('audit-if.mjs',[
  'const doc=globalThis.document;',
  'doc.write=()=>{};',
  'if(flag){unknownCallback();}',
  'doc.write("possibly restored");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});
test('C11 loops and try paths cannot retain stale replacement certainty',()=>{
 const r=analyzeAST('audit-loops.mjs',[
  'const doc=globalThis.document;',
  'doc.write=()=>{};',
  'while(flag){unknownCallback();}',
  'doc.write("possibly restored");',
  'doc.write=()=>{};',
  'try{unknownCallback();}catch(err){}',
  'doc.write("possibly restored again");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4,7]);
});
test('C11 logical short circuit may execute state-changing callback',()=>{
 const r=analyzeAST('audit-short-circuit.mjs',[
  'const store=globalThis.localStorage;',
  'store.clear=()=>{};',
  'flag && unknownCallback();',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[4]);
});
test('C11 inert branch and deferred closure leave proven state unchanged',()=>{
 const r=analyzeAST('audit-inert.mjs',[
  'const doc=globalThis.document;',
  'doc.write=()=>{};',
  'if(flag){const noop=()=>unknownCallback();}',
  'doc.write("still replaced");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});
test('C11 two proven branch replacements still establish state after a side effect',()=>{
 const r=analyzeAST('audit-rejoin.mjs',[
  'const doc=globalThis.document;',
  'doc.write=()=>{};',
  'if(unknownCallback()){doc.write=()=>{};}else{doc.write=function(){}}',
  'doc.write("replaced on both paths");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.equal(has(r,'AST005').length,0);
});

test('C12 original, replaced and uncertain states remain separate per object origin',()=>{
 const r=analyzeAST('state-per-origin.mjs',[
  'const doc=globalThis.document;',
  'const store=globalThis.localStorage;',
  'doc.write=()=>{};',
  'store.clear();',
  'doc.write("still replaced");',
  'store.clear=()=>{};',
  'doc.write=unknown;',
  'doc.write("uncertain");',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 // Calling store.clear() is itself a C6 side-effect barrier for both origins.
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[5,8]);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[4,9]);
});
test('C12 subsequent proven replacement restores certainty after unknown mutation',()=>{
 const r=analyzeAST('state-reestablish.mjs',[
  'const doc=globalThis.document;',
  'doc.write=()=>{};',
  'delete doc.write;',
  'doc.write("unknown");',
  'doc.write=()=>{};',
  'doc.write("replaced again");'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST005').map(x=>x.line),[4]);
});
test('C12 possible branch state affects confidence without claiming replacement',()=>{
 const r=analyzeAST('state-possible.mjs',[
  'const store=globalThis.localStorage;',
  'if(flag) store.clear=()=>{};',
  'store.clear();'
 ].join('\n'));
 assert.equal(r.parsed,true);
 assert.deepEqual(has(r,'AST004').map(x=>x.line),[3]);
 assert.equal(has(r,'AST004')[0].confidence,'medium');
});
