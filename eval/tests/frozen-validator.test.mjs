/* NERYX: öffentliche Dummy-Abnahmetests, keine echten Frozen-Inhalte. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const validator=fileURLToPath(new URL('../validate-frozen.mjs',import.meta.url));
const categories={retrieval_hit:12,retrieval_distractor:6,abstain_correct:8,should_answer_hard:6,solver:6,grounding:6,contradiction:4,status:2};
const id=n=>'fz-c'+String(n).padStart(3,'0');
function dummy(){
 const claims=Array.from({length:60},(_,i)=>({
  id:id(i+1),domain:['werkstatt','garten','haushalt','kleinbetrieb','kreativhobby','lagerverwaltung'][Math.floor(i/10)],
  text:`Der erfundene Gegenstand ${i+1} benötigt 5 Stunden.`,
  origin:i<3?'user':'curated',topics:['gegenstand','dauer'],conflicts:[],
  validity:{volatility:'static'}
 }));
 for(const [a,b] of [[14,15],[54,55]]){
  claims[a-1].conflicts=[id(b)];claims[b-1].conflicts=[id(a)];
 }
 let n=0;
 const items=[];
 for(const [category,count] of Object.entries(categories)){
  for(let i=0;i<count;i++){
   n++;
   const base={schema:1,id:'fz-'+String(n).padStart(3,'0'),suite:'frozen',origin:'synthetic',
    category,group:category==='retrieval_hit'?'fz-g0'+(Math.floor(i/3)+1):null,
    tags:[],difficulty:1,layers:['retrieval'],fixture:'fx-frozen-v1',
    input:{question:'Wie lange dauert die Lagerung?'},expect:{retrieval:{verdict:'sufficient',mustInclude:[id(1)],mustExclude:[id(2)]},mode:'answer'}};
   if(category==='solver'){
    base.fixture=null;base.layers=['generation'];base.expect={exact:{value:5,tol:0,unit:'stunden'}};
   }
   if(category==='grounding'){
    base.layers=['verifier'];base.input={question:'Prüfe die Aussage.',draft:'Das ist belegt.' ,evidence:[id(1)]};
    base.expect={labels:['supported']};
   }
   items.push(base);
  }
 }
 return [{schema:1,fixtureId:'fx-frozen-v1',claims},items];
}
function run(fixture,suite){
 const dir=mkdtempSync(join(tmpdir(),'neryx-dummy-'));
 try{
  const a=join(dir,'fixture.json'),b=join(dir,'suite.json');
  writeFileSync(a,JSON.stringify(fixture));writeFileSync(b,JSON.stringify(suite));
  const p=spawnSync(process.execPath,[validator,a,b],{encoding:'utf8',timeout:15000});
  assert.equal(p.error,undefined,p.error?.message);
  return {status:p.status,report:JSON.parse(p.stdout)};
 }finally{rmSync(dir,{recursive:true,force:true})}
}
test('gültige Dummy-Dateien: 60 Claims und 50 Items',()=>{
 const [a,b]=dummy(),out=run(a,b);
 assert.equal(out.status,0);assert.equal(out.report.ok,true);
 assert.equal(out.report.summary.claims,60);assert.equal(out.report.summary.items,50);
 assert.equal(out.report.summary.conflictPairs,2);
});
const mutations=[
 ['unbekanntes Erwartungsfeld',(a,b)=>b[0].expect.bogus=true],
 ['ungültiges Verdict',(a,b)=>b[0].expect.retrieval.verdict='unbekannt'],
 ['leeres sufficient',(a,b)=>b[0].expect.retrieval.mustInclude=[]],
 ['fehlendes Retrieval',(a,b)=>delete b[0].expect.retrieval],
 ['fremde Claim-ID',(a,b)=>b[0].expect.retrieval.mustInclude=['fz-c999']],
 ['mustInclude und mustExclude überlappen',(a,b)=>b[0].expect.retrieval.mustExclude=[id(1)]],
 ['any ohne Rauschkontrolle',(a,b)=>b[0].expect.retrieval={verdict:'any'}],
 ['ungültige Toleranz',(a,b)=>b[32].expect.exact.tol=-1],
 ['falsche Grounding-Labels',(a,b)=>b[38].expect.labels=['unsupported','supported']],
 ['doppelte Claim-ID',(a,b)=>a.claims[1].id=id(1)],
 ['fehlendes Konflikt-Gegenstück',(a,b)=>a.claims[14].conflicts=[]],
 ['unbekannter Layer',(a,b)=>b[0].layers=['mystery']],
 ['falsche Testanzahl',(a,b)=>b.pop()],
 ['allowOnly enthält ungültige ID',(a,b)=>b[0].expect.retrieval.allowOnly=['fz-c999']],
 ['Solver ohne exakten Wert',(a,b)=>delete b[32].expect.exact],
 ['ungültiger Quellenstatus',(a,b)=>b[0].expect.statusWording='certain']
];
for(const [name,mutate] of mutations)test('Validator weist zurück: '+name,()=>{
 const [a,b]=dummy();mutate(a,b);const result=run(a,b);
 assert.notEqual(result.status,0);assert.equal(result.report.ok,false);
 assert.ok(result.report.errors.length>0);
});
test('Dateien im Repository werden abgelehnt',()=>{
 const p=spawnSync(process.execPath,[validator,resolve('eval/fixtures.json'),resolve('eval/suite.json')],{encoding:'utf8'});
 assert.notEqual(p.status,0);
 assert.match(p.stderr,/Repository|außerhalb|Vertrauliche/);
});
