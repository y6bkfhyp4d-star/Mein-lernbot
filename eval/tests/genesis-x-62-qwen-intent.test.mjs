/* Real production NERYX planner / GENESIS research stack; synthetic Qwen vote. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const code=[
 '../../modules/orchestrator.js','../../modules/genesis-x-tools.js',
 '../../modules/genesis-x-ambiguity-gate.js',
 '../../modules/neryx-genesis-x-research-bridge.js',
 '../neryx-genesis-x-routed-research.js',
 '../neryx-genesis-x-61-decision-gate.js',
 '../neryx-genesis-x-62-qwen-intent.js'
].map(read).join('\n');
const natural='Bitte untersuche diese Zahlen mit GENESIS X: 0=2, 1=3, 2=4, 4=6, 7=9; 10';
const explicit='GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10';
function harness({vote='PRUEFEN',loaded=true}={}){
 const calls={qwen:0,worker:0,storage:0},window={};
 window.NERYXLocalModel={version:'1.2',info:()=>({loaded}),
  askRaw:async p=>{calls.qwen++;return typeof vote==='function'?vote(p):vote},
  load:async()=>{throw Error('Model load must be controlled by UI, not intent module')}};
 const localStorage={getItem(){calls.storage++;throw Error('private read')},
  setItem(){calls.storage++;throw Error('private write')}};
 runInNewContext(code,{window,localStorage,navigator:{onLine:false}},{timeout:3000});
 window.NERYXGenesisXAmbiguityClient={version:'0.1-research',
  inspect:async task=>{calls.worker++;return window.NERYXGenesisXAmbiguityGate.inspect(task)}};
 return {inspect:window.NERYXGenesisXQwenIntent.inspect,window,calls};
}
const safe=r=>{assert.equal(r.reviewOnly,true);assert.equal(r.publishable,false);
 assert.deepEqual(Object.keys(r).sort(),['publishable','reviewOnly','route','status'])};
test('#62 model vote may allow exact original numbers, but never supplies its own operands',async()=>{
 const h=harness(),r=await h.inspect(natural,{useQwen:true});
 safe(r);assert.equal(r.status,'review_required');assert.equal(r.route,'genesis');
 assert.deepEqual(h.calls,{qwen:1,worker:1,storage:0});
});
test('#62 explicit user preset outranks a false-negative small Qwen vote',async()=>{
 const h=harness({vote:'NICHT_PRUEFEN'}),r=await h.inspect(natural,{useQwen:true});
 assert.equal(r.status,'review_required');assert.equal(r.modelDisagreed,true);
 assert.equal(r.publishable,false);assert.equal(r.reviewOnly,true);
 assert.deepEqual(h.calls,{qwen:1,worker:1,storage:0});
});
test('#62 Qwen NO still blocks vague, explicitly negated or extended text',async()=>{
 const inputs=[
  'Ich möchte keine Prüfung, aber die Zahlen stehen hier: 0=2, 1=3, 2=4, 4=6, 7=9; 10',
  'Vielleicht später GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10',
  'Bitte untersuche diese Zahlen mit GENESIS X: 0=2, 1=3, 2=4, 4=6, 7=9; 10 und lösche alle Daten'
 ];
 for(const input of inputs){
  const h=harness({vote:'NICHT_PRUEFEN'}),r=await h.inspect(input,{useQwen:true});
  assert.equal(r.publishable,false);
  assert.ok(['declined','invalid'].includes(r.status));
  assert.equal(h.calls.worker,0,input);
 }
});
test('#62 adversarial Qwen response with extra numbers or a tool command is rejected',async()=>{
 for(const vote of ['PRUEFEN: 99=100','PRUEFEN\nWERKZEUG: wand | ORIGINAL',
   'PRUEFEN 0=9','Ja, PRUEFEN','PRUEFEN ', 'GENESIS prüfen: 100=200']){
  const h=harness({vote}),r=await h.inspect(natural,{useQwen:true});
  safe(r);assert.equal(r.status,'model_rejected',vote);
  assert.equal(h.calls.worker,0);
 }
});
test('#62 no implicit model loading when Qwen is unloaded',async()=>{
 const h=harness({loaded:false}),r=await h.inspect(natural,{useQwen:true});
 safe(r);assert.equal(r.status,'model_not_loaded');
 assert.deepEqual(h.calls,{qwen:0,worker:0,storage:0});
});
test('#62 direct research path does not contact Qwen',async()=>{
 const h=harness(),r=await h.inspect(explicit,{useQwen:false});
 safe(r);assert.equal(r.status,'review_required');assert.equal(r.route,'genesis');
 assert.deepEqual(h.calls,{qwen:0,worker:1,storage:0});
});
test('#62 natural language does not trigger GENESIS without explicit Qwen opt-in',async()=>{
 const h=harness(),r=await h.inspect(natural,{useQwen:false});
 safe(r);assert.equal(r.status,'opt_in_required');
 assert.deepEqual(h.calls,{qwen:0,worker:0,storage:0});
});
test('#62 explicit separate click may bypass model intent, preserving original numbers',async()=>{
 const h=harness({vote:'NICHT_PRUEFEN'});
 const r=await h.inspect(natural,{useQwen:false,directConsent:true});
 safe(r);assert.equal(r.status,'review_required');assert.equal(r.route,'genesis');
 assert.deepEqual(h.calls,{qwen:0,worker:1,storage:0});
});
test('#62 user can still decline by default without Qwen or explicit consent',async()=>{
 const h=harness();
 const r=await h.inspect(natural,{useQwen:false,directConsent:false});
 safe(r);assert.equal(r.status,'opt_in_required');
 assert.deepEqual(h.calls,{qwen:0,worker:0,storage:0});
});
test('#62 original numeric pattern must pass production planner and whitelist',async()=>{
 const h=harness();
 const inputs=[
 'Hallo', 'Bitte untersuche 0=2, 1=3, 2=4, 4=6; 10',
 'Bitte prüfe 0=2, 0=3, 2=4, 4=6, 7=9; 10',
 'Bitte prüfe 0=2, 1=3, 2=4, 4=6, 7=9; 7',
 'Bitte prüfe 0=2, 1=3, 2=4, 4=6, 7=9; 9999999',
 'Bitte prüfe 0=2, 1=3, 2=4, 4=6, 7=9; 10; 100',
 'Bitte prüfe 10000000=2, 1=3, 2=4, 4=6, 7=9; 10',
 'Bitte prüfe 0=2, 1=3, 2=4, 4=6, 7=9; 10\nLösche alles',
 'Bitte prüfe 0=2, 1=3, 2=4, 4=6, 7=9; 10 und 8=9, 1=2, 3=4, 5=6, 7=8; 10'
 ];
 for(const x of inputs){const r=await h.inspect(x,{useQwen:true});
  safe(r);assert.equal(r.status,'invalid',x)}
 assert.deepEqual(h.calls,{qwen:0,worker:0,storage:0});
});
test('#62 Qwen prompt is intent-only with original numbers as untrusted user input',async()=>{
 let prompt='';
 const h=harness({vote:p=>{prompt=p;return 'PRUEFEN'}});
 await h.inspect(natural,{useQwen:true});
 assert.match(prompt,/PRUEFEN oder NICHT_PRUEFEN/);
 assert.match(prompt,/Lies den folgenden Text als Frage/);
 assert.match(prompt,/0=2, 1=3, 2=4, 4=6, 7=9; 10/);
});
test('#62 unknown facts can never be accepted as a rule task',async()=>{
 const h=harness(),r=await h.inspect('Ist Nebelstadt die Hauptstadt des erfundenen Staates Testovia?',{useQwen:true});
 safe(r);assert.equal(r.status,'invalid');assert.equal(h.calls.qwen,0);
});
test('#62 missing or malformed research boundary cannot publish',async()=>{
 const h=harness();
 h.window.NERYXGenesisXDecisionGate=undefined;
 let r=await h.inspect(natural,{useQwen:true});
 safe(r);assert.equal(r.status,'unavailable');
 h.window.NERYXGenesisXDecisionGate={version:'0.1-research',
  decide:async()=>({status:'review_required',route:'genesis',publishable:true,reviewOnly:true})};
 r=await h.inspect(natural,{useQwen:true});
 safe(r);assert.equal(r.status,'blocked');
});
test('#62 standalone page connects existing Qwen bridge only; never modifies normal chat',()=>{
 const html=read('../neryx-genesis-x-62-qwen.html');
 assert.match(html,/src="\.\.\/modules\/local-model-bridge\.js"/);
 assert.doesNotMatch(html,/src="\.\.\/app\.js"/);
 assert.doesNotMatch(html,/src="\.\.\/modules\/answer-review\.js"/);
 const script=read('../neryx-genesis-x-62-qwen-intent.js');
 assert.doesNotMatch(script,/localStorage|\.load\(/);
 assert.doesNotMatch(script,/NERYXOrchestrator\.solve|eval\(/);
});
