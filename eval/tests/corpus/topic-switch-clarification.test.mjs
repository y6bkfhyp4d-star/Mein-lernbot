/* GAP-003: an ambiguous habitat follow-up must never revive stale context. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const fixtures=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url),'utf8'));
const question='Und was ist mit seinem Lebensraum?';
function intact(h){
 assert.deepEqual(h.storage.raw(),h.storage.initial);
 assert.equal(h.storage.writeCount,0);
 assert.equal(h.networkAttempts.length,0);
}
test('GAP-003: no prior topic -> clarification rather than related knowledge',async()=>{
 const h=createHarness(fixtures);
 const answer=await h.ask(question);
 assert.match(answer,/^NERYX · RÜCKFRAGE/);
 assert.doesNotMatch(answer,/Nebelwald von Testland|VERWANDTES WISSEN/);
 assert.equal(h.observe().lastSubject,null);
 intact(h);
});
test('GAP-003: unknown new topic clears reference, not merely a related Wolf hit',async()=>{
 const h=createHarness(fixtures);
 assert.match(await h.ask('Wo lebt der Wolf?'),/Nebelwald von Testland/);
 assert.equal(h.observe().lastSubject,'wolf');
 await h.ask('Wo lebt das Okapi?',{allowTeaching:true});
 assert.equal(h.observe().lastSubject,null);
 const answer=await h.ask(question,{allowTeaching:true});
 assert.match(answer,/^NERYX · RÜCKFRAGE/);
 assert.doesNotMatch(answer,/Nebelwald von Testland|VERWANDTES WISSEN/);
 intact(h);
});
test('GAP-003: unambiguous existing subject uses only its own habitat',async()=>{
 const h=createHarness(fixtures);
 await h.ask('Wo lebt der Wolf?');
 const answer=await h.ask(question);
 assert.match(answer,/^NERYX · KOORDINIERTE ANTWORT/);
 assert.match(answer,/Nebelwald von Testland/);
 assert.equal(h.observe().lastSubject,'wolf');
 intact(h);
});
test('GAP-003: conflicting habitat stays a conflict',async()=>{
 const data=structuredClone(fixtures);
 data.main.facts.push({
  id:'fixture-wolf-conflict',subject:'Wolf',property:'lebensraum',
  value:'Steppenland von Testland',source:'synthetic-test-2',confidence:1,
  conflict:false,alternatives:[],created:1700000000000,updated:1700000000000
 });
 const h=createHarness(data);
 await h.ask('Wo lebt der Wolf?');
 const answer=await h.ask(question);
 assert.match(answer,/^NERYX · WISSENSKONFLIKT/);
 assert.doesNotMatch(answer,/^NERYX · KOORDINIERTE ANTWORT/);
 intact(h);
});
