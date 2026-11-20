import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateItem as evalItem,aggregateEvaluation as aggregate} from '../integration-score.mjs';
const claim=(id,text,origin='curated',conflicts=[])=>({id,text,origin,conflicts});
const retrieval={input:{question:'Wie lange dauert das?'},layers:['retrieval'],
 expect:{retrieval:{verdict:'sufficient',mustInclude:['a'],mustExclude:['z']}}};
const get=(item,ctx)=>evalItem(item,ctx);
test('Trefferprüfung besteht mit konkreter Trefferliste',()=>{
 const r=get(retrieval,{foundIds:['a']});
 assert.equal(r.outcome,'pass');assert.equal(r.fullyEvaluated,true);
});
test('Fehlende Trefferliste ist nie Erfolg',()=>{
 const r=get(retrieval,{});
 assert.equal(r.outcome,'not_evaluated');assert.equal(r.fullyEvaluated,false);
});
test('Fehlender notwendiger Treffer scheitert',()=>assert.equal(get(retrieval,{foundIds:[]}).outcome,'fail'));
test('Generierung ohne tatsächliche Antwort nicht auswertbar',()=>{
 const item={...retrieval,layers:['retrieval','generation'],expect:{...retrieval.expect,mode:'answer'}};
 const r=get(item,{foundIds:['a']});
 assert.equal(r.outcome,'not_evaluated');assert.equal(r.checks.retrieval.status,'pass');
 assert.equal(r.checks.mode.status,'not_evaluated');assert.equal(r.fullyEvaluated,false);
});
test('Review wird nicht als Pass hochgezählt',()=>{
 const item={input:{question:'Was ist die Selno-Klemme?'},layers:['generation'],
  expect:{mode:'answer'}};
 const r=get(item,{answer:'Die Selno-Klemme ist eine rote Vorrichtung.'});
 assert.equal(r.outcome,'review');
});
test('Solver-Zeit nur bei übergebener Antwort',()=>{
 const item={input:{question:'Wann endet die Arbeit?'},layers:['generation'],
  expect:{exact:{value:740,tol:0,unit:'minuten_seit_mitternacht'}}};
 const r=get(item,{answer:'12:20 Uhr'});
 assert.equal(r.checks.exact.status,'pass');assert.equal(r.outcome,'not_evaluated');
 assert.equal(r.checks.mode.status,'not_evaluated');
});
test('Evidenz aus Metadaten trägt unverified',()=>{
 const item={input:{question:'Prüfe die Aussage.',draft:'Die Klemme ist blau.',evidence:['u']},
  layers:['verifier'],expect:{labels:['unverified']}};
 const r=get(item,{claims:[claim('u','Die Klemme ist blau.','user')]});
 assert.equal(r.outcome,'pass');
});
test('Fehlende Evidenz niemals automatisch pass',()=>{
 const item={input:{question:'Prüfe die Aussage.',draft:'Die Klemme ist blau.',evidence:['u']},
  layers:['verifier'],expect:{labels:['unverified']}};
 assert.equal(get(item,{}).outcome,'not_evaluated');
});
test('Quellenstatus hat keine implizite Claim-Zuordnung',()=>{
 const item={input:{question:'Wie lange benötigt die Klemme?'},layers:['generation'],
  expect:{statusWording:'hedged'}};
 assert.equal(get(item,{answer:'Laut Nutzerangabe benötigt die Klemme 14 Tage.',
  claims:[claim('u','Die Klemme benötigt 14 Tage.','user')]}).outcome,'not_evaluated');
});
test('Quellenstatus mit expliziter Herkunft wird bewertbar',()=>{
 const item={input:{question:'Wie lange benötigt die Selno-Klemme?'},layers:['generation'],
  expect:{statusWording:'hedged'}};
 const r=get(item,{answer:'Laut Nutzerangabe benötigt die Selno-Klemme 14 Tage Trocknung.',
  statusClaimId:'u',claims:[claim('u','Die Selno-Klemme benötigt 14 Tage Trocknung.','user')]});
 assert.equal(r.checks.statusWording.status,'pass');
 assert.equal(r.outcome,'not_evaluated'); // mode bleibt unbewertet
});
test('Noch nicht implementierte Konzepte verhindern Gesamtpass',()=>{
 const item={input:{question:'Wie lange?'},layers:['retrieval'],expect:{
  retrieval:{verdict:'sufficient',mustInclude:['a']},concepts:[{id:'x',anyOf:['ja']}]}};
 const r=get(item,{foundIds:['a']});
 assert.equal(r.outcome,'not_evaluated');assert.equal(r.checks.concepts.status,'not_evaluated');
});
test('Fehlerhafte Layer werden abgelehnt',()=>assert.throws(()=>get({...retrieval,layers:['fantasy']},{})));
test('Aggregation enthält nur Zähler',()=>{
 const r=[get(retrieval,{foundIds:['a']}),get(retrieval,{})],a=aggregate(r);
 assert.deepEqual(a.outcomes,{pass:1,fail:0,review:0,not_evaluated:1});
 assert.equal(a.fullyEvaluated,1);
 assert.equal(JSON.stringify(a).includes('Die Klemme'),false);
});
