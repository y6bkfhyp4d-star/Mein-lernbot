import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {dummyQuestion,dummyItem,dummySuiteBytes,makeDummyCapture,sha256} from '../browser-capture-core.mjs';
import {verifyOfflineCapture,captureHash} from '../capture-contract.mjs';
const root=new URL('../../',import.meta.url);
const files=['modules/math-verifier.js','modules/orchestrator.js'];
const source=name=>readFileSync(new URL(name,root));
const hashes=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(source(p)).digest('hex')]));
function orchestrator(){
 const window={};for(const p of files)runInNewContext(source(p).toString('utf8'),{window});
 return window.NERYXOrchestrator;
}
test('Tatsächlicher NERYX-Orchestrator wählt nur den Wandflächen-Rechenkern',()=>{
 const o=orchestrator();
 assert.equal(o.plan(dummyQuestion).type,'area');
 assert.equal(o.plan(dummyQuestion).source,'Rechenprüfer');
});
test('Browser-Core erzeugt Capture im vorhandenen Node-Vertragsformat',async()=>{
 const o=orchestrator(),answer=await o.solve(dummyQuestion);
 assert.match(answer,/Ergebnis: 150 m²/);
 const c=await makeDummyCapture({answer,durationMs:5,scripts:hashes});
 const v=verifyOfflineCapture(c,[dummyItem],hashes,captureHash(dummySuiteBytes));
 assert.equal(v.recordCount,1);
 assert.equal(v.contexts[0].answer,answer);
 assert.equal(v.finalDigest,c.records[0].recordSha256);
});
test('Browser- und Node-Hash aus UTF-8 sind gleich (Umlaute)',async()=>{
 assert.equal(await sha256('Wände: 150 m²'),captureHash('Wände: 150 m²'));
});
test('Export verweigert zusätzliche unbekannte Skriptmetadaten',async()=>{
 const answer=await orchestrator().solve(dummyQuestion);
 const c=await makeDummyCapture({answer,durationMs:5,scripts:hashes});
 c.scripts['app.js']=captureHash('dummy');
 assert.throws(()=>verifyOfflineCapture(c,[dummyItem],hashes,captureHash(dummySuiteBytes)));
});
test('Orchestrator ohne Rechenkern darf nicht als vollständiger Test gelten',()=>{
 const window={};runInNewContext(source('modules/orchestrator.js').toString('utf8'),{window});
 assert.notEqual(window.NERYXOrchestrator.plan(dummyQuestion).type,'area');
});
