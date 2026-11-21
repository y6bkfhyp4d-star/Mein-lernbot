/* 0.3a: real integrated routing across equivalent question forms. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const json=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const fixtures=json('./fixtures.json');
const questions=json('./paraphrases.json');

test('0.3a: paraphrases use real local knowledge without writes or model',async()=>{
  assert.equal(questions.length,3);
  for(const {question,expected,subject} of questions){
    const h=createHarness(fixtures);
    const response=await h.ask(question);
    assert.match(response,new RegExp(expected),question);
    assert.match(response,/NERYX · KOORDINIERTE ANTWORT/,question);
    assert.equal(h.observe().lastSubject,subject,question);
    assert.deepEqual(h.storage.raw(),h.storage.initial,question);
    assert.equal(h.storage.writeCount,0,question);
    assert.equal(h.networkAttempts.length,0,question);
  }
});
