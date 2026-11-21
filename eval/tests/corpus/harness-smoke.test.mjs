import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const fixtures=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url),'utf8'));

test('0.2: real NERYX modules answer one isolated fixture fact',async()=>{
  const h=createHarness(fixtures);
  const reply=await h.ask('Wo lebt der Wolf?');
  assert.equal(typeof reply,'string');
  assert.ok(reply.trim().length>0);
  assert.match(reply,/Nebelwald von Testland/);
  assert.doesNotMatch(reply,/Dazu kenne ich noch keine bestätigte Antwort\./);
  assert.equal(h.observe().lastSubject,'wolf');
  assert.deepEqual(h.storage.raw(),h.storage.initial,'A question must not change fixture knowledge');
  assert.equal(h.storage.writeCount,0,'No storage write expected for a read-only question');
  assert.equal(h.networkAttempts.length,0,'No network call allowed');
  const second=createHarness(fixtures);
  assert.equal(await second.ask('Wo lebt der Wolf?'),reply,'Fresh instances must answer deterministically');
  assert.deepEqual(second.storage.raw(),second.storage.initial);
  assert.equal(second.networkAttempts.length,0);
  console.log('NERYX 0.2 stubs:',h.stubbed.join(', '));
});
