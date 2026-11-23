import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect,render} from '../../.github/scripts/neryx-codebrain.mjs';

const SHA='a'.repeat(40);
function mock(files,contents={},changed=files.length){
 const pr={state:'open',base:{ref:'main'},head:{sha:SHA},changed_files:changed};
 const request=async url=>{
  let data;
  if(url.endsWith('/pulls/94'))data=pr;
  else if(url.includes('/files?'))data=files;
  else if(url.includes('/git/blobs/')){
   const content=contents[url.split('/').at(-1)]??'const value = 1;';
   data={encoding:'base64',size:Buffer.byteLength(content),content:Buffer.from(content).toString('base64')};
  }else throw Error('unexpected URL');
  return {ok:true,json:async()=>data};
 };
 return {repo:'example/repo',number:94,token:'secret-never-print',request};
}
const entry=(file,sha=SHA)=>({filename:file,status:'modified',sha});
test('flags are heuristic and never show source or token',async()=>{
 const opts=mock([entry('a.js')],{[SHA]:'eval("PRIVATE-INPUT-DO-NOT-LOG")'});
 const result=await inspect(opts);
 assert.equal(result.complete,true);
 assert.equal(result.rows[0].findings[0].rule,'JS001');
 const text=render(result);
 assert.doesNotMatch(text,/PRIVATE-INPUT|secret-never-print/);
 assert.match(text,/heuristisch|Heuristischer|Heuristik/i);
});
test('source is never evaluated',async()=>{
 globalThis.codeBrainProbe=0;
 const opts=mock([entry('a.js')],{[SHA]:'globalThis.codeBrainProbe=5;'});
 await inspect(opts);
 assert.equal(globalThis.codeBrainProbe,0);
 delete globalThis.codeBrainProbe;
});
test('unsupported files and dangerous names make coverage incomplete',async()=>{
 const opts=mock([entry('readme.md'),entry('../attack.js'),entry('bad\n::error::hi.js')]);
 const r=await inspect(opts);
 assert.equal(r.complete,false);
 assert.equal(r.checked,0);
 assert.doesNotMatch(render(r),/::error::hi/);
});
test('ES module syntax is not incorrectly confirmed as error by vm.Script',async()=>{
 const opts=mock([entry('module.mjs')],{[SHA]:'export const x = 1;'});
 const r=await inspect(opts);
 assert.equal(r.rows[0].findings.filter(f=>f.rule==='JS000').length,0);
});
test('analyzer errors cannot pass as a clean check',async()=>{
 const opts=mock([entry('a.js')]);
 const r=await inspect({...opts,analyze:()=>{throw Error('API-KEY-DO-NOT-PRINT')}});
 assert.equal(r.complete,false);
 assert.equal(r.rows[0].status,'error');
 assert.doesNotMatch(render(r),/API-KEY/);
});
test('truncated API list must fail closed',async()=>{
 const opts=mock([entry('a.js')],{},2);
 await assert.rejects(()=>inspect(opts),/Unvollständige/);
});
test('no Gemini dependency; network failures are not concealed',async()=>{
 const opts=mock([entry('a.js')]);
 const r=await inspect(opts);
 assert.equal(r.complete,true);
 await assert.rejects(()=>inspect({...opts,request:async()=>({ok:false,status:503})}),/GitHub HTTP 503/);
});

