// GENESIS X: external prelabelled RULE-FINDING holdout evaluator.
// Independent corpus, SHA pin and acceptance limits come from the reviewer.
// This tool never executes analyzed JS; a result is not a security verdict.
import {readFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {relative,resolve,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFindingReport} from './finding-report.mjs';

const ROOT=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const SHA=/^[a-f0-9]{64}$/;
const RULE=/^(?:AST|SEC)[0-9]{3}$/;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const fraction=(a,b)=>b?Number((a/b).toFixed(6)):null;
export function validateFindingHoldout(input){
  if(!object(input)||input.schema!==1||input.purpose!=='AST-rule-detection'||
     !Array.isArray(input.cases)||input.cases.length<2||input.cases.length>500)
    throw new Error('Invalid rule-finding holdout schema');
  const ids=new Set();
  let positive=0,negative=0;
  for(const item of input.cases){
    if(!object(item)||Object.keys(item).sort().join(',')!=='expected,id,source'||
       typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(item.id)||
       ids.has(item.id)||typeof item.source!=='string'||
       item.source.length<1||item.source.length>10000||
       !(item.expected===null||(typeof item.expected==='string'&&RULE.test(item.expected))))
      throw new Error('Invalid or duplicate case');
    ids.add(item.id);
    if(item.expected===null)negative++;else positive++;
  }
  if(!positive||!negative)throw new Error('Both positive and negative cases required');
  return {positive,negative};
}
export function evaluateFindingHoldout(input,{
  expectedSha256,actualSha256,minRecall=0.9,maxFalsePositiveRate=0.05,
  minPositive=29,minNegative=59
}={}){
  const {positive,negative}=validateFindingHoldout(input);
  if(typeof expectedSha256!=='string'||!SHA.test(expectedSha256)||
     typeof actualSha256!=='string'||!SHA.test(actualSha256)||
     expectedSha256!==actualSha256)throw new Error('Missing or mismatched sealed SHA-256');
  for(const num of [minRecall,maxFalsePositiveRate]){
    if(typeof num!=='number'||!Number.isFinite(num)||num<0||num>1)
      throw new Error('Invalid thresholds');
  }
  for(const size of [minPositive,minNegative])
    if(!Number.isInteger(size)||size<1||size>500)throw new Error('Invalid minimum sample size');
  const counts={TP:0,FP:0,TN:0,FN:0},missed=[],unexpected=[],errors=[];
  for(const item of input.cases){
    try{
      const report=createFindingReport('holdout.js',item.source);
      const rules=[...new Set(report.findings.map(f=>f.ruleId))].sort();
      if(item.expected===null){
        if(rules.length){counts.FP++;unexpected.push({id:item.id,rules});}
        else counts.TN++;
      }else if(rules.includes(item.expected))counts.TP++;
      else{counts.FN++;missed.push({id:item.id,expected:item.expected,rules});}
    }catch{
      errors.push({id:item.id,reason:'analysis-error'});
    }
  }
  const validPositives=counts.TP+counts.FN;
  const validNegatives=counts.TN+counts.FP;
  const recall=fraction(counts.TP,validPositives);
  const fpr=fraction(counts.FP,validNegatives);
  const complete=errors.length===0;
  const sampleSizeMet=positive>=minPositive&&negative>=minNegative;
  const pass=complete&&sampleSizeMet&&recall!==null&&fpr!==null&&
    recall>=minRecall&&fpr<=maxFalsePositiveRate;
  return {
    schema:1,purpose:'AST-rule-detection',corpusSha256:actualSha256,
    submitted:input.cases.length,evaluated:validPositives+validNegatives,
    excluded:errors.length,complete,positive,negative,
    counts,recall,falsePositiveRate:fpr,
    criteria:{minRecall,maxFalsePositiveRate,minPositive,minNegative},
    sampleSizeMet,pass,missed,unexpected,errors,
    caveat:'Ground truth and independent authorship must be externally verified; not a proof of real-world security'
  };
}
function main(){
  if(process.argv.length!==5||process.argv[3]!=='--expect-sha256')
    throw new Error('Usage: node evaluate-finding-holdout.mjs /absolute/external.json --expect-sha256 <64 hex>');
  const file=process.argv[2],pin=process.argv[4];
  if(!isAbsolute(file))throw new Error('Absolute corpus path required');
  const full=realpathSync(file),rel=relative(ROOT,full);
  if(!rel||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel)))
    throw new Error('Holdout corpus must be outside repository');
  const raw=readFileSync(full);
  if(raw.length>2_000_000)throw new Error('Corpus >2MB');
  const digest=createHash('sha256').update(raw).digest('hex');
  const report=evaluateFindingHoldout(JSON.parse(raw.toString('utf8')),{
    expectedSha256:pin,actualSha256:digest
  });
  process.stdout.write(JSON.stringify(report)+'\n');
  if(!report.pass)process.exitCode=2;
}
if(process.argv[1]&&realpathSync(resolve(process.argv[1]))===realpathSync(fileURLToPath(import.meta.url))){
  try{main();}catch(e){
    process.stderr.write('GENESIS holdout aborted: '+String(e.message).slice(0,180)+'\n');
    process.exitCode=2;
  }
}
