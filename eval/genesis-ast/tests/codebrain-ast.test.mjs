import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const blobHash=source=>createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
import {analyzeAST} from '../analyzer.mjs';
import {inspect,render} from '../../../.github/scripts/neryx-codebrain.mjs';
const SHA='b'.repeat(40);
function mock(source){
 return async url=>{
  const data=url.endsWith('/pulls/97')?{state:'open',base:{ref:'main'},head:{sha:SHA},changed_files:1}:
   url.includes('/files?')?[{filename:'example.mjs',status:'added',sha:blobHash(source)}]:
   url.includes('/git/blobs/')?{encoding:'base64',size:Buffer.byteLength(source),content:Buffer.from(source).toString('base64')}:null;
  if(!data)throw Error('Unexpected URL');
  return {ok:true,json:async()=>data};
 };
}
test('CodeBrain invokes real Acorn AST without running analyzed code',async()=>{
 globalThis.neryxAstRunProbe=0;
 const source='export const x = 1; eval("globalThis.neryxAstRunProbe=42");';
 const r=await inspect({repo:'example/repo',number:97,token:'fake-key',request:mock(source),ast:analyzeAST});
 assert.equal(r.complete,true);
 assert.equal(r.rows[0].reason,'ast');
 assert.ok(r.rows[0].findings.some(f=>f.rule==='AST001'));
 assert.equal(globalThis.neryxAstRunProbe,0);
 assert.doesNotMatch(render(r),/fake-key|globalThis\.neryxAstRunProbe/);
 delete globalThis.neryxAstRunProbe;
});
test('real AST syntax failure is reported without raw source',async()=>{
 const r=await inspect({repo:'example/repo',number:97,token:'fake-key',request:mock('export const x = ;'),ast:analyzeAST});
 assert.equal(r.complete,true);
 assert.equal(r.rows[0].findings[0].rule,'AST000');
 assert.equal(r.rows[0].findings[0].kind,'confirmed');
 assert.match(render(r),/bestätigter Syntaxfehler/);
 assert.doesNotMatch(render(r),/export const x/);
});

test('ambiguous JS dialect rejection is incomplete and not a confirmed syntax error',async()=>{
 const {astWorkerDefault}=await import('../../../.github/scripts/neryx-codebrain.mjs');
 const {createHash}=await import('node:crypto');
 for(const [source,accepted] of [['const view = <div />;',false],['return;',true]]){
  const bytes=Buffer.from(source),sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  const head='a'.repeat(40);
  const r=await inspect({repo:'example/repo',number:94,anonymous:true,ast:astWorkerDefault,request:async url=>({ok:true,json:async()=>url.endsWith('/pulls/94')?{state:'open',base:{ref:'main'},head:{sha:head},changed_files:1}:url.includes('/files?')?[{filename:'example.js',status:'modified',sha}]:{sha,encoding:'base64',size:bytes.length,content:bytes.toString('base64')}})});
  assert.equal(r.complete,accepted);
  assert.equal(r.blocking,false);
  if(!accepted){assert.equal(r.rows[0].reason,'ambiguous-js-parser-rejection');assert.equal(r.rows[0].findings[0].kind,'heuristic');}
 }
});

// Public calibration corpus, not an independent or secret holdout.
// Score case/rule presence, not general vulnerability detection.
test('NERYX fixed calibration corpus reports per-rule precision and recall',async()=>{
 const {analyzeAST}=await import('../analyzer.mjs');
 const rules=['AST001','AST002','AST003','AST004','AST005','AST007'];
 const cases=[
  ['eval-direct','eval(input);',['AST001']],
  ['eval-global','globalThis.eval(input);',['AST001']],
  ['eval-shadow','function f(eval){ eval(input); }',[],'fixture.cjs'],
  ['eval-text','const s="eval(input)";',[]],
  ['function-direct','Function(input);',['AST002']],
  ['function-new','new Function(input);',['AST002']],
  ['function-local','function f(Function){ Function(input); }',[]],
  ['html-write','node.innerHTML = input;',['AST003']],
  ['html-computed','node["innerHTML"] = input;',['AST003']],
  ['html-read','const x = node.innerHTML;',[]],
  ['html-safe','node.textContent = input;',[]],
  ['storage-direct','localStorage.clear();',['AST004']],
  ['storage-alias','const s=localStorage; s.clear();',['AST004']],
  ['storage-global','globalThis.localStorage.clear();',['AST004']],
  ['storage-shadow','function f(localStorage){ localStorage.clear(); }',[]],
  ['storage-safe','localStorage.removeItem("own-key");',[]],
  ['document-direct','document.write(input);',['AST005']],
  ['document-alias','const d=document; d.write(input);',['AST005']],
  ['document-shadow','function f(document){ document.write(input); }',[]],
  ['document-text','const s="document.write(input)";',[]],
  ['import-variable','import(name);',['AST007']],
  ['import-literal','import("./known.mjs");',[]],
  ['combined','eval(input); node.innerHTML=input; localStorage.clear();',['AST001','AST003','AST004']],
  ['plain','const value=42; export {value};',[]]
 ];
 const counts=Object.fromEntries(rules.map(rule=>[rule,{tp:0,fp:0,fn:0,tn:0}]));
 const misses=[];
 for(const [id,source,expected,file='fixture.mjs'] of cases){
  const result=analyzeAST(file,source);
  assert.equal(result.parsed,true,id);
  const actual=new Set(result.findings.map(f=>f.rule));
  for(const rule of rules){
   const want=expected.includes(rule),got=actual.has(rule);
   counts[rule][want?(got?'tp':'fn'):(got?'fp':'tn')]++;
   if(want!==got)misses.push({id,rule,type:want?'FN':'FP'});
  }
 }
 const metric=c=>({...c,precision:c.tp+c.fp?c.tp/(c.tp+c.fp):null,recall:c.tp+c.fn?c.tp/(c.tp+c.fn):null});
 const total={tp:0,fp:0,fn:0,tn:0};
 for(const c of Object.values(counts))for(const k of Object.keys(total))total[k]+=c[k];
 assert.equal(Object.values(total).reduce((a,b)=>a+b,0),cases.length*rules.length);
 console.log('NERYX_CALIBRATION '+JSON.stringify({schema:'neryx.calibration.v1',independent:false,scope:'CASE_RULE_PRESENCE',cases:cases.length,rules:Object.fromEntries(rules.map(r=>[r,metric(counts[r])])),micro:metric(total),misses}));
});


