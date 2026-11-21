/* GAP-001 regression: narrow, source-grounded pronoun follow-up only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const fixtures=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url),'utf8'));
const food='Silberfische aus Testland';
function make(extra=[]){
 const data=structuredClone(fixtures);
 data.main.facts.push({
  id:'fixture-food-1',subject:'Wolf',property:'nahrung',value:food,
  source:'synthetic-test',confidence:1,conflict:false,alternatives:[],
  created:1700000000000,updated:1700000000000
 });
 data.main.facts.push(...extra);
 return createHarness(data);
}
function unchanged(h){
 assert.equal(h.storage.writeCount,0);
 assert.deepEqual(h.storage.raw(),h.storage.initial);
 assert.equal(h.networkAttempts.length,0);
}
test('GAP-001: after Wolf context, food pronoun finds only its local fact',async()=>{
 const h=make();
 assert.match(await h.ask('Wo lebt der Wolf?'),/Nebelwald von Testland/);
 const answer=await h.ask('Und was frisst er?');
 assert.match(answer,/^NERYX · KOORDINIERTE ANTWORT/);
 assert.match(answer,/Silberfische aus Testland/);
 assert.match(answer,/nicht unabhängig verifiziert/);
 assert.doesNotMatch(answer,/Nebelwald von Testland/);
 assert.equal(h.observe().lastSubject,'wolf');
 unchanged(h);
});
test('GAP-001: no subject -> clarification, not a guessed Wolf answer',async()=>{
 const h=make();
 assert.match(await h.ask('Und was frisst er?'),/^NERYX · RÜCKFRAGE/);
 assert.equal(h.observe().lastSubject,null);
 unchanged(h);
});
test('GAP-001: a missing diet fact stays an explicit knowledge gap',async()=>{
 const h=createHarness(fixtures);
 await h.ask('Wo lebt der Wolf?');
 const answer=await h.ask('Und was frisst er?');
 assert.match(answer,/^NERYX · WISSENSLÜCKE/);
 assert.doesNotMatch(answer,/Nebelwald von Testland/);
 unchanged(h);
});
test('GAP-001: conflicting diet claims prevent an unqualified answer',async()=>{
 const h=make([{id:'fixture-food-2',subject:'Wolf',property:'nahrung',value:'Bergkräuter aus Testland',source:'synthetic-test-2',confidence:1,conflict:false,alternatives:[],created:1700000000000,updated:1700000000000}]);
 await h.ask('Wo lebt der Wolf?');
 const answer=await h.ask('Und was frisst er?');
 assert.match(answer,/^NERYX · WISSENSKONFLIKT/);
 assert.doesNotMatch(answer,/^NERYX · KOORDINIERTE ANTWORT/);
 unchanged(h);
});
