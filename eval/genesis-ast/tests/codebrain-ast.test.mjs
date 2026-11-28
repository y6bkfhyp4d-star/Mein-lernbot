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


test('bounded constant property resolution detects HTML writes without executing expressions',()=>{
 const cases=[
  ['const key="innerHTML"; node[key]=input;',true],
  ['node["inner"+"HTML"]=input;',true],
  ['const a="inner"; const b=a+"HTML"; node[b]=input;',true],
  ['const key="innerHTML"; {const key="textContent"; node[key]=input;}',false],
  ['let key="innerHTML"; key="textContent"; node[key]=input;',false],
  ['const key="textContent"; node[key]=input;',false],
  ['const key="innerHTML"; const x=node[key];',false],
  ['node[unknown()]=input;',false],
  ['const key="innerHTML"; function f(key){node[key]=input;}',false],
  ['node["inner"+1]=input;',false]
 ];
 for(const [source,want] of cases){
  const r=analyzeAST('fixture.mjs',source);
  assert.equal(r.parsed,true,source);
  assert.equal(r.findings.some(f=>f.rule==='AST003'),want,source);
 }
});


test('bounded object alias chains preserve scope and replacement constraints',()=>{
 const cases=[
  ['const a=localStorage; const b=a; const c=b; c.clear();','AST004',true],
  ['const a=document; const b=a; const c=b; const d=c; const e=d; e.write(input);','AST005',true],
  ['const a=document; const b=a; const c=b; const d=c; const e=d; const f=e; f.write(input);','AST005',false],
  ['let a=document; const b=a; const c=b; c.write(input);','AST005',false],
  ['const a=document; const b=a; const c=b; {const c={write(){}}; c.write(input);}','AST005',false],
  ['const a=localStorage; const b=a; const c=b; a.clear=()=>{}; c.clear();','AST004',false],
  ['const a=localStorage; const b=a; const c=b; if(flag)a.clear=()=>{}; c.clear();','AST004',true],
  ['const a=document; const b=a; c.write(input); const c=b;','AST005',false]
 ];
 for(const [source,rule,want] of cases){
  const r=analyzeAST('fixture.mjs',source);
  assert.equal(r.parsed,true,source);
  assert.equal(r.findings.some(f=>f.rule===rule),want,source);
 }
});


test('immutable destructured method capture preserves origin and capture-time replacement',()=>{
 const cases=[
  ['const {clear}=localStorage; clear.call(localStorage);','AST004',true],
  ['const {write}=document; write.call(document,input);','AST005',true],
  ['const d=document; const {write:w}=d; w.apply(d,[input]);','AST005',true],
  ['const d=document; const {write:w}=d; d.write=()=>{}; w.call(d,input);','AST005',true],
  ['const d=document; d.write=()=>{}; const {write:w}=d; w.call(d,input);','AST005',false],
  ['const {write}=document;','AST005',false],
  ['const {write}=document; {const write=()=>{}; write(input);}','AST005',false],
  ['const document={write(){}}; const {write}=document; write.call(document,input);','AST005',false],
  ['const {write=()=>{}}=document; write.call(document,input);','AST005',false],
  ['const {["write"]:w}=document; w.call(document,input);','AST005',false],
  ['const {clear:c}=localStorage; const f=c; f.call(localStorage);','AST004',true]
 ];
 for(const [source,rule,want] of cases){
  const r=analyzeAST('fixture.mjs',source);
  assert.equal(r.parsed,true,source);
  assert.equal(r.findings.some(f=>f.rule===rule),want,source);
 }
});


// Hardening regression tests (consolidated without changing test bodies).
import {version as hardeningAcornVersion} from 'acorn';
assert.equal(hardeningAcornVersion,'8.15.0');

