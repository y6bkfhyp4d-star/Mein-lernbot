/* 0.4: diagnostic observations, never claim TODOs are passing features. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHarness} from './harness.mjs';

const load=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const base=load('./fixtures.json');
const gaps=load('./known-gaps.json');
const habitat='Nebelwald von Testland';
const food='Silberfische aus Testland';

test('0.4: observe unresolved conversation capabilities without accepting fabricated facts',async()=>{
  assert.equal(gaps.length,3);
  for(const gap of gaps){
    const fixtures=structuredClone(base);
    fixtures.main.facts.push({
      id:'fixture-wolf-food',subject:'Wolf',property:'nahrung',value:food,
      source:'synthetic-test',confidence:1,conflict:false,alternatives:[],
      created:1700000000000,updated:1700000000000
    });
    const h=createHarness(fixtures);
    for(const setup of gap.setup)await h.ask(setup,{allowTeaching:true});
    const prior=h.observe().lastSubject;
    const answer=await h.ask(gap.question,{allowTeaching:true});
    const after=h.observe().lastSubject;
    assert.equal(typeof answer,'string',gap.id);
    assert.deepEqual(h.storage.raw(),h.storage.initial,gap.id+': changed data');
    assert.equal(h.storage.writeCount,0,gap.id+': unexpected write');
    assert.equal(h.networkAttempts.length,0,gap.id+': unexpected fetch');
    let verdict;
    if(gap.id==='GAP-001')verdict=answer.includes(food)?'feature_observed':'gap_observed';
    else if(gap.id==='GAP-002')verdict=
      answer.includes(habitat)||answer.startsWith('NERYX · RÜCKFRAGE')?'feature_observed':'gap_observed';
    else {
      assert.ok(!answer.includes(habitat),gap.id+': leaked stale Wolf fact');
      verdict=answer.startsWith('NERYX · RÜCKFRAGE')?'feature_observed':'partial_no_leak_without_clarification';
    }
    console.log('GAP_DIAGNOSTIC '+JSON.stringify({
      id:gap.id,verdict,priorSubject:prior,afterSubject:after,
      answer:answer.slice(0,450)
    }));
  }
});
