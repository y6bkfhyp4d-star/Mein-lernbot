/* 0.3c: actual multi-turn topic reference with isolated synthetic facts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const json=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const fixtures=json('./fixtures.json');
const scenarios=json('./topic-switch.json');

test('0.3c: pronouns resolve only to an established, still valid subject',async()=>{
  assert.equal(scenarios.length,3);
  for(const {name,steps} of scenarios){
    const h=createHarness(fixtures);
    for(const step of steps){
      const answer=await h.ask(step.question,{allowTeaching:step.allowTeaching??false});
      assert.equal(typeof answer,'string',name+': '+step.question);
      assert.ok(answer.includes(step.contains),name+': '+step.question+' => '+answer);
      if(step.excludes)assert.ok(!answer.includes(step.excludes),name+': wrong carryover');
      assert.equal(h.observe().lastSubject,step.lastSubject,name+': subject after '+step.question);
      assert.deepEqual(h.storage.raw(),h.storage.initial,name+': changed stored knowledge');
      assert.equal(h.storage.writeCount,0,name+': wrote to storage');
      assert.equal(h.networkAttempts.length,0,name+': attempted network');
    }
  }
});