test('browser globals',()=>{
const rules=s=>[...new Set(analyzeAST('fixture.js',s).findings.map(f=>f.rule))];
let n=0;
for(const g of ['window','self','globalThis']) for(const [expr,rule] of [['eval("1")','AST001'],['Function("return 1")','AST002'],['document.write(x)','AST005'],['localStorage.clear()','AST004']]){
 assert.deepEqual(rules(`${g}.${expr};`),[rule]);n++;
 assert.deepEqual(rules(`function f(${g}){ ${g}.${expr}; }`),[]);n++;
 assert.deepEqual(rules(`{ const ${g} = {}; ${g}.${expr}; }`),[]);n++;
}
for(const g of ['window','self']) for(const [member,method,rule] of [['document','write(x)','AST005'],['localStorage','clear()','AST004']]){
 assert.deepEqual(rules(`const d=${g}["${member}"]; d.${method};`),[rule]);n++;
 assert.deepEqual(rules(`const ${g}={}; const d=${g}["${member}"]; d.${method};`),[]);n++;
}
});

test('secret headers',()=>{
let n=0;
function check(source, expected){assert.equal(analyzeAST('fixture.js',source).findings.filter(x=>x.rule==='SEC001').length,expected,source);n++;}
for(const label of ['PRIVATE KEY','RSA PRIVATE KEY','EC PRIVATE KEY','OPENSSH PRIVATE KEY','DSA PRIVATE KEY','ENCRYPTED PRIVATE KEY','PGP PRIVATE KEY BLOCK']){
 const header=`-----BEGIN ${label}-----`;
 check(`const x=${JSON.stringify(header)};`,1);
 check(`// ${header}\nconst x=1;`,1);
 check(`/* ${header} */`,1);
 check(`const x=\`${header}\`;`,1);
 check(`const x=${JSON.stringify(header+'\n'+header)};`,2);
 check(`const x=${JSON.stringify(header.replace('BEGIN','END'))};`,0);
}
for(const label of ['PUBLIC KEY','RSA PUBLIC KEY','PGP PUBLIC KEY BLOCK','PGP MESSAGE','CERTIFICATE','CERTIFICATE REQUEST','EC PARAMETERS','FAKE PRIVATE KEY','PGP PRIVATE KEY','PRIVATE KEY BLOCK','DSA PUBLIC KEY','private key']) check(`const x="-----BEGIN ${label}-----";`,0);
const findings=analyzeAST('fixture.js','// placeholder\n// -----BEGIN DSA PRIVATE KEY-----').findings;assert.equal(findings[0].line,2);assert.equal(findings[0].column,4);n++;
});

test('invalid syntax and secret headers',()=>{
let n=0;
for(const file of ['fixture.js','fixture.cjs','fixture.mjs']) for(const sep of ['\n','\r\n','\r','\u2028','\u2029']){
 const src='// synthetic'+sep+'// -----BEGIN DSA PRIVATE KEY-----'+sep+'const x = ;';
 const r=analyzeAST(file,src);assert.equal(r.parsed,false);assert.deepEqual(r.findings.map(f=>f.rule),['SEC001','AST000']);assert.equal(r.findings[0].line,2);assert.equal(r.findings[0].column,4);assert.deepEqual(r.calls,[]);n++;
 const neg=analyzeAST(file,'// -----BEGIN PUBLIC KEY-----'+sep+'const x = ;');assert.deepEqual(neg.findings.map(f=>f.rule),['AST000']);n++;
}
});

test('global rebinding',()=>{
let n=0;
for(const [obj,method,rule] of [['document','write','AST005'],['localStorage','clear','AST004']]){
 const check=(source,expected)=>{assert.equal(analyzeAST('fixture.js',source).findings.some(f=>f.rule===rule),expected,source);n++;};
 const prefix=`const a=${obj}; a.${method}=()=>{}; `;
 check(prefix+`a.${method}();`,false);
 for(const g of ['globalThis','window','self']){
  check(prefix+`${g}.${obj}=other; const b=${g}.${obj}; b.${method}();`,true);
  check(prefix+`${g}[key]=other; a.${method}();`,true);
  check(prefix+`${g}=other; a.${method}();`,true);
  check(`function f(${g}){${g}.${obj}.${method}();}`,false);
 }
 check(prefix+`${obj}=other; const b=${obj}; b.${method}();`,true);
 check(prefix+`delete globalThis.${obj}; a.${method}();`,true);
 check(prefix+`if(flag)globalThis.${obj}=other; a.${method}();`,true);
 check(`${obj}=other; ${obj}.${method}();`,true);
}
});

