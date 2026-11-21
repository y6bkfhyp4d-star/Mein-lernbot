/* 0.3d: contradictory synthetic claims must not become a selected factual answer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const base=read('./fixtures.json'),cases=read('./conflicts.json');

test('0.3d: real answer routing flags conflicting claims without choosing a winner',async()=>{
  assert.equal(cases.length,2);
  for(const item of cases){
    const fixtures=structuredClone(base);
    if(item.extraMain)fixtures.main.facts.push(item.extraMain);
    if(item.extraTopic)fixtures.topics.records.push(item.extraTopic);
    const h=createHarness(fixtures);
    const answer=await h.ask(item.question,{allowTeaching:true});
    assert.match(answer,/^NERYX · WISSENSKONFLIKT/,item.name);
    assert.match(answer,/kann nicht entscheiden, welche richtig ist/,item.name);
    assert.doesNotMatch(answer,/NERYX · KOORDINIERTE ANTWORT/,item.name);
    for(const origin of item.expectedOrigins)assert.ok(answer.includes(origin),item.name+': missing '+origin);
    assert.equal(h.observe().lastSubject,'wolf',item.name);
    assert.deepEqual(h.storage.raw(),h.storage.initial,item.name);
    assert.equal(h.storage.writeCount,0,item.name);
    assert.equal(h.networkAttempts.length,0,item.name);
    assert.equal(await createHarness(fixtures).ask(item.question,{allowTeaching:true}),answer,item.name+': nondeterministic');
  }
});
