import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {negativeCases,checkNegativeResponses} from '../browser-negative-core.mjs';
import {PINNED_SCRIPTS} from '../browser-capture-audit.mjs';
const root=new URL('../../',import.meta.url);
const files=Object.keys(PINNED_SCRIPTS);
function create(omit=[]){
 const window={};
 for(const file of files)if(!omit.includes(file)){
  runInNewContext(readFileSync(new URL(file,root),'utf8'),{window},{filename:file});
 }
 return window;
}
test('Echte Fachmodule melden eine nicht unterstützte Folge ohne erfundene Fortsetzung',async()=>{
 const o=create().NERYXOrchestrator;
 assert.equal(o.plan(negativeCases[0].question).type,'sequence');
 assert.equal(await o.solve(negativeCases[0].question),negativeCases[0].expected);
});
test('Echter Rasterlöser meldet gesperrte Passage als unlösbar',async()=>{
 const o=create().NERYXOrchestrator;
 assert.equal(o.plan(negativeCases[1].question).type,'grid');
 assert.equal(await o.solve(negativeCases[1].question),negativeCases[1].expected);
});
test('Echtes fehlendes Fachmodul wird in isoliertem Fenster sicher erkannt',async()=>{
 const w=create(['modules/neryx-reasoner.js']);
 assert.equal(w.NERYXReasoner,undefined);
 assert.equal(w.NERYXLocalModel,undefined);
 assert.equal(w.NERYXOrchestrator.plan(negativeCases[2].question).type,'grid');
 assert.equal(await w.NERYXOrchestrator.solve(negativeCases[2].question),negativeCases[2].expected);
});
test('Korrekte drei Fehlerantworten erfüllen den Negativvertrag',()=>{
 assert.equal(checkNegativeResponses(negativeCases.map(x=>x.expected)).every(x=>x.passed),true);
});
test('Erfundene erfolgreiche Lösung wird abgelehnt',()=>{
 const wrong=negativeCases.map(x=>x.expected);
 wrong[1]='NERYX · WEGPLANUNG\nSchritte: 4';
 assert.equal(checkNegativeResponses(wrong)[1].passed,false);
});
test('Fehlende Antwort wird fail-closed abgelehnt',()=>{
 assert.throws(()=>checkNegativeResponses(['nur eine Antwort']),/Drei Negativfälle/);
});
test('Der separate Fehler-Test lädt keine Haupt-App oder Qwen-Dateien',()=>{
 for(const page of ['eval/browser-negative.html','eval/browser-negative-frame.html']){
  const html=readFileSync(new URL(page,root),'utf8');
  assert.doesNotMatch(html,/<script[^>]+src="[^"]*(?:app\.js|local-model-bridge|client\.js)"/i);
 }
 const frame=readFileSync(new URL('eval/browser-negative-frame.html',root),'utf8');
 assert.doesNotMatch(frame,/<script[^>]+src="[^"]*neryx-reasoner\.js"/);
});
