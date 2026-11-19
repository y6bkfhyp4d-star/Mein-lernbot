/* NERYX Frozen-L1: ausschließlich externe synthetische Daten.
   node eval/run-frozen.mjs /absoluter/pfad/frozen.json
   Ausgabe nur Aggregate. Ohne aktiviertes Siegel wird NICHT geprüft. */
import {readFileSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {scoreRetrieval} from './retrieval-score.mjs';
import {runInNewContext} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=p=>readFileSync(resolve(root,p),'utf8');
const seal=JSON.parse(source('eval/frozen.seal.json'));
if(seal.schema!==1||seal.active!==true||!/^[0-9a-f]{64}$/.test(String(seal.sha256))||
 !Number.isSafeInteger(seal.itemCount)||seal.itemCount<1||!seal.version)
 throw Error('Frozen-Evaluation ist noch nicht freigegeben; Siegel fehlt.');
const arg=process.argv[2];
if(!arg||!isAbsolute(arg))throw Error('Ein absoluter Pfad außerhalb des Repos ist erforderlich.');
const target=realpathSync(arg),rel=relative(root,target);
if(rel===''||(!rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))&&rel!=='..'&&!isAbsolute(rel)))
 throw Error('Frozen-Datei muss außerhalb des Repositories liegen.');
const bytes=readFileSync(target),hash=createHash('sha256').update(bytes).digest('hex');
if(hash!==seal.sha256)throw Error('Frozen-Siegel stimmt nicht überein.');
const frozen=JSON.parse(bytes.toString('utf8'));
if(frozen.schema!==1||!Array.isArray(frozen.items)||!Array.isArray(frozen.fixtures?.documents)||
 frozen.items.length!==seal.itemCount||frozen.items.some(x=>x.suite!=='frozen'))
 throw Error('Frozen-Dateiformat oder Anzahl stimmt nicht überein.');
const window={};
for(const path of ['modules/document-gate.js','modules/answer-review.js'])runInNewContext(source(path),{window});
const summary={schema:1,version:seal.version,hash,runAt:new Date().toISOString(),
 total:frozen.items.length,passed:0,failed:0,byCategory:{}};
const ids=new Set();
for(const t of frozen.items){
 if(typeof t.id!=='string'||ids.has(t.id))throw Error('Frozen-Testformat ungültig.');
 ids.add(t.id);
 let pass=false;
 if(t.layers?.includes('retrieval')){
  const out=[...new Set(window.NERYXDocumentGate.rank(t.input.question,frozen.fixtures.documents,10)
   .map(x=>x.id).filter(Boolean))];
  pass=scoreRetrieval(out,t.expect).pass;
 }else if(t.layers?.includes('review')){
  pass=window.NERYXAnswerReview.inspect(t.input.question,t.input.draft).complete===t.expect.complete;
 }else throw Error('Unbekannte Frozen-Ebene.');
 const label=String(t.category||'unbekannt').slice(0,40);
 if(!summary.byCategory[label])summary.byCategory[label]={passed:0,total:0};
 summary.byCategory[label].total++;
 if(pass){summary.passed++;summary.byCategory[label].passed++}else summary.failed++;
}
console.log(JSON.stringify(summary,null,2));
