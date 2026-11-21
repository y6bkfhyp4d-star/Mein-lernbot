/* GAP-002 regression: only explicit, narrow ellipsis with established subject. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url),'utf8'));
function intact(h){
 assert.equal(h.storage.writeCount,0);
 assert.deepEqual(h.storage.raw(),h.storage.initial);
 assert.equal(h.networkAttempts.length,0);
}
test('GAP-002: short habitat follow-up reuses the exact Wolf subject',async()=>{
 const h=createHarness(fixture);
 assert.match(await h.ask('Wo lebt der Wolf?'),/Nebelwald von Testland/);
 const answer=await h.ask('Und sein Lebensraum?');
 assert.match(answer,/^NERYX · KOORDINIERTE ANTWORT/);
 assert.match(answer,/Nebelwald von Testland/);
 assert.equal(h.observe().lastSubject,'wolf');
 intact(h);
});
test('GAP-002: no earlier subject requires clarification',async()=>{
 const h=createHarness(fixture);
 assert.match(await h.ask('Und sein Lebensraum?'),/^NERYX · RÜCKFRAGE/);
 assert.equal(h.observe().lastSubject,null);
 intact(h);
});
test('GAP-002: unknown new topic clears old ellipsis context',async()=>{
 const h=createHarness(fixture);
 await h.ask('Wo lebt der Wolf?');
 await h.ask('Wo lebt das Okapi?',{allowTeaching:true});
 const answer=await h.ask('Und sein Lebensraum?');
 assert.match(answer,/^NERYX · RÜCKFRAGE/);
 assert.doesNotMatch(answer,/Nebelwald von Testland/);
 assert.equal(h.observe().lastSubject,null);
 intact(h);
});
test('GAP-002: contradictory habitat values remain a conflict',async()=>{
 const data=structuredClone(fixture);
 data.main.facts.push({id:'fixture-habitat-2',subject:'Wolf',property:'lebensraum',value:'Steppenland von Testland',source:'synthetic-test-2',confidence:1,conflict:false,alternatives:[],created:1700000000000,updated:1700000000000});
 const h=createHarness(data);
 assert.match(await h.ask('Wo lebt der Wolf?'),/^NERYX · WISSENSKONFLIKT/);
 const answer=await h.ask('Und sein Lebensraum?');
 assert.match(answer,/^NERYX · WISSENSKONFLIKT/);
 assert.doesNotMatch(answer,/^NERYX · KOORDINIERTE ANTWORT/);
 intact(h);
});
