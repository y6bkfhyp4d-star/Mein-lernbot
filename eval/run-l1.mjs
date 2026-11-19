/* NERYX L1-Evaluation: rein synthetisch, kein Modell, kein Nutzerspeicher.
   Node: node eval/run-l1.mjs [--strict]
   --strict meldet bei inhaltlich fehlgeschlagenen Items Exitcode 1.
   Ohne --strict: Baseline mit sichtbaren Schwächen und Exitcode 0.
*/
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fixtureText=read('eval/fixtures.json'),suiteText=read('eval/suite.json');
const fixtures=JSON.parse(fixtureText),suite=JSON.parse(suiteText);
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
  const exp=item.expect.retrieval;
  checks.include=(exp.mustInclude||[]).every(x=>found.includes(x));
  checks.exclude=(exp.mustExclude||[]).every(x=>!found.includes(x));
  checks.verdict=item.expect.verdict==='none'?found.length===0:found.length>0;
  detail={found};
 }else if(item.layers?.includes('review')){
  const inspection=window.NERYXAnswerReview.inspect(item.input.question,item.input.draft);
  checks.complete=inspection.complete===item.expect.complete;
  detail={missing:inspection.missing};
 }else throw Error('Unbekannte L1-Ebene: '+item.id);
 results.push({id:item.id,suite:item.suite,category:item.category,pass:Object.values(checks).every(Boolean),checks,...detail});
}
const groups={};
for(const r of results){
 const k=r.suite+'/'+r.category;
 if(!groups[k])groups[k]={passed:0,total:0};
 groups[k].total++;if(r.pass)groups[k].passed++;
}
const passed=results.filter(x=>x.pass).length;
const report={schema:1,layer:'L1',scope:'synthetische Gate-/Review-Tests, keine LLM-Leistung',
 fixtureHash:sha(fixtureText),suiteHash:sha(suiteText),
 summary:{passed,total:results.length,failed:results.length-passed},
 groups,results};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--strict')&&passed!==results.length)process.exitCode=1;
