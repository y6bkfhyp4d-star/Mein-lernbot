/* 0.3b: unknown subjects and unknown attributes must not borrow known facts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const fixtures=read('./fixtures.json'), cases=read('./negatives.json');

test('0.3b: missing knowledge stays missing without invented answers',async()=>{
  assert.equal(cases.length,3);
  for(const {question,allowTeaching,marker,lastSubject} of cases){
    const h=createHarness(fixtures);
    const answer=await h.ask(question,{allowTeaching});
    assert.equal(typeof answer,'string',question);
    assert.ok(answer.includes(marker),question);
    assert.doesNotMatch(answer,/Nebelwald von Testland|NERYX · KOORDINIERTE ANTWORT/,question);
    assert.equal(h.observe().lastSubject,lastSubject,question);
    assert.deepEqual(h.storage.raw(),h.storage.initial,question);
    assert.equal(h.storage.writeCount,0,question);
    assert.equal(h.networkAttempts.length,0,question);
  }
});
