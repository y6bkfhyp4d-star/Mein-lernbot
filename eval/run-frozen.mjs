/* NERYX Frozen-S3 – nur externe, versiegelte synthetische Daten.
   node eval/run-frozen.mjs /ABSOLUT/frozen-fixture.json /ABSOLUT/frozen-suite.json
   Ausgabe nur Aggregate; fehlende Auswerter gelten niemals als bestanden. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {runInNewContext} from 'node:vm';
import {scoreRetrieval} from './retrieval-score.mjs';
import {loadFrozen} from './frozen-loader.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=p=>readFileSync(resolve(root,p),'utf8');
const seal=JSON.parse(source('eval/frozen.seal.json'));
const frozen=loadFrozen(process.argv[2],process.argv[3],root,seal);
if(process.argv.length!==4)throw Error('Genau zwei Frozen-Dateipfade erforderlich.');
const window={};
runInNewContext(source('modules/document-gate.js'),{window});
const summary={schema:2,version:frozen.version,hashes:frozen.hashes,
 total:frozen.items.length,evaluatedItems:0,fullyEvaluatedItems:0,
 passed:0,failed:0,partialItems:0,notEvaluatedItems:0,byCategory:{},byCheck:{
 retrieval:{evaluated:0,passed:0,failed:0},
 mode:{evaluated:0,notEvaluated:0},concepts:{evaluated:0,notEvaluated:0},
 exact:{evaluated:0,notEvaluated:0},labels:{evaluated:0,notEvaluated:0},
 numbersFromEvidenceOnly:{evaluated:0,notEvaluated:0},forbidden:{evaluated:0,notEvaluated:0},
 conflictSurfaced:{evaluated:0,notEvaluated:0},statusWording:{evaluated:0,notEvaluated:0}
 }};
for(const t of frozen.items){
 const category=String(t.category||'unbekannt').slice(0,40);
 const group=summary.byCategory[category]??={total:0,retrievalEvaluated:0,retrievalPassed:0,notFullyEvaluated:0};
 group.total++;
 const exp=t.expect??{};
 const pending=[];
 if(t.layers.includes('generation')||'mode' in exp)pending.push('mode');
 if('concepts' in exp)pending.push('concepts');
 if('exact' in exp)pending.push('exact');
 if('numbersFromEvidenceOnly' in exp)pending.push('numbersFromEvidenceOnly');
 if('forbidden' in exp)pending.push('forbidden');
 if(t.layers.includes('verifier')||'labels' in exp)pending.push('labels');
 if('conflictSurfaced' in exp)pending.push('conflictSurfaced');
 if('statusWording' in exp)pending.push('statusWording');
 for(const key of new Set(pending))summary.byCheck[key].notEvaluated++;
 if(t.layers.includes('retrieval')){
  const found=window.NERYXDocumentGate.rank(t.input.question,frozen.documents,10).map(x=>x.id);
  const result=scoreRetrieval(found,exp);
  summary.byCheck.retrieval.evaluated++;
  group.retrievalEvaluated++;
  summary.evaluatedItems++;
  if(result.pass){summary.byCheck.retrieval.passed++;group.retrievalPassed++;}
  else summary.byCheck.retrieval.failed++;
  if(pending.length)summary.partialItems++;
  else {
   summary.fullyEvaluatedItems++;
   if(result.pass)summary.passed++;
   else summary.failed++;
  }
 }else summary.notEvaluatedItems++;
 if(pending.length||!t.layers.includes('retrieval'))group.notFullyEvaluated++;
}
console.log(JSON.stringify(summary,null,2));
