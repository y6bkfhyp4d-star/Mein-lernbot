/* Regression: a new chat must discard conversational context, not stored facts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url),'utf8'));
test('clearChat ends prior subject reference but preserves knowledge',async()=>{
 const h=createHarness(fixture);
 assert.match(await h.ask('Wo lebt der Wolf?'),/Nebelwald von Testland/);
 assert.equal(h.observe().lastSubject,'wolf');
 h.resetChat();
 assert.equal(h.observe().lastSubject,null,'new chat retained old subject');
 assert.deepEqual(h.observe().context,{subject:'',property:'',awaiting:null});
 assert.match(await h.ask('Und wo lebt es?'),/^NERYX · RÜCKFRAGE/);
 assert.match(await h.ask('Und sein Lebensraum?'),/^NERYX · RÜCKFRAGE/);
 assert.match(await h.ask('Und was ist mit seinem Lebensraum?'),/^NERYX · RÜCKFRAGE/);
 assert.deepEqual(h.storage.raw(),h.storage.initial);
 assert.equal(h.storage.writeCount,0);
 assert.equal(h.networkAttempts.length,0);
 assert.match(await h.ask('Wo lebt der Wolf?'),/Nebelwald von Testland/);
});
