import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBooleanResult,checkAggregateResult,scoreReviewComplete} from '../check-contract.mjs';
import {scoreRetrieval} from '../retrieval-score.mjs';
import {aggregateEvaluation} from '../integration-score.mjs';
const valid=new Set(['pass','fail','review','not_evaluated']);
test('Leere boolesche Prüfungen dürfen nie bestehen',()=>assert.throws(()=>checkBooleanResult({})));
test('Fehlendes Pflichtfeld wird zurückgewiesen',()=>assert.throws(()=>checkBooleanResult({include:true},['include','exclude'])));
test('Nicht-boolsche Werte werden zurückgewiesen',()=>assert.throws(()=>checkBooleanResult({include:'true'},['include'])));
test('Korrekter leerer Retrieval-Treffer bei none bleibt zulässig',()=>{
 const x=scoreRetrieval([],{retrieval:{verdict:'none',mustInclude:[],mustExclude:['b']}});
 assert.equal(x.pass,true);
 assert.equal(Object.keys(x.checks).length>0,true);
});
test('Unbekannte Trefferliste muss abbrechen',()=>assert.throws(()=>scoreRetrieval(null,{retrieval:{verdict:'none'}})));
test('Leere Aggregation ist verboten',()=>assert.throws(()=>aggregateEvaluation([{outcome:'pass',fullyEvaluated:true,checks:{}}])));
test('Teilweise unbekannte Prüfung darf nicht als pass gelten',()=>{
 const r={outcome:'pass',fullyEvaluated:false,checks:{retrieval:{status:'pass'},mode:{status:'not_evaluated'}}};
 assert.throws(()=>checkAggregateResult(r,valid));
});
test('Review darf nicht zu pass werden',()=>{
 const r={outcome:'pass',fullyEvaluated:true,checks:{mode:{status:'review'}}};
 assert.throws(()=>checkAggregateResult(r,valid));
});
test('Fail darf nicht als review angezeigt werden',()=>{
 const r={outcome:'review',fullyEvaluated:true,checks:{mode:{status:'fail'}}};
 assert.throws(()=>checkAggregateResult(r,valid));
});
test('Gültiger Mix wird korrekt aggregiert',()=>{
 const r={outcome:'not_evaluated',fullyEvaluated:false,checks:{retrieval:{status:'pass'},mode:{status:'not_evaluated'}}};
 assert.equal(checkAggregateResult(r,valid),true);
});

test('Review ohne expect.complete ist ungültig, auch wenn complete fehlt',()=>assert.throws(()=>scoreReviewComplete({},undefined)));
test('Review ohne Sollwert wird bei echter Boolean-Ausgabe abgelehnt',()=>assert.throws(()=>scoreReviewComplete({complete:true},undefined)));
test('Review ohne boolesche Ist-Angabe wird abgelehnt',()=>assert.throws(()=>scoreReviewComplete({},false)));
test('Review mit falschem Typ wird abgelehnt',()=>assert.throws(()=>scoreReviewComplete({complete:'false'},false)));
test('Review korrekter Vergleich true/true besteht',()=>assert.equal(scoreReviewComplete({complete:true},true),true));
test('Review korrekter Vergleich false/false besteht',()=>assert.equal(scoreReviewComplete({complete:false},false),true));
test('Review gegensätzliche Werte bestehen nicht',()=>assert.equal(scoreReviewComplete({complete:true},false),false));
