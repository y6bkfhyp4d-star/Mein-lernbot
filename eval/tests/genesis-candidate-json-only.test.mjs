// Run proposed candidate policy on disposable local Git commits.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const source=read('.github/workflows/neryx-genesis-candidate-policy.yml');
const trusted=read('.github/workflows/neryx-genesis-candidate-trusted.yml');
const lines=source.split('\n');
const begin=lines.findIndex(s=>s.includes('python3 - "$BASE_SHA"')&&s.includes("<<'PY'"));
const end=lines.indexOf('          PY',begin+1);
assert.ok(begin>=0&&end>begin);
const python=lines.slice(begin+1,end).map(s=>s.startsWith('          ')?s.slice(10):s).join('\n')+'\n';
const allowedPattern='(?:candidates|eval/candidates)/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+\\.json';
assert.ok(source.includes(allowedPattern));
assert.ok(trusted.includes(allowedPattern));
assert.match(trusted,/status not in \("added", "modified"\)/);
assert.match(trusted,/previous_filename/);
assert.match(source,/--no-renames/);

function exec(cwd,cmd,args){
  const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,r.stderr);
  return r.stdout.trim();
}
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'genesis-json-only-'));
  t.after(()=>rmSync(dir,{force:true,recursive:true}));
  exec(dir,'git',['init','--initial-branch=main']);
  exec(dir,'git',['config','user.name','Local safety test']);
  exec(dir,'git',['config','user.email','test@example.invalid']);
  writeFileSync(join(dir,'README.md'),'baseline\n');
  exec(dir,'git',['add','.']);
  exec(dir,'git',['commit','-m','baseline']);
  const base=exec(dir,'git',['rev-parse','HEAD']);
  return {dir,base};
}
function change(dir,path,content){
  const f=join(dir,path);mkdirSync(dirname(f),{recursive:true});
  writeFileSync(f,content);
}
const cases=[
  {name:'permitted root JSON',path:'candidates/example.json',pass:true},
  {name:'permitted nested JSON',path:'eval/candidates/phase7/example_1.json',pass:true},
  {name:'deny executable JS',path:'candidates/probe.js',pass:false},
  {name:'deny fake JSON suffix',path:'eval/candidates/probe.json.js',pass:false},
  {name:'deny docs file',path:'docs/example.json',pass:false},
  {name:'deny dot-folder',path:'candidates/.hidden/evil.json',pass:false},
  {name:'deny uppercase extension',path:'candidates/probe.JSON',pass:false},
];
for(const scenario of cases){
  test('auto JSON-only policy: '+scenario.name,t=>{
    const {dir,base}=fixture(t);
    change(dir,scenario.path,'{"probe":true}\n');
    exec(dir,'git',['add','.']);
    exec(dir,'git',['commit','-m','probe']);
    const r=spawnSync('python3',['-c',python,base],{cwd:dir,encoding:'utf8',timeout:10000});
    assert.equal(r.status===0,scenario.pass,r.stdout+'\n'+r.stderr);
  });
}
test('auto JSON-only policy denies deletion',t=>{
  const {dir}=fixture(t);
  change(dir,'candidates/old.json','{"safe":true}\n');
  exec(dir,'git',['add','.']);
  exec(dir,'git',['commit','-m','initial']);
  const base=exec(dir,'git',['rev-parse','HEAD']);
  exec(dir,'git',['rm','candidates/old.json']);
  exec(dir,'git',['commit','-m','delete']);
  const r=spawnSync('python3',['-c',python,base],{cwd:dir,encoding:'utf8'});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/DENIED/);
});
