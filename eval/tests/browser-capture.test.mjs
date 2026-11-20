import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {dummyItems,dummySuiteBytes,REQUIRED_SCRIPTS,makeDummyCapture,sha256} from '../browser-capture-core.mjs';
import {verifyOfflineCapture,captureHash} from '../capture-contract.mjs';
const root=new URL('../../',import.meta.url);
const source=name=>readFileSync(new URL(name,root));
const hashes=Object.fromEntries(REQUIRED_SCRIPTS.map(p=>[p,createHash('sha256').update(source(p)).digest('hex')]));
function orchestrator(omit=[]){
 const window={};
 for(const p of REQUIRED_SCRIPTS)if(!omit.includes(p))runInNewContext(source(p).toString('utf8'),{window});
 return window;
}
async function fixture(){
 const {NERYXOrchestrator:o}=orchestrator();
 const answers=await Promise.all(dummyItems.map(it=>o.solve(it.input.question)));
 return makeDummyCapture({answers,durationsMs:[2,3],scripts:hashes});
}
test('Echte NERYX-Module wählen Wandfläche und Zahlenfolge',async()=>{
 const o=orchestrator().NERYXOrchestrator;
 assert.equal(o.plan(dummyItems[0].input.question).type,'area');
 assert.equal(o.plan(dummyItems[1].input.question).type,'sequence');
 assert.match(await o.solve(dummyItems[0].input.question),/Ergebnis: 150 m²/);
 assert.match(await o.solve(dummyItems[1].input.question),/Erkanntes Muster: geometrisch\nMögliche nächste Zahl: 32/);
});
test('Zwei Dummy-Datensätze erfüllen den bestehenden Offline-Capture-Vertrag',async()=>{
 const c=await fixture(),v=verifyOfflineCapture(c,dummyItems,hashes,captureHash(dummySuiteBytes));
 assert.equal(v.recordCount,2);
 assert.equal(v.finalDigest,c.records[1].recordSha256);
 assert.equal(c.records[0].prevRecordSha256,'0'.repeat(64));
 assert.equal(c.records[1].prevRecordSha256,c.records[0].recordSha256);
});
test('Reihenfolge der zwei Datensätze kann nicht vertauscht werden',async()=>{
 const c=await fixture();c.records.reverse();
 assert.throws(()=>verifyOfflineCapture(c,dummyItems,hashes,captureHash(dummySuiteBytes)));
});
test('Fehlender Rechenkern erzeugt keine gültige Wandflächenroute',()=>{
 const o=orchestrator(['modules/math-verifier.js']).NERYXOrchestrator;
 assert.notEqual(o.plan(dummyItems[0].input.question).type,'area');
});
test('Fehlendes Zahlenmuster-Modul liefert keine gültige Musterantwort',async()=>{
 const {NERYXOrchestrator:o}=orchestrator(['modules/rule-patterns.js']);
 assert.equal(o.plan(dummyItems[1].input.question).type,'sequence');
 assert.doesNotMatch(await o.solve(dummyItems[1].input.question),/Mögliche nächste Zahl: 32/);
});
test('Zusätzliches untrusted Skript wird abgewiesen',async()=>{
 const c=await fixture();c.scripts['app.js']=captureHash('dummy');
 assert.throws(()=>verifyOfflineCapture(c,dummyItems,hashes,captureHash(dummySuiteBytes)));
});
test('Capture hält Skriptmanifest unabhängig von den Vergleichsdaten',async()=>{
 const c=await fixture();
 assert.notStrictEqual(c.scripts,hashes);
 c.scripts['app.js']=captureHash('malicious');
 assert.equal(Object.hasOwn(hashes,'app.js'),false);
});
test('UTF-8 Browser- und Node-SHA stimmen überein',async()=>{
 assert.equal(await sha256('Wände, Zahlenfolge: 2, 4, 8, 16'),captureHash('Wände, Zahlenfolge: 2, 4, 8, 16'));
});
