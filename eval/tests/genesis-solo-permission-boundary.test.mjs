// Conservative permission contract for a solo maintainer.
// Static regression only: runtime token isolation requires an external GitHub test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const phases={
  '70':['neryx/research-phase70','evolution/phase70/knowledge.json'],
  '76':['neryx/research-phase76','evolution/phase76/review76.json'],
  '77':['neryx/research-phase77','evolution/phase77/research77.json'],
  '78':['neryx/research-phase78','evolution/phase78/research78.json'],
  '79':['neryx/research-phase79','evolution/phase79/research79.json'],
  '710':['neryx/research-phase710','evolution/phase710/research710.json'],
  '711':['neryx/research-phase711','evolution/phase711/research711.json'],
  '712':['neryx/research-phase712','evolution/phase712/audit712.json,evolution/phase712/research711.json'],
  '713':['neryx/research-phase713','evolution/phase713/audit713.json,evolution/phase713/research711.json']
};

for(const [phase,[branch,files]] of Object.entries(phases)){
  test(`solo permission boundary: research phase ${phase} writes to its specific data branch only`,()=>{
    const yml=read(`.github/workflows/lernbot-phase${phase}.yml`);
    assert.match(yml,/^permissions:\s*\n\s+contents: write/m);
    assert.doesNotMatch(yml,/^\s+(?:pull-requests|actions|deployments|id-token): write\s*$/m);
    assert.ok(yml.includes(`REPORT_BRANCH: ${branch}`));
    assert.ok(yml.includes(`REPORT_FILES: ${files}`));
    assert.match(yml,/\bref: main\b/);
    assert.match(yml,/research-review-branch\.sh prepare/);
    assert.match(yml,/research-review-branch\.sh publish/);
    assert.doesNotMatch(yml,/\b(?:gh pr merge|gh pr create|vercel deploy|git push)\b/);
  });
}

test('solo publisher keeps a fixed branch/file allowlist and never names main as push target',()=>{
  const code=read('.github/scripts/research-review-branch.sh');
  for(const [branch,files] of Object.values(phases))
    assert.ok(code.includes(`${branch}|${files}`));
  assert.match(code,/branch and report allowlist mismatch/);
  assert.match(code,/git reset --hard "\$main_sha"/);
  assert.match(code,/git push origin "\$new_sha:refs\/heads\/\$REPORT_BRANCH"/);
  assert.doesNotMatch(code,/git push[^\n]*refs\/heads\/main|git push[^\n]*--force|gh pr merge|vercel deploy/);
});

test('existing trusted candidate gate remains read-only; no untrusted PR checkout',()=>{
  const code=read('.github/workflows/neryx-genesis-candidate-trusted.yml');
  assert.match(code,/^\s+contents: read\s*$/m);
  assert.match(code,/^\s+pull-requests: read\s*$/m);
  assert.doesNotMatch(code,/^\s+(?:contents|pull-requests|actions|deployments): write\s*$/m);
  assert.match(code,/pull_request_target/);
  assert.doesNotMatch(code,/actions\/checkout|git push|gh pr merge|vercel deploy/);
});

test('solo mode is documented as a manual non-autonomous approval',()=>{
  const doc=read('docs/GENESIS_X_SOLO_OWNER_MODE.md');
  assert.match(doc,/keine autonomen Codeänderungen|weder.*selbstständig.*Code/i);
  assert.match(doc,/keine unabhängige Zweitprüfung|keine unabhängige Zweitreview/i);
  assert.match(doc,/kein automatischer Merge|Keine.*autonom.*Merge/i);
});
