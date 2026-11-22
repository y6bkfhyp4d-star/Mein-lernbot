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