test('named class expression scope',()=>{
 for(const g of ['window','self','globalThis']) for(const [expr,rule] of [['eval(input)','AST001'],['Function(input)','AST002'],['document.write(input)','AST005'],['localStorage.clear()','AST004']]){
  const rules=source=>analyzeAST('fixture.js',source).findings.map(f=>f.rule);
  assert.deepEqual(rules(`const C=class ${g}{method(){${g}.${expr};}};`),[]);
  assert.deepEqual(rules(`const C=class Other{method(){${g}.${expr};}};`),[rule]);
  assert.deepEqual(rules(`const C=class ${g}{}; ${g}.${expr};`),[rule]);
 }
});

// NERYX follow-up regression suites (known synthetic cases, not independent holdout).

test('NERYX follow-up: test-destructuring',()=>{
let count=0;
function check(s,w){assert.deepEqual([...new Set(analyzeAST('fixture.cjs',s).findings.map(f=>f.rule))].sort(),w,s);count++;}
for(const g of ['globalThis','window','self']) for(const [name,call,rule] of [['eval','a(input)','AST001'],['Function','new a(input)','AST002'],['localStorage','a.clear()','AST004'],['document','a.write(input)','AST005']]){
 check(`const {${name}:a}=${g}; ${call};`,[rule]);
 check(`function f(${g}){const {${name}:a}=${g}; ${call};}`,[]);
 check(`const {${name}:a}=other; ${call};`,[]);
 check(`let {${name}:a}=${g}; ${call};`,[]);
 check(`const {${name}:a=other}=${g}; ${call};`,[]);
 check(`const {["${name}"]:a}=${g}; ${call};`,[]);
 check(`const {${name}:a}=${g}; function f(a){${call};}`,[]);
 check(`${call}; const {${name}:a}=${g};`,[]);
}
});

test('NERYX follow-up: test-global',()=>{
let count=0;
function check(s,w,file){const r=analyzeAST(file,s);assert.equal(r.parsed,true,s);assert.deepEqual([...new Set(r.findings.map(f=>f.rule))].sort(),w,s);count++;}
for(const file of ['fixture.cjs','fixture.mjs','fixture.js'])for(const [name,tail,aliasCall,rule] of [['eval','(input)','a(input)','AST001'],['Function','(input)','new a(input)','AST002'],['localStorage','.clear()','a.clear()','AST004'],['document','.write(input)','a.write(input)','AST005']]){
check(`global.${name}${tail};`,[rule],file);
check(`global[\`${name}\`]${tail};`,[rule],file);
check(`const a=global.${name}; ${aliasCall};`,[rule],file);
check(`const {${name}:a}=global; ${aliasCall};`,[rule],file);
check(`function f(global){global.${name}${tail};}`,[],file);
check(`const global={}; global.${name}${tail};`,[],file);
check(`function f(global){const {${name}:a}=global; ${aliasCall};}`,[],file);
check(`function f(){global.${name}${tail}; const global={};}`,[],file);
}
for(const file of ['fixture.cjs','fixture.mjs','fixture.js']){
check('document.write=()=>{}; global=other; document.write(input);',['AST005'],file);
check('localStorage.clear=()=>{}; globalThis.global=other; localStorage.clear();',['AST004'],file);
}
});

