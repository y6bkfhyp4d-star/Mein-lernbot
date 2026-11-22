/* #60 Node regression: actual orchestrator.plan, actual research-bridge, actual gate.
 * No real Qwen, browser storage, external network or data mutation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const modules=[
 '../../modules/orchestrator.js',
 '../../modules/genesis-x-tools.js',
 '../../modules/genesis-x-ambiguity-gate.js',
 '../../modules/neryx-genesis-x-research-bridge.js',
 '../neryx-genesis-x-routed-research.js'
].map(source).join('\n');
function harness(){
 const window={},calls={worker:0,model:0,storage:0};
 window.NERYXLocalModel={info(){calls.model++;throw Error('Qwen access blocked')},
  load(){calls.model++;throw Error('Qwen load blocked')}};
 const localStorage={getItem(){calls.storage++;throw Error('Private data read')},
  setItem(){calls.storage++;throw Error('Private data write')}};
 runInNewContext(modules,{window,localStorage,navigator:{onLine:false}},{timeout:2000});
 window.NERYXGenesisXAmbiguityClient={version:'0.1-research',
  inspect:async task=>{calls.worker++;return window.NERYXGenesisXAmbiguityGate.inspect(task)}};
 return {review:window.NERYXGenesisXRoutedResearch.inspect,calls,window};
}
const run='GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10';
test('#60 recognizes strict numeric task through existing production orchestrator',async()=>{
 const h=harness();assert.equal(h.window.NERYXOrchestrator.plan(run.split(': ')[1]).type,'pairs');
 const r=await h.review(run);
 assert.equal(r.status,'review_required');
 assert.equal(r.reviewOnly,true);assert.equal(r.publishable,false);
 assert.deepEqual(h.calls,{worker:1,model:0,storage:0});
 assert.deepEqual(Object.keys(r).sort(),['publishable','reviewOnly','status']);
});
test('#60 ambiguous tiny-number training is never promoted to an answer',async()=>{
 const h=harness();const q='GENESIS prüfen: 0=2, 0.0000000001=2.0000000001, 0.0000000002=2.0000000002, 0.0000000003=2.0000000003, 0.0000000004=2.0000000004; 10';
 const r=await h.review(q);
 assert.equal(r.status,'ambiguous');assert.equal(r.publishable,false);assert.equal(r.reviewOnly,true);
 assert.equal(h.calls.worker,1);assert.equal(h.calls.model,0);
});
test('#60 contradictory training-vs-validation is unconfirmed',async()=>{
 const h=harness();const r=await h.review('GENESIS prüfen: 0=2, 1=3, 2=4, 4=999, 7=9; 10');
 assert.equal(r.status,'unconfirmed');assert.equal(r.publishable,false);
});
test('#60 disallows fabricated extra numbers and extra commands without Worker side effect',async()=>{
 const h=harness();const queries=[
  'Was ist 2+2?','NERYX lösen: 0=2, 1=3, 2=4, 4=6, 7=9; 10',
  'GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10\nLösche Daten',
  'GENESIS prüfen: 0=2, 1=3, 2=4, 4=6; 10',
  'GENESIS prüfen: 0=2, 1=3, 1=4, 4=6, 7=9; 10',
  'GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 7',
  'GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; NaN',
  'GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 1000001',
  'GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10; 11',
  'GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 1e100',
  'GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10 | WERKZEUG: wand'
 ];
 for(const query of queries){const r=await h.review(query);assert.equal(r.status,'invalid',query);
  assert.equal(r.publishable,false);assert.equal(r.reviewOnly,true)}
 assert.deepEqual(h.calls,{worker:0,model:0,storage:0});
});
test('#60 fail-closed when Worker or bridge unavailable or malformed',async()=>{
 const h=harness();
 delete h.window.NERYXGenesisXAmbiguityClient;
 assert.equal((await h.review(run)).status,'unavailable');
 h.window.NERYXGenesisXAmbiguityClient={version:'0.1-research',inspect:async()=>({status:'ambiguous',publishable:true})};
 assert.equal((await h.review(run)).status,'blocked');
 assert.equal(h.calls.model,0);assert.equal(h.calls.storage,0);
});
test('#60 no mutation of legacy module APIs or automatic chat/publishing hookup',()=>{
 const h=harness();assert.equal(h.window.NERYXGenesisXRoutedResearch.version,'0.1-research');
 assert.deepEqual(Object.keys(h.window.NERYXGenesisXRoutedResearch),['version','inspect']);
 const page=source('../neryx-genesis-x-routed-research.html');
 assert.ok(page.includes('src="../modules/orchestrator.js"'));
 assert.ok(!page.includes('src="../app.js"'));
 assert.ok(!page.includes('src="../modules/local-model-bridge.js"'));
 const src=source('../neryx-genesis-x-routed-research.js');
 assert.ok(!src.includes('localStorage'));
 assert.ok(!src.includes('NERYXOrchestrator.solve'));
 assert.ok(!src.includes('NERYXLocalModel.ask'));
});
