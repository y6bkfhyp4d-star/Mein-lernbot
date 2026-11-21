/* NERYX L1-Evaluation: rein synthetisch, kein Modell, kein Nutzerspeicher.
   Node: node eval/run-l1.mjs [--strict]
   --strict schlägt bei neuen Regressionen fehl. Bekannte Fehler bleiben sichtbar.
   --all-strict schlägt bei jedem fehlgeschlagenen Fall fehl.
*/
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {scoreRetrieval} from './retrieval-score.mjs';
import {checkBooleanResult,scoreReviewComplete} from './check-contract.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fixtureText=read('eval/fixtures.json'),suiteText=read('eval/suite.json');
const fixtures=JSON.parse(fixtureText),suite=JSON.parse(suiteText);
const triage=JSON.parse(read('eval/known-issues.json'));
const known=new Map(triage.items.map(x=>[x.id,x]));
if(triage.schema!==1||known.size!==triage.items.length)throw Error('Ungültige Fehlerklassifikation.');
const sha=x=>createHash('sha256').update(x).digest('hex');
const window={};
for(const p of ['modules/document-gate.js','modules/answer-review.js'])
 runInNewContext(read(p),{window});
if(fixtures.schema!==1||suite.schema!==1||!Array.isArray(suite.items)||!Array.isArray(fixtures.documents))
 throw Error('Ungültige Evaluationsdaten.');
if(suite.items.some(x=>x.suite==='frozen'))
 throw Error('Diese erste Suite enthält bewusst kein frozen-Set.');
const ids=new Set(),results=[];
for(const item of suite.items){
 if(item.schema!==1||!item.id||ids.has(item.id)||!['dev','regression'].includes(item.suite))
  throw Error('Ungültige/duplizierte Item-ID oder Suite: '+String(item.id));
 ids.add(item.id);
 const checks={};
 let detail={};
 if(item.layers?.includes('retrieval')){
  const hits=window.NERYXDocumentGate.rank(item.input.question,fixtures.documents,10);
  const found=[...new Set(hits.map(x=>x.id).filter(Boolean))];
  const result=scoreRetrieval(found,item.expect);
  Object.assign(checks,result.checks);
  detail={found};
 }else if(item.layers?.includes('review')){
  const inspection=window.NERYXAnswerReview.inspect(item.input.question,item.input.draft);
  checks.complete=scoreReviewComplete(inspection,item.expect?.complete);
  detail={missing:inspection.missing};
 }else throw Error('Unbekannte L1-Ebene: '+item.id);
 const required=item.layers.includes('retrieval')?['include','exclude','verdict']:['complete'];
 const pass=checkBooleanResult(checks,required),entry=known.get(item.id);
 results.push({id:item.id,suite:item.suite,category:item.category,pass,
  classification:entry?.classification||(pass?'passing':'unclassified_failure'),
  outcome:entry?(pass?'unexpected_pass':'known_failure'):(pass?'pass':'regression'),checks,...detail});
}
const groups={};
for(const r of results){
 const k=r.suite+'/'+r.category;
 if(!groups[k])groups[k]={passed:0,total:0};
 groups[k].total++;if(r.pass)groups[k].passed++;
}
const passed=results.filter(x=>x.pass).length;
const surprises=results.filter(x=>x.outcome==='unexpected_pass');
const regressions=results.filter(x=>x.outcome==='regression');
const knownFailures=results.filter(x=>x.outcome==='known_failure');
if([...known.keys()].some(id=>!ids.has(id)))throw Error('Fehlerklassifikation verweist auf nicht vorhandene Test-ID.');
const report={schema:1,layer:'L1',scope:'synthetische Gate-/Review-Tests, keine LLM-Leistung',
 fixtureHash:sha(fixtureText),suiteHash:sha(suiteText),
 summary:{passed,total:results.length,failed:results.length-passed,
  knownFailures:knownFailures.length,newRegressions:regressions.length,unexpectedPasses:surprises.length},
 groups,results};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--all-strict')&&passed!==results.length)process.exitCode=1;
if(process.argv.includes('--strict')&&regressions.length)process.exitCode=1;
