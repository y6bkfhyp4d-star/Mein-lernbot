/* Ausschließlich künstliche Dummy-Daten. Kein echtes Frozen-Set. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {externalFrozenPath,assertFrozenNotCI} from '../frozen-path-policy.mjs';
import {loadFrozen} from '../frozen-loader.mjs';
const loader=fileURLToPath(new URL('../frozen-loader.mjs',import.meta.url));
const moduleUrl=pathToFileURL(loader).href;
const sha=x=>createHash('sha256').update(x).digest('hex');
function setup(){
 const base=mkdtempSync(join(tmpdir(),'neryx-policy-'));
 const root=join(base,'repo'),out=join(base,'private');
 mkdirSync(root);mkdirSync(out);
 const fixture={schema:1,fixtureId:'fx-frozen-v1',
  claims:[{id:'fz-c001',text:'Die fiktive Box ist blau.',origin:'curated',conflicts:[]}]};
 const suite=[{schema:1,id:'fz-001',suite:'frozen',layers:['retrieval'],fixture:'fx-frozen-v1',
  category:'retrieval_hit',input:{question:'Welche Farbe?'},expect:{retrieval:{verdict:'sufficient',mustInclude:['fz-c001']}}}];
 const fb=Buffer.from(JSON.stringify(fixture)),sb=Buffer.from(JSON.stringify(suite));
 const fp=join(out,'fixture.json'),sp=join(out,'suite.json');
 writeFileSync(fp,fb);writeFileSync(sp,sb);
 const seal={schema:2,active:true,version:'dummy',adapterVersion:1,claimCount:1,itemCount:1,
  files:{fixture:{sha256:sha(fb)},suite:{sha256:sha(sb)}}};
 return {base,root,out,fp,sp,seal};
}
function invoke(x,{env={},paths=[x.fp,x.sp],seal=x.seal}={}){
 const script="import {loadFrozen} from "+JSON.stringify(moduleUrl)+";"+
  "const x=JSON.parse(process.env.NERYX_DUMMY_PARAMS);"+
  "const y=loadFrozen(x.fp,x.sp,x.root,x.seal);console.log(JSON.stringify({count:y.items.length,docs:y.documents.length}));";
 const p=spawnSync(process.execPath,['--input-type=module','-e',script],{
  encoding:'utf8',timeout:10000,
  env:{...process.env,CI:'',GITHUB_ACTIONS:'',...env,
   NERYX_DUMMY_PARAMS:JSON.stringify({fp:paths[0],sp:paths[1],root:x.root,seal})}
 });
 assert.equal(p.error,undefined);
 return p;
}
function withTmp(fn){
 const x=setup();
 try{return fn(x)}finally{rmSync(x.base,{recursive:true,force:true})}
}
test('Kanonischer externer Pfad wird akzeptiert',()=>withTmp(x=>{
 assert.equal(externalFrozenPath(x.fp,x.root),x.fp);
}));
test('Relativer Pfad wird abgelehnt',()=>withTmp(x=>{
 assert.throws(()=>externalFrozenPath('private/fixture.json',x.root));
}));
test('Datei im Repository wird abgelehnt',()=>withTmp(x=>{
 const inside=join(x.root,'test.json');writeFileSync(inside,'{}');
 assert.throws(()=>externalFrozenPath(inside,x.root));
}));
test('Symlink vom Außenverzeichnis ins Repo wird abgelehnt',()=>withTmp(x=>{
 const inside=join(x.root,'test.json'),link=join(x.out,'link.json');
 writeFileSync(inside,'{}');symlinkSync(inside,link);
 assert.throws(()=>externalFrozenPath(link,x.root));
}));
test('Symlink-Repository-Wurzel ist keine Umgehung',()=>withTmp(x=>{
 const linkroot=join(x.base,'rootalias');
 symlinkSync(x.root,linkroot,'dir');
 const inside=join(x.root,'test.json');writeFileSync(inside,'{}');
 assert.throws(()=>externalFrozenPath(inside,linkroot));
}));
test('Äußere Datei bleibt mit Root-Symlink gültig',()=>withTmp(x=>{
 const linkroot=join(x.base,'rootalias');symlinkSync(x.root,linkroot,'dir');
 assert.equal(externalFrozenPath(x.fp,linkroot),x.fp);
}));
test('GitHub Actions und CI werden unabhängig gesperrt',()=>{
 assert.throws(()=>assertFrozenNotCI({GITHUB_ACTIONS:'true'}));
 assert.throws(()=>assertFrozenNotCI({CI:'true'}));
 assert.doesNotThrow(()=>assertFrozenNotCI({CI:'',GITHUB_ACTIONS:''}));
});
test('Loader liest gültige Dummy-Daten nur außerhalb CI',()=>withTmp(x=>{
 const p=invoke(x);
 assert.equal(p.status,0,p.stderr);
 assert.deepEqual(JSON.parse(p.stdout),{count:1,docs:1});
}));
test('Loader blockiert selbst gültige Daten in GitHub Actions',()=>withTmp(x=>{
 const p=invoke(x,{env:{GITHUB_ACTIONS:'true'}});
 assert.notEqual(p.status,0);assert.match(p.stderr,/CI\/GitHub Actions gesperrt/);
 assert.doesNotMatch(p.stderr,/fiktive Box/);
}));
test('Loader blockiert selbst gültige Daten in allgemeiner CI',()=>withTmp(x=>{
 const p=invoke(x,{env:{CI:'true'}});
 assert.notEqual(p.status,0);assert.match(p.stderr,/CI\/GitHub Actions gesperrt/);
}));
test('Inactive-Siegel blockiert vor Dateizugriff',()=>withTmp(x=>{
 const seal={...x.seal,active:false};
 const p=invoke(x,{seal,paths:[join(x.out,'missing.json'),x.sp]});
 assert.notEqual(p.status,0);assert.match(p.stderr,/nicht freigegeben/);
 assert.doesNotMatch(p.stderr,/ENOENT/);
}));
test('Fehlender Hash blockiert',()=>withTmp(x=>{
 const seal=structuredClone(x.seal);seal.files.fixture.sha256=null;
 const p=invoke(x,{seal});assert.notEqual(p.status,0);
 assert.match(p.stderr,/nicht freigegeben/);
}));
test('Falscher Hash blockiert',()=>withTmp(x=>{
 const seal=structuredClone(x.seal);seal.files.fixture.sha256='0'.repeat(64);
 const p=invoke(x,{seal});assert.notEqual(p.status,0);
 assert.match(p.stderr,/Siegel stimmt nicht/);
}));
test('Falsche Soll-Anzahl blockiert',()=>withTmp(x=>{
 const seal={...x.seal,itemCount:2};
 const p=invoke(x,{seal});assert.notEqual(p.status,0);
 assert.match(p.stderr,/Zählung/);
}));
test('Identische Fixture-/Suite-Dateipfade blockieren',()=>withTmp(x=>{
 const p=invoke(x,{paths:[x.fp,x.fp]});
 assert.notEqual(p.status,0);assert.match(p.stderr,/getrennte Dateien/);
}));
test('Datei im Repo blockiert nach aktivem Siegel',()=>withTmp(x=>{
 const inside=join(x.root,'fixture.json');writeFileSync(inside,'{}');
 const p=invoke(x,{paths:[inside,x.sp]});
 assert.notEqual(p.status,0);assert.match(p.stderr,/nicht im Repository/);
}));