test('NERYX follow-up: test-identity',()=>{
const rows=[];
for(const [obj,method,rule] of [['localStorage','clear','AST004'],['document','write','AST005']]){
 for(const global of ['globalThis','window','self','global']){
 for(const rebind of [`${global}.${obj}=other;`,`if(flag) ${global}.${obj}=other;`,`function swap(){${global}.${obj}=other;}`]){
 const source=`const s=${obj}; ${rebind} s.${method}=()=>{}; const t=${obj}; t.${method}(input);`;
 const run=f=>f('fixture.cjs',source).findings.some(x=>x.rule===rule);
 const actual=run(analyzeAST);assert.equal(actual,true,source);rows.push({source,rule,actual});
 }
 }
 const source=`const s=${obj}; s.${method}=()=>{}; s.${method}(input);`;
 assert.equal(analyzeAST('fixture.cjs',source).findings.some(x=>x.rule===rule),false);rows.push({source,rule,actual:false});
}
});

test('NERYX follow-up: test-origin',()=>{
let count=0;
function check(source,expected,file){const r=analyzeAST(file,source);assert.equal(r.parsed,true,source);assert.deepEqual([...new Set(r.findings.map(f=>f.rule))].sort(),expected,source);count++;}
for(const file of ['fixture.js','fixture.cjs','fixture.mjs']){
 for(const [name,method,rule] of [['localStorage','clear','AST004'],['document','write','AST005']]){
  for(const root of ['window.self','globalThis.window','self.globalThis','window[`self`]']){
   check(`${root}.${name}.${method}();`,[rule],file);
   check(`const x=${root}.${name}; x.${method}();`,[rule],file);
   check(`function f(${root.split(/[.\[]/)[0]}){${root}.${name}.${method}();}`,[],file);
  }
  check(`const x=globalThis.${name} ?? null; x?.${method}();`,[rule],file);
  check(`const x=globalThis.${name} ?? null; const y=x; y?.${method}();`,[rule],file);
  check(`function f(globalThis){const x=globalThis.${name} ?? null; x?.${method}();}`,[],file);
  check(`const x=other.${name} ?? null; x?.${method}();`,[],file);
  check(`const x=globalThis.${name} ?? null; function f(x){x?.${method}();}`,[],file);
  check(`other.self.${name}.${method}();`,[],file);
  check(`window[unknown].${name}.${method}();`,[],file);
  check(`window.other.${name}.${method}();`,[],file);
  check(`const x=globalThis.${name} ?? null; void x.${method};`,[],file);
  check(`const x=globalThis.${name} ?? null; x.other();`,[],file);
 }
}
});

test('NERYX follow-up: test-replacement',()=>{
const rows=[];
for(const file of ['fixture.js','fixture.cjs','fixture.mjs'])for(const [name,rule,call] of [['eval','AST001',x=>`${x}(input)`],['Function','AST002',x=>`new ${x}(input)`]]){
 const assignment=`globalThis.${name}=function(x){return x};`;
 for(const [source,confidence] of [
 [assignment+call(name),'medium'],[assignment+call(`globalThis.${name}`),'medium'],[assignment+`const a=globalThis.${name};`+call('a'),'medium'],[assignment+`const {${name}:a}=globalThis;`+call('a'),'medium'],[`const a=globalThis.${name};`+assignment+call('a'),'high'],[`if(flag){${assignment}}`+call(name),'high'],[assignment+'unknown();'+call(name),'high'],[assignment+`globalThis.${name}=other;`+call(name),'high'],[`function f(){${assignment}}`+call(name),'high'],[assignment+`const a=globalThis.${name};const b=a;`+call('b'),'medium']]){
  const r=analyzeAST(file,source);assert.equal(r.parsed,true,source);const found=r.findings.filter(x=>x.rule===rule);assert.equal(found.length,1,source);assert.equal(found[0].confidence,confidence,source);rows.push({file,source,rule,confidence});
 }
}
});

