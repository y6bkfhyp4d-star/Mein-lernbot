/* 0.3e: input bounds and whitespace through real NERYX routing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const fixtures=read('./fixtures.json'),cases=read('./robustness.json');

test('0.3e: malformed and oversized questions are handled safely',async()=>{
  assert.equal(cases.length,5);
  for(const c of cases){
    const h=createHarness(fixtures);
    const answer=await h.ask(c.input);
    assert.equal(typeof answer,'string',c.name);
    assert.ok(answer.includes(c.expect),c.name+': unexpected answer '+answer);
    assert.ok(!answer.includes(c.not),c.name+': forbidden content '+answer);
    assert.equal(h.observe().lastSubject,c.subject,c.name);
    assert.deepEqual(h.storage.raw(),h.storage.initial,c.name+': knowledge changed');
    assert.equal(h.storage.writeCount,0,c.name+': storage write');
    assert.equal(h.networkAttempts.length,0,c.name+': network access');
  }
});
