import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {boundaryCases,runBoundaryCase} from '../browser-boundary-core.mjs';
import {PINNED_SCRIPTS} from '../browser-capture-audit.mjs';
const root=new URL('../../',import.meta.url),window={};
for(const file of Object.keys(PINNED_SCRIPTS))
 runInNewContext(readFileSync(new URL(file,root),'utf8'),{window},{filename:file});
const modules={math:window.NERYXMathVerifier,system:window.NERYXSystem,orchestrator:window.NERYXOrchestrator};
const results=boundaryCases.map(x=>runBoundaryCase(modules,x));
test('Alle zwölf Grenzwertfälle werden gegen echte Module ausgeführt',()=>{
 assert.equal(results.length,12);
 assert.deepEqual(results.map(x=>x.id),boundaryCases.map(x=>x.id));
});
test('Ungültige Raster werden ohne Pfad abgelehnt',()=>{
 for(const id of ['ragged-grid','invalid-grid']){
  const r=results.find(x=>x.id===id);assert.equal(r.passed,true);
  assert.match(r.answer,/Format: Weg planen:/);
 }
});
test('Große Flächen werden mit Hinweis auf Rechengrenze gestoppt',()=>{
 const r=results.find(x=>x.id==='huge-area');assert.equal(r.passed,true);
 assert.doesNotMatch(r.answer,/Ergebnis:/);
});
test('Leere Eingabe bleibt invalid und aktiviert kein Sprachmodell',()=>{
 assert.equal(results.find(x=>x.id==='empty-input').passed,true);
 assert.equal(window.NERYXLocalModel,undefined);
});
test('Nullbreite wird abgelehnt',()=>assert.equal(results.find(x=>x.id==='zero-width').passed,true));
test('Negative Maße und Mengen werden ausnahmslos abgelehnt',()=>{
 for(const id of ['negative-width','negative-height','negative-room-count','negative-wall-count','unicode-minus-width','spaced-minus-width']){
  const r=results.find(x=>x.id===id);
  assert.equal(r.passed,true,id);
  assert.equal(r.answer,null,id);
 }
});
test('Gültige Wandflächenreferenz bleibt 150 m²',()=>{
 const r=results.find(x=>x.id==='positive-reference');
 assert.equal(r.passed,true);
 assert.match(r.answer,/Ergebnis: 150 m²/);
});
test('Keine Änderung an app.js und keine eingebundene Modellbrücke',()=>{
 const page=readFileSync(new URL('eval/browser-boundary.html',root),'utf8');
 assert.doesNotMatch(page,/<script[^>]+src="[^"]*(?:app\.js|local-model)/i);
});