test('NERYX follow-up: test-targets',()=>{
let count=0;
const positive=[
'[el.innerHTML]=xs;',
'({html:el.innerHTML}=data);',
'({a:[,{b:el.innerHTML}]}=data);',
'[el.innerHTML=defaultValue]=xs;',
'[...el.innerHTML]=xs;',
'({...el.innerHTML}=data);',
'([el["innerHTML"]]=xs);',
'[el[`innerHTML`]]=xs;',
'const k="innerHTML"; [el[k]]=xs;',
'({a:el["inner"+"HTML"]}=data);',
'[el.innerHTML,other.innerHTML]=xs;',
'function f(){[el.innerHTML]=xs;}',
'el.innerHTML += x;',
'({[key]: el.innerHTML}=data);',
'[el.innerHTML = other.innerHTML]=xs;',
];
const negative=[
'const [x]=el.innerHTML;',
'const {innerHTML}=el;',
'({innerHTML:x}=data);',
'({[el.innerHTML]:x}=data);',
'[x=el.innerHTML]=xs;',
'[el[unknown]]=xs;',
'[el.innerHTMLCache]=xs;',
'[el.innerHTML.child]=xs;',
'[el[other.innerHTML]]=xs;',
'[,,x]=xs;',
'const k="innerHTMLCache"; [el[k]]=xs;',
'const x=[el.innerHTML];',
'({a:[x=el.innerHTML]}=data);',
'function f(k){[el[k]]=xs;}',
'const innerHTML="x"; let a; [a]=[innerHTML];',
];
for(const file of ['fixture.js','fixture.cjs','fixture.mjs']){
 for(const [cases,expected] of [[positive,['AST003']],[negative,[]]])for(const source of cases){
 const r=analyzeAST(file,source);assert.equal(r.parsed,true,source);assert.deepEqual([...new Set(r.findings.map(f=>f.rule))].sort(),expected,source);count++;
 }
 for(const [obj,method,rule] of [['document','write','AST005'],['localStorage','clear','AST004']]){
 const source=`const a=${obj}; a.${method}=()=>{}; [a.${method}]=xs; a.${method}();`;
 const r=analyzeAST(file,source);assert.equal(r.parsed,true);assert.ok(r.findings.some(f=>f.rule===rule),source);count++;
 }
}
});

test('NERYX follow-up: test-template',()=>{
let count=0;
function check(s,w){const r=analyzeAST('fixture.mjs',s);assert.equal(r.parsed,true,s);assert.deepEqual([...new Set(r.findings.map(f=>f.rule))].sort(),w,s);count++;}
for(const g of ['globalThis','window','self'])for(const [name,call,rule] of [['eval','(input)','AST001'],['Function','(input)','AST002'],['localStorage','[`clear`] ()','AST004'],['document','[`write`](input)','AST005']]){
 check(`${g}[\`${name}\`]${call};`,[rule]);
 check(`function f(${g}){${g}[\`${name}\`]${call};}`,[]);
 check(`${g}[\`other${name}\`]${call};`,[]);
 check(`${g}[\`\${key}\`]${call};`,[]);
}
for(const [obj,method,rule] of [['localStorage','clear','AST004'],['document','write','AST005']]){
 check(`${obj}[\`${method}\`](input);`,[rule]);
 check(`const a=${obj}; a[\`${method}\`](input);`,[rule]);
 check(`const ${obj}={}; ${obj}[\`${method}\`](input);`,[]);
 check(`${obj}[\`\${key}\`](input);`,[]);
 check(`${obj}[\`other\`](input);`,[]);
}
check('el[`innerHTML`]=input;',['AST003']);
check('el[`innerHTML`]+=input;',['AST003']);
check('el[`innerHTML`];',[]);
check('el[`innerHTMLCache`]=input;',[]);
check('el[`${key}`]=input;',[]);
check('el[`inner\\u0048TML`]=input;',['AST003']);
check('const k=`innerHTML`; el[k]=input;',['AST003']);
check('const k=`innerHTMLCache`; el[k]=input;',[]);
check('el[tag`innerHTML`]=input;',[]);
check('const t=`localStorage.clear()`;',[]);
});
