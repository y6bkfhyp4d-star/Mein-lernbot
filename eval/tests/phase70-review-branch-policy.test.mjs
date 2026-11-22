// Static defense-in-depth checks, NOT a substitute for active GitHub branch protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path,root),'utf8');
const publisher = read('.github/scripts/research-review-branch.sh');
const phases = {
  '70':'evolution/phase70/knowledge.json',
  '76':'evolution/phase76/review76.json',
  '77':'evolution/phase77/research77.json',
  '78':'evolution/phase78/research78.json',
  '79':'evolution/phase79/research79.json',
  '710':'evolution/phase710/research710.json',
  '711':'evolution/phase711/research711.json',
  '712':'evolution/phase712/audit712.json,evolution/phase712/research711.json',
  '713':'evolution/phase713/audit713.json,evolution/phase713/research711.json'
};
for (const [phase,files] of Object.entries(phases)) {
  test(`Phase ${phase} schedules trusted-main research, never direct main pushes`,()=>{
    const w=read(`.github/workflows/lernbot-phase${phase}.yml`);
    assert.match(w,new RegExp(`REPORT_BRANCH: neryx/research-phase${phase}\\b`));
    assert.ok(w.includes(`REPORT_FILES: ${files}`));
    assert.match(w,/ref: main/);
    assert.match(w,/research-review-branch\.sh prepare/);
    assert.match(w,/research-review-branch\.sh publish/);
    assert.doesNotMatch(w,/\bgit push\b|\bgit pull\b|\bgh pr merge\b|\bvercel deploy\b/);
    assert.doesNotMatch(w,/\bpush:\s*\n\s*branches:/);
    assert.match(w,/\bworkflow_dispatch:/);
    assert.match(w,/\bschedule:/);
  });
}
test('publisher restricts branches/files and cannot push to main',()=>{
  assert.match(publisher,/branch and report allowlist mismatch/);
  for(const [phase,files] of Object.entries(phases)){
    assert.ok(publisher.includes(`neryx/research-phase${phase}|${files}`));
  }
  assert.match(publisher,/git show "\$old_sha:\$path"/);
  assert.match(publisher,/python3 -m json\.tool/);
  assert.match(publisher,/git reset --hard "\$main_sha"/);
  assert.match(publisher,/git write-tree/);
  assert.match(publisher,/git commit-tree/);
  assert.match(publisher,/git push origin "\$new_sha:refs\/heads\/\$REPORT_BRANCH"/);
  assert.doesNotMatch(publisher,/git push[^\n]*main\b|git push[^\n]*--force|\bgh pr merge\b|\bvercel deploy\b/);
});
test('existing generator and cross-check tests are retained',()=>{
  const expected = {
    '70':['test_*.py','evolution/phase70/engine.py'],
    '76':['test_check76.py','evolution/phase76/check76.py'],
    '77':['test_research77.py','evolution/phase77/research77.py'],
    '78':['test_research78.py','evolution/phase78/research78.py'],
    '79':['test_research79.py','evolution/phase79/research79.py'],
    '710':['test_research710.py','evolution/phase710/research710.py'],
    '711':['test_research710.py','test_research711.py','evolution/phase711/research711.py'],
    '712':['test_audit712.py','evolution/phase712/audit712.py','cp evolution/phase711/research711.json'],
    '713':['test_audit713.py','evolution/phase713/audit713.py','cp evolution/phase711/research711.json']
  };
  for(const [phase,patterns] of Object.entries(expected)){
    const w=read(`.github/workflows/lernbot-phase${phase}.yml`);
    for(const pattern of patterns)assert.ok(w.includes(pattern),`phase ${phase}: ${pattern}`);
  }
});
