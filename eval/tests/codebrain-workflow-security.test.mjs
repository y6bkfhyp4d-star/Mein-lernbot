import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(fileURLToPath(new URL(path,root)),'utf8');

test('manual CodeBrain workflow stays read-only, default-branch gated, secret-free',()=>{
 const text=read('.github/workflows/neryx-codebrain.yml');
 assert.match(text,/^\s*workflow_dispatch:/m);
 assert.doesNotMatch(text,/^\s*pull_request_target:/m);
 assert.match(text,/^\s*contents: read$/m);
 assert.match(text,/^\s*pull-requests: read$/m);
 assert.doesNotMatch(text,/^\s*(?:contents|pull-requests|actions): write$/m);
 assert.doesNotMatch(text,/secrets\s*\./);
 assert.match(text,/github\.ref == 'refs\/heads\/main'/);
 assert.match(text,/^\s+ref: main$/m);
 assert.match(text,/persist-credentials: false/);
 assert.match(text,/npm ci --ignore-scripts/);
 assert.doesNotMatch(text,/npm (?:install|ci)(?![^\n]*--ignore-scripts)/);
 assert.doesNotMatch(text,/pull_request_target|sudo |curl .*\|.*sh|eval\s+/);
 assert.match(text,/timeout-minutes:/);
});
test('public smoke workflow has no token permissions, secrets, or privileged trigger',()=>{
 const text=read('.github/workflows/neryx-codebrain-public-smoke.yml');
 assert.match(text,/permissions: \{\}/);
 assert.match(text,/^\s*pull_request:/m);
 assert.doesNotMatch(text,/^\s*pull_request_target:/m);
 assert.doesNotMatch(text,/secrets\s*\.|github\.token|GH_TOKEN|GITHUB_TOKEN/);
 assert.doesNotMatch(text,/npm install/);
 assert.doesNotMatch(text,/npm ci(?![^\n]*--ignore-scripts)/);
 assert.match(text,/working-directory: eval\/genesis-ast/);
 assert.match(text,/npm ci --ignore-scripts --no-audit --no-fund/);
 assert.match(text,/persist-credentials: false/);
 assert.match(text,/timeout-minutes:/);
 assert.match(text,/CODEBRAIN_LIVE_PUBLIC: '1'/);
 assert.match(text,/cancel-in-progress: true/);
 assert.match(text,/codebrain-rate-limit-retry\.test\.mjs/);
 assert.match(text,/codebrain-rate-limit-diagnostics\.test\.mjs/);
 assert.match(text,/timeout-minutes: 5/);
 assert.match(text,/CODEBRAIN_PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \}\}/);
 assert.match(text,/codebrain-snapshot-smoke:/);
 assert.match(text,/fetch-depth: 2/);
 assert.match(text,/codebrain-git-snapshot\.test\.mjs/);
 assert.match(text,/CODEBRAIN_PR_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(text,/node eval\/tests\/codebrain-git-snapshot\.mjs/);
 assert.match(text,/ruby -c \.github\/scripts\/neryx-yaml-syntax\.rb/);
 assert.doesNotMatch(text,/open PR 97/);
});
test('Python and YAML parser helpers do not run or deserialize analyzed source',()=>{
 const py=read('.github/scripts/neryx-python-syntax.py');
 const rb=read('.github/scripts/neryx-yaml-syntax.rb');
 assert.match(py,/ast\.parse\(/);
 assert.doesNotMatch(py,/\b(?:eval|exec|compile)\s*\(/);
 assert.match(rb,/Psych\.parse_stream\(/);
 assert.doesNotMatch(rb,/\b(?:unsafe_load|load_file|eval|system|exec|spawn)\s*\(/);
});

 // Decode only scalar/map/sequence AST nodes, never construct Ruby objects.
 // Reject aliases, tags and duplicate keys rather than guessing their semantics.
 const decoder=String.raw`
 require 'psych'
 require 'json'
 def decode(n)
   case n
   when Psych::Nodes::Mapping
     raise 'tag' if n.tag || n.anchor
     out={}
     n.children.each_slice(2) do |k,v|
       raise 'key' unless k.is_a?(Psych::Nodes::Scalar) && !k.tag && !k.anchor
       raise 'duplicate or merge key' if out.key?(k.value) || k.value == '<<'
       out[k.value]=decode(v)
     end
     out
   when Psych::Nodes::Sequence
     raise 'tag' if n.tag || n.anchor
     n.children.map { |c| decode(c) }
   when Psych::Nodes::Scalar
     raise 'tag' if n.tag || n.anchor
     n.value
   else
     raise 'unsupported node'
   end
 end
 stream=Psych.parse_stream(STDIN.read(70001))
 raise 'document count' unless stream.children.length == 1
 puts JSON.generate(decode(stream.children.first.root))
 `;
 function workflowStructure(source){
   assert.ok(Buffer.byteLength(source)<=70000);
   return JSON.parse(execFileSync('ruby',['-W0','-e',decoder],{
     input:source,timeout:5000,killSignal:'SIGKILL',maxBuffer:262144,
     stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8'}
   }).toString('utf8'));
 }
 function checkStructure(source,manual){
   const w=workflowStructure(source);
   const mapping=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
   assert.ok(mapping(w)&&mapping(w.on)&&mapping(w.permissions)&&mapping(w.jobs));
   assert.deepEqual(Object.keys(w.on),[manual?'workflow_dispatch':'pull_request']);
   assert.deepEqual(w.permissions,manual?{contents:'read','pull-requests':'read'}:{});
   const ids=manual?['codebrain-manual']:['codebrain-public-smoke','codebrain-snapshot-smoke'];
   assert.deepEqual(Object.keys(w.jobs).sort(),ids.sort());
   assert.equal(Object.hasOwn(w,'env'),false);
   for(const [id,job] of Object.entries(w.jobs)){
     assert.ok(mapping(job));
     // No alternate runner, job-level token elevation, reusable workflow,
     // environment secrets, service container or matrix expansion.
     const allowed=new Set(['name','if','runs-on','timeout-minutes','steps']);
     assert.ok(Object.keys(job).every(k=>allowed.has(k)),id+' unexpected job key');
     assert.equal(job['runs-on'],'ubuntu-24.04');
     assert.equal(job['timeout-minutes'],'5');
     if(manual)assert.equal(job.if,"github.ref == 'refs/heads/main'");
     else assert.equal(Object.hasOwn(job,'if'),false);
     assert.ok(Array.isArray(job.steps)&&job.steps.length>0);
     for(const step of job.steps){
       assert.ok(mapping(step));
       assert.ok(Object.keys(step).every(k=>['name','uses','with','run','working-directory','env'].includes(k)));
       assert.notEqual(Object.hasOwn(step,'uses'),Object.hasOwn(step,'run'));
       if(step.uses){
         assert.ok(mapping(step.with));
         if(step.uses==='actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8'){
           assert.equal(step.with['persist-credentials'],'false');
           if(manual)assert.equal(step.with.ref,'main');
           else assert.equal(Object.hasOwn(step.with,'ref'),false);
           assert.ok(Object.keys(step.with).every(k=>['ref','persist-credentials','fetch-depth'].includes(k)));
         }else{
           assert.equal(step.uses,'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020');
           assert.deepEqual(step.with,{'node-version':'22'});
         }
         assert.equal(Object.hasOwn(step,'env'),false);
       }
     }
   }
 }
 test('workflow structural policy checks both real workflows',()=>{
   checkStructure(read('.github/workflows/neryx-codebrain.yml'),true);
   checkStructure(read('.github/workflows/neryx-codebrain-public-smoke.yml'),false);
 });
 test('workflow structural policy rejects permission overrides and ambiguous YAML',()=>{
   const source=read('.github/workflows/neryx-codebrain-public-smoke.yml');
   for(const changed of [
     source.replace('permissions: {}','permissions: {contents: write}'),
     source.replace('permissions: {}','permissions: {}\npermissions: {}'),
     source.replace('    runs-on: ubuntu-24.04','    permissions: {contents: write}\n    runs-on: ubuntu-24.04'),
     source.replace('    runs-on: ubuntu-24.04','    runs-on: self-hosted'),
     source.replace('permissions: {}','permissions: &p {}'),
     source.replace('permissions: {}','permissions: !custom {}'),
     source.replace('  pull_request:','  pull_request_target:'),
     source.replace('persist-credentials: false','persist-credentials: true'),
     source.replace('node-version: \'22\'','node-version: \'22\'\n          token: fake')
   ]){
     assert.notEqual(changed,source);
     assert.throws(()=>checkStructure(changed,false));
   }
 });

test('offline snapshot must receive the event base and head identities',()=>{
 const w=workflowStructure(read('.github/workflows/neryx-codebrain-public-smoke.yml'));
 const scan=w.jobs['codebrain-snapshot-smoke'].steps.find(s=>s.run==='node eval/tests/codebrain-git-snapshot.mjs');
 assert.equal(scan.env.CODEBRAIN_PR_BASE_SHA,'${{ github.event.pull_request.base.sha }}');
 assert.equal(scan.env.CODEBRAIN_PR_HEAD_SHA,'${{ github.event.pull_request.head.sha }}');
});

test('manual scanner requires sandbox adapters and stages images before token-bearing scan',()=>{
 const w=workflowStructure(read('.github/workflows/neryx-codebrain.yml'));
 const steps=w.jobs['codebrain-manual'].steps;
 const i=steps.findIndex(s=>s.run==='node .github/scripts/neryx-codebrain.mjs');
 assert.ok(i>0);
 assert.match(steps[i-1].run,/docker pull --platform linux\/amd64/);
 assert.match(steps[i-1].run,/CODEBRAIN_SANDBOX_STAGE/);
 assert.equal(Object.hasOwn(steps[i-1],'env'),false);
 const cli=read('.github/scripts/neryx-codebrain.mjs').split('if(process.argv[1]&&import.meta.url===')[1];
 assert.match(cli,/createSandboxParsers\(\{stage:process.env.CODEBRAIN_SANDBOX_STAGE\}\)/);
 assert.match(cli,/token:process.env.GH_TOKEN,\.\.\.parsers/);
 assert.doesNotMatch(cli,/astWorkerDefault|pythonSyntaxDefault|yamlSyntaxDefault/);
});