// Diagnostic challenge: fixed expected semantics, not a blind holdout.
// Synthetic source is parsed only. Rule presence is not exploitability.
test('NERYX challenge v1 measures indirect access and scope limitations',()=>{
 const cases=[
  ['indirect-eval','const f=eval; f(input);','AST001',true],
  ['sequence-eval','(0,eval)(input);','AST001',true],
  ['eval-shadow','function f(eval){ return eval(input); }','AST001',false,'fixture.cjs'],
  ['global-shadow','function f(globalThis){ globalThis.eval(input); }','AST001',false],
  ['function-alias','const F=Function; new F(input);','AST002',true],
  ['function-shadow','function f(Function){ return new Function(input); }','AST002',false],
  ['html-computed-constant','const key="innerHTML"; node[key]=input;','AST003',true],
  ['html-concat','node["inner"+"HTML"]=input;','AST003',true],
  ['html-read','const v=node["innerHTML"];','AST003',false],
  ['html-text','node["textContent"]=input;','AST003',false],
  ['storage-destructure','const {clear}=localStorage; clear.call(localStorage);','AST004',true],
  ['storage-chain','const a=localStorage; const b=a; const c=b; c.clear();','AST004',true],
  ['storage-bound','const f=localStorage.clear.bind(localStorage); f();','AST004',true],
  ['storage-shadow-block','{ const localStorage={clear(){}}; localStorage.clear(); }','AST004',false],
  ['storage-comment','// localStorage.clear()\nconst x=1;','AST004',false],
  ['document-conditional','const d=document; if(flag)d.write=()=>{}; d.write(input);','AST005',true],
  ['document-replaced','const d=document; d.write=()=>{}; d.write(input);','AST005',false],
  ['document-bound','const f=document.write.bind(document); f(input);','AST005',true],
  ['document-destructure','const {write}=document; write.call(document,input);','AST005',true],
  ['document-shadow','function f(document){ const d=document; d.write(input); }','AST005',false],
  ['document-global-shadow','function f(globalThis){ globalThis.document.write(input); }','AST005',false],
  ['import-expression','import("./"+name);','AST007',true],
  ['import-literal','import("./known.mjs");','AST007',false],
  ['import-constant','const name="./known.mjs"; import(name);','AST007',true]
 ];
 const counts={tp:0,fp:0,fn:0,tn:0},misses=[],byRule={};
 for(const [id,source,rule,want,file='fixture.mjs'] of cases){
  const report=analyzeAST(file,source);
  assert.equal(report.parsed,true,id);
  const got=report.findings.some(f=>f.rule===rule);
  const k=want?(got?'tp':'fn'):(got?'fp':'tn');
  counts[k]++;
  byRule[rule]??={tp:0,fp:0,fn:0,tn:0};
  byRule[rule][k]++;
  if(want!==got)misses.push({id,rule,type:want?'FN':'FP'});
 }
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),cases.length);
 const metric=c=>({...c,precision:c.tp+c.fp?c.tp/(c.tp+c.fp):null,recall:c.tp+c.fn?c.tp/(c.tp+c.fn):null});
 console.log('NERYX_CHALLENGE '+JSON.stringify({schema:'neryx.challenge.v1',independent:false,scope:'TARGETED_CASE_RULE_PRESENCE',cases:cases.length,micro:metric(counts),rules:Object.fromEntries(Object.entries(byRule).map(([r,c])=>[r,metric(c)])),misses}));
});


test('immutable builtin references resolve without confusing shadowed or mutable bindings',()=>{
 const cases=[
  ['const f=eval; f(input);','AST001',true,'fixture.mjs'],
  ['(0,eval)(input);','AST001',true,'fixture.mjs'],
  ['const F=Function; new F(input);','AST002',true,'fixture.mjs'],
  ['const F=globalThis.Function; F(input);','AST002',true,'fixture.mjs'],
  ['const f=eval; const g=f; g(input);','AST001',true,'fixture.mjs'],
  ['function x(eval){const f=eval; f(input);}','AST001',false,'fixture.cjs'],
  ['function x(Function){const F=Function; new F(input);}','AST002',false,'fixture.mjs'],
  ['const f=eval; {const f=()=>{}; f(input);}','AST001',false,'fixture.mjs'],
  ['let f=eval; f=()=>{}; f(input);','AST001',false,'fixture.mjs'],
  ['const f=eval;','AST001',false,'fixture.mjs'],
  ['const f=eval; (f,()=>{})();','AST001',false,'fixture.mjs']
 ];
 for(const [source,rule,want,file] of cases){
  const r=analyzeAST(file,source);
  assert.equal(r.parsed,true,source);
  assert.equal(r.findings.some(f=>f.rule===rule),want,source);
 }
});