test('truncated findings fail closed rather than claim full coverage',async()=>{
 const opts=mock([entry('a.js')]);
 const r=await inspect({...opts,analyze:()=>Array.from({length:41},()=>({rule:'JS001',line:1}))});
 assert.equal(r.complete,false);
 assert.equal(r.rows[0].status,'skipped');
 assert.equal(r.rows[0].reason,'findings-truncated');
 assert.match(render(r),/UNVOLLSTÄNDIG/);
});
test('markdown injection in PR filenames cannot forge headings or links',async()=>{
 const opts=mock([entry('[approved](https:evil).js'),entry('**all green**.js')]);
 const r=await inspect(opts);
 const report=render(r);
 assert.doesNotMatch(report,/\[approved\]\(|\*\*all green\*\*/);
 assert.equal(r.complete,true);
});
test('empty PR file lists do not produce successful reviews',async()=>{
 const opts=mock([]);
 await assert.rejects(()=>inspect(opts),/Leere oder zu große/);
});

test('valid JSON is checked and invalid JSON is reported as confirmed syntax',async()=>{
 const valid=await inspect(mock([entry('data.json')],{[SHA]:'{"ok":true}'}));
 assert.equal(valid.complete,true);
 assert.equal(valid.rows[0].findings.length,0);
 const broken=await inspect(mock([entry('data.json')],{[SHA]:'{"ok":'}));
 assert.equal(broken.rows[0].findings[0].rule,'JSON000');
 assert.equal(broken.rows[0].findings[0].kind,'confirmed');
 assert.equal(broken.blocking,true);
 assert.doesNotMatch(render(broken),/\{"ok"/);
});
test('YAML syntax is parsed and security warnings remain heuristic',async()=>{
 const r=await inspect(mock([entry('ci.yml')],{[SHA]:'on:\n  pull_request_target:\npermissions:\n  contents: write'}));
 assert.equal(r.rows[0].reason,'yaml-ast-parse');
 assert.equal(r.rows[0].status,'checked');
 assert.equal(r.complete,true);
 assert.equal(r.rows[0].findings.length,2);
 assert.match(render(r),/heuristische Warnung/);
});
test('AST adapter produces confirmed parse errors without echoing untrusted source',async()=>{
 const r=await inspect({...mock([entry('broken.mjs')]),ast:()=>({parsed:false,findings:[{rule:'AST000',line:2,message:'API-KEY-SHOULD-NOT-PRINT'}]})});
 assert.equal(r.rows[0].findings[0].kind,'confirmed');
 assert.equal(r.blocking,true);
 assert.match(render(r),/bestätigter Syntaxfehler/);
 assert.doesNotMatch(render(r),/API-KEY-SHOULD-NOT-PRINT/);
});
test('AST exceptions fail closed',async()=>{
 const r=await inspect({...mock([entry('broken.mjs')]),ast:()=>{throw Error('SECRET-NEVER-ECHO')}});
 assert.equal(r.complete,false);
 assert.equal(r.rows[0].status,'error');
 assert.doesNotMatch(render(r),/SECRET-NEVER-ECHO/);
});

test('a real syntax error is a blocking result even when file coverage is complete',async()=>{
 const r=await inspect({...mock([entry('invalid.mjs')]),ast:()=>({parsed:false,findings:[{rule:'AST000',line:1}]})});
 assert.equal(r.complete,true);
 assert.equal(r.blocking,true);
 assert.match(render(r),/Prüfung nicht bestanden/);
});
test('valid YAML without known risk is syntax-checked but not security-certified',async()=>{
 const r=await inspect(mock([entry('safe.yml')],{[SHA]:'name: example\njobs: {}'}));
 assert.equal(r.rows[0].findings.length,0);
 assert.equal(r.rows[0].status,'checked');
 assert.equal(r.complete,true);
});

test('anonymous public mode never sends an Authorization header',async()=>{
 const headers=[];
 const opts=mock([entry('public.js')]);
 const r=await inspect({...opts,token:undefined,anonymous:true,request:async(url,options)=>{
  headers.push(options.headers);
  return opts.request(url,options);
 }});
 assert.equal(r.complete,true);
 assert.ok(headers.length>=3);
 assert.ok(headers.every(h=>!Object.hasOwn(h,'Authorization')));
});
test('no-token requests remain rejected without explicit anonymous mode',async()=>{
 const opts=mock([entry('public.js')]);
 await assert.rejects(()=>inspect({...opts,token:undefined}),/Ungültiger Auftrag/);
});

test('Python syntax checker labels confirmed syntax errors without source leakage',async()=>{
 const src='def f(:\n SECRET_IN_PYTHON = "hide"';
 const result=await inspect({...mock([entry('broken.py')],{[SHA]:src}),pythonSyntax:()=>({parsed:false,line:1})});
 assert.equal(result.complete,true);
 assert.equal(result.blocking,true);
 assert.equal(result.rows[0].findings[0].rule,'PY000');
 assert.equal(result.rows[0].findings[0].kind,'confirmed');
 assert.doesNotMatch(render(result),/SECRET_IN_PYTHON/);
});
test('Python valid parse is a checked file, never a code execution',async()=>{
 const result=await inspect({...mock([entry('safe.py')],{[SHA]:'open("unsafe-file","w").write("NO")'}),pythonSyntax:()=>({parsed:true,line:null})});
 assert.equal(result.complete,true);
 assert.equal(result.rows[0].reason,'python-ast-parse');
 assert.equal(result.rows[0].findings.length,0);
});
test('Python checker failures remain non-green and do not leak exception text',async()=>{
 const result=await inspect({...mock([entry('safe.py')]),pythonSyntax:()=>{throw Error('FAKE-SECRET')}});
 assert.equal(result.complete,false);
 assert.equal(result.rows[0].status,'error');
 assert.doesNotMatch(render(result),/FAKE-SECRET/);
});

test('real isolated Python AST parsing does not execute the submitted script',async()=>{
 const source='raise RuntimeError("THIS MUST NEVER EXECUTE")\n';
 const result=await inspect(mock([entry('real.py')],{[SHA]:source}));
 assert.equal(result.complete,true);
 assert.equal(result.blocking,false);
 assert.equal(result.rows[0].findings.length,0);
});
test('real isolated Python AST parsing catches malformed code',async()=>{
 const result=await inspect(mock([entry('real.py')],{[SHA]:'def invalid(:\n pass'}));
 assert.equal(result.complete,true);
 assert.equal(result.blocking,true);
 assert.equal(result.rows[0].findings[0].rule,'PY000');
});

test('real YAML parser confirms malformed syntax without disclosing source',async()=>{
 const r=await inspect(mock([entry('broken.yaml')],{[SHA]:'name: [never-closed\nSECRET-NEVER-SHOWN: yes'}));
 assert.equal(r.complete,true);
 assert.equal(r.blocking,true);
 assert.equal(r.rows[0].findings[0].rule,'YAML000');
 assert.equal(r.rows[0].findings[0].kind,'confirmed');
 assert.doesNotMatch(render(r),/SECRET-NEVER-SHOWN/);
});
test('YAML tags are never deserialized into Ruby objects',async()=>{
 const r=await inspect(mock([entry('tagged.yml')],{[SHA]:'--- !ruby/object:Exploit\nfield: unsafe\n'}));
 assert.equal(r.complete,true);
 assert.equal(r.rows[0].status,'checked');
 assert.equal(r.blocking,false);
});
test('YAML parser crash fails closed with no exception leakage',async()=>{
 const r=await inspect({...mock([entry('a.yaml')]),yamlSyntax:()=>{throw Error('DO-NOT-LOG-YAML-SECRET')}});
 assert.equal(r.complete,false);
 assert.equal(r.rows[0].status,'error');
 assert.doesNotMatch(render(r),/DO-NOT-LOG-YAML-SECRET/);
});
