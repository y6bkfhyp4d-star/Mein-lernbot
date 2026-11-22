import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildDependencyGraph,inspectDependencyFiles} from '../dependency-graph.mjs';

test('resolves imports and reexports with line positions',()=>{
  const g=buildDependencyGraph({
    'src/main.mjs':'import {x} from "./lib.mjs";\nexport {y} from "./other.mjs";\n',
    'src/lib.mjs':'export const x=1;',
    'src/other.mjs':'export const y=2;'
  });
  assert.equal(g.summary.resolved,2);
  assert.deepEqual(g.impact['src/lib.mjs'],['src/main.mjs']);
  assert.equal(g.edges.find(e=>e.kind==='reexport').line,2);
  assert.equal(g.changesApplied,false);
});
test('reports external, unknown and not-supplied without touching disk',()=>{
  const g=buildDependencyGraph({
    'src/main.mjs':'import pkg from "npm-package";\nimport "./missing.mjs";\nconst x=import(variable);'
  });
  assert.deepEqual(g.edges.map(e=>e.status).sort(),['external','not-supplied','unknown-dynamic']);
  assert.equal(g.summary.unresolved,2);
});
test('detects cycles including self-loop and potential reverse impacts',()=>{
  const g=buildDependencyGraph({
    'a.mjs':'import "./b.mjs";',
    'b.mjs':'import "./c.mjs";',
    'c.mjs':'import "./a.mjs";',
    'd.mjs':'import "./a.mjs";',
    'self.mjs':'import "./self.mjs";'
  });
  assert.deepEqual(g.cycles,[['a.mjs','b.mjs','c.mjs'],['self.mjs']]);
  assert.deepEqual(g.impact['c.mjs'],['a.mjs','b.mjs','d.mjs']);
  assert.deepEqual(g.impact['self.mjs'],[]);
});
test('does not interpret comment/string as imports and does see template dynamic literal',()=>{
  const g=buildDependencyGraph({
    'a.mjs':'// import "./fake.mjs";\nconst text="import x from y";\nconst load=import("./real.mjs");',
    'real.mjs':'export const ok=true;'
  });
  assert.equal(g.edges.length,1);
  assert.equal(g.edges[0].status,'resolved');
  assert.equal(g.edges[0].kind,'dynamic-literal');
});
test('handles parse errors explicitly, without pretending valid dependency coverage',()=>{
  const g=buildDependencyGraph({'bad.mjs':'import (','good.mjs':'export const ok=true;'});
  assert.equal(g.files.find(f=>f.file==='bad.mjs').parsed,false);
  assert.equal(g.edges.length,0);
  assert.equal(g.files.find(f=>f.file==='bad.mjs').parseError.line,1);
});
test('ambiguous extensionless references remain ambiguous',()=>{
  const g=buildDependencyGraph({'entry.mjs':'import "./util";','util.js':'export const x=1;','util.mjs':'export const y=2;'});
  assert.equal(g.edges[0].status,'ambiguous');
  assert.equal(g.edges[0].to,null);
});
test('local paths cannot leave declared root and external URLs are not fetched',()=>{
  const g=buildDependencyGraph({'entry.mjs':'import "../../outside.mjs";\nimport "https://example.org/remote.js";'});
  assert.equal(g.edges.find(e=>e.specifier.startsWith('../')).status,'out-of-root');
  assert.equal(g.edges.find(e=>e.specifier.startsWith('https:')).status,'external');
});
test('does not execute provided source code',()=>{
  globalThis.__genesisGraphProbe=0;
  buildDependencyGraph({'code.mjs':'globalThis.__genesisGraphProbe=777;\nexport const x=1;'});
  assert.equal(globalThis.__genesisGraphProbe,0);
  delete globalThis.__genesisGraphProbe;
});
test('explicit file reader rejects symlink escape and does not recursively load imports',()=>{
  const root=mkdtempSync(join(tmpdir(),'genesis-graph-'));
  const outside=mkdtempSync(join(tmpdir(),'genesis-other-'));
  try{
    writeFileSync(join(root,'one.mjs'),'import "./not-allowed.mjs";');
    writeFileSync(join(outside,'hidden.mjs'),'export const secret=1;');
    symlinkSync(join(outside,'hidden.mjs'),join(root,'escape.mjs'));
    const g=inspectDependencyFiles(['one.mjs'],{root});
    assert.equal(g.files.length,1);
    assert.equal(g.edges[0].status,'not-supplied');
    assert.throws(()=>inspectDependencyFiles(['escape.mjs'],{root}),/außerhalb/);
    assert.throws(()=>inspectDependencyFiles(['../nothing.mjs'],{root}));
  }finally{rmSync(root,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
});
