/* 0.3f: documented gaps are NOT passing behavior tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gaps=JSON.parse(readFileSync(new URL('./known-gaps.json',import.meta.url),'utf8'));

test('0.3f: known-gap registry has a unique, actionable schema',()=>{
  assert.ok(Array.isArray(gaps)&&gaps.length>=3);
  const ids=new Set();
  for(const gap of gaps){
    assert.match(gap.id,/^GAP-\d{3}$/);
    assert.ok(!ids.has(gap.id),'duplicate gap '+gap.id);
    ids.add(gap.id);
    assert.ok(typeof gap.title==='string'&&gap.title.length>=8);
    assert.ok(Array.isArray(gap.setup)&&gap.setup.every(s=>typeof s==='string'&&s.trim()));
    assert.ok(typeof gap.question==='string'&&gap.question.trim());
    assert.ok(typeof gap.target==='string'&&gap.target.length>=25);
    assert.ok(typeof gap.evidence==='string'&&gap.evidence.length>=25);
    assert.equal(gap.status,'open-unverified');
  }
});
for(const gap of gaps){
  test.todo(gap.id+' – '+gap.title+' (open: '+gap.target+')');
}
