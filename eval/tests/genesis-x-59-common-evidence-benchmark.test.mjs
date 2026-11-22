/* #59 independent cross-system audit: genuine product code, synthetic model and
 * constrained GENESIS X research engine. Never a live chat connector.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const sources={
 math:read('../../modules/math-verifier.js'),
 review:read('../../modules/answer-review.js'),
 orchestrator:read('../../modules/orchestrator.js'),
 tools:read('../../modules/genesis-x-tools.js'),
 gate:read('../../modules/genesis-x-ambiguity-gate.js'),
 bridge:read('../../modules/neryx-genesis-x-research-bridge.js')
};
const fixture=(fn,train,validation,probes)=>({
 training:train.map(x=>({x,y:fn(x)})),
 validation:validation.map(x=>({x,y:fn(x)})),probes
});
function lab({qwenReply='Der Wert ist 5 m².',saved='Keine passende Antwort gespeichert.'}={}){
 const calls={qwen:0,storage:0,genesis:0},window={};
 window.NERYXCoordinator={lookup:()=>null,decide:()=>null};
 window.NERYXLocalModel={info:()=>({loaded:true}),askRaw:async()=>{
  calls.qwen++;return qwenReply;
 }};
 const localStorage={getItem:()=>{calls.storage++;throw Error('Private storage read')},
  setItem:()=>{calls.storage++;throw Error('Private storage write')}};
 // Original, unmodified modules run in the same VM, as in the actual browser.
 runInNewContext([sources.math,sources.review,sources.orchestrator,sources.tools,
  sources.gate,sources.bridge].join('\n'),{window,localStorage,navigator:{onLine:true}},
  {timeout:3000});
 // Simulated message boundary: no worker/network. The *real* GENESIS gate runs.
 window.NERYXGenesisXAmbiguityClient=Object.freeze({
  version:'0.1-research',inspect:async task=>{calls.genesis++;
   return window.NERYXGenesisXAmbiguityGate.inspect(task)}
 });
 const qwenQuestion=q=>window.NERYXOrchestrator.solve(q,{knowledge:async()=>saved});
 const genesisTask=task=>window.NERYXGenesisXResearchBridge.review({
  version:1,kind:'research_check',task});
 return {calls,window,qwenQuestion,genesisTask};
}
const area='Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch. Wie groß ist die gesamte Wandfläche?';
test('#59 wall area: independent 150 m² oracle, Qwen is bypassed, unrelated GENESIS remains isolated',async()=>{
 const h=lab({qwenReply:'Es sind 5 m².'});
 const reply=await h.qwenQuestion(area);
 assert.match(reply,/Ergebnis: 150 m²/);
 assert.match(reply,/NICHT vom Sprachmodell/);
 assert.deepEqual(h.calls,{qwen:0,storage:0,genesis:0});
});
test('#59 x²+2: GENESIS reviews candidate behavior but never publishes a mathematical answer',async()=>{
 const h=lab();
 const task=fixture(x=>x*x+2,[-3,-1,0],[1,3],[-6,4,7.5]);
 const r=await h.genesisTask(task);
 assert.equal(r.status,'review_required');
 assert.equal(r.reviewOnly,true);assert.equal(r.publishable,false);
 assert.ok(r.competingPrograms>=1);assert.equal(r.distinctBehaviors,1);
 assert.equal(r.testedProbes,3);
 assert.deepEqual(h.calls,{qwen:0,storage:0,genesis:1});
 assert.equal(Object.hasOwn(r,'answer'),false);
 assert.equal(Object.hasOwn(r,'predictions'),false);
});
test('#59 tightly clustered x+2: GENESIS detects multiple competing behaviors, never selects one for Qwen',async()=>{
 const h=lab();
 const task=fixture(x=>x+2,[0,1e-10,2e-10],[3e-10,4e-10],[10,-10]);
 const r=await h.genesisTask(task);
 assert.equal(r.status,'ambiguous');
 assert.ok(r.competingPrograms>1);assert.ok(r.distinctBehaviors>1);
 assert.equal(r.publishable,false);assert.equal(r.reviewOnly,true);
 assert.equal(h.calls.qwen,0);assert.equal(h.calls.storage,0);
});
test('#59 contradictory validation: GENESIS unconfirmed even if synthetic Qwen confidently invents a rule',async()=>{
 const h=lab({qwenReply:'Die gesuchte Regel ist immer x+2, garantiert.'});
 const task=fixture(x=>x+2,[0,1,2],[4,7],[10]);
 task.validation[0].y=999;
 const r=await h.genesisTask(task);
 assert.equal(r.status,'unconfirmed');
 assert.equal(r.publishable,false);assert.equal(r.reviewOnly,true);
 assert.equal(h.calls.qwen,0);
});
test('#59 fabricated factual answer: Qwen remains explicitly unverified, GENESIS not a fact-checker',async()=>{
 const h=lab({qwenReply:'Die Hauptstadt des erfundenen Landes Testovia ist Nebelstadt. Das weiß ich sicher.'});
 const r=await h.qwenQuestion('Was ist die Hauptstadt des erfundenen Landes Testovia?');
 assert.match(r,/LOKALES SPRACHMODELL \(unverifiziert\)/);
 assert.match(r,/nicht unabhängig überprüft/);
 assert.match(r,/Nebelstadt/);
 assert.equal(h.calls.genesis,0);
 assert.equal(h.calls.storage,0);
});
test('#59 invalid numeric research input cannot acquire publishable answer from GENESIS bridge',async()=>{
 const h=lab();
 const r=await h.genesisTask({training:[{x:0,y:2}],validation:[],probes:[10]});
 assert.equal(r.status,'invalid');
 assert.equal(r.publishable,false);
 assert.equal(r.reviewOnly,true);
 assert.equal(h.calls.genesis,0);
});
test('#59 neither model confidence nor candidate status is an independent truth guarantee',async()=>{
 const h=lab({qwenReply:'Nebelstadt ist sicher die Hauptstadt.'});
 const review=h.window.NERYXAnswerReview.inspect('Was ist die Hauptstadt von Testovia?', 'Nebelstadt ist sicher die Hauptstadt.');
 assert.equal(review.complete,true,'The old reviewer checks formatting, not truth.');
 const genesis=await h.genesisTask(fixture(x=>x*x+2,[-3,-1,0],[1,3],[-6,4]));
 assert.equal(genesis.status,'review_required');
 assert.equal(genesis.publishable,false,'Never promote a matching numeric rule to fact.');
});
