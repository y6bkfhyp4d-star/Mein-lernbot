// External, read-only GENESIS X provenance benchmark runner.
// Usage: node eval/genesis-ast/evaluate-external.mjs /absolute/path/outside/repository.json
// User/third-party labels must be fixed BEFORE analysis; no source is executed.
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {correlateFlows} from './flow-correlation.mjs';
import {parse} from 'acorn';

const root=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const statuses=new Set(['eligible','review']);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const resultStatus='eligible-for-limited-report';

export function validateCorpus(corpus){
  if(!isObject(corpus)||corpus.schema!==1||!Array.isArray(corpus.cases)||
     corpus.cases.length<1||corpus.cases.length>500)
    throw new Error('Invalid schema or case count (1..500)');
  const ids=new Set();
  for(const item of corpus.cases){
    if(!isObject(item)||Object.keys(item).sort().join(',')!=='expected,id,source'||
       typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(item.id)||
       ids.has(item.id)||typeof item.source!=='string'||
       item.source.length<1||item.source.length>10000||
       typeof item.expected!=='string'||!statuses.has(item.expected))
      throw new Error('Invalid benchmark case or duplicate ID');
    ids.add(item.id);
  }
  return corpus.cases;
}

export function evaluateCorpus(corpus){
  const cases=validateCorpus(corpus);
  const confusion={TP:0,FP:0,TN:0,FN:0},errors=[];
  for(const item of cases){
    let actual='review';
    let reason=null;
    try{
      // Require one standalone function declaration, without other executable
      // top-level statements. Otherwise an apparently clean function can mask
      // unrelated code and inflate a per-function benchmark score.
      let syntax;
      try{syntax=parse(item.source,{ecmaVersion:'latest',sourceType:'script',allowHashBang:true});}
      catch{reason='parse-error';}
      if(!reason&&(
        syntax.body.length!==1||syntax.body[0].type!=='FunctionDeclaration'||
        !syntax.body[0].id?.name))reason='requires-single-top-level-function';
      if(reason){errors.push({id:item.id,reason});continue;}
      const report=correlateFlows('external.js',item.source);
      if(!report.parsed)reason='parse-error';
      else if(report.functions.length!==1)reason='requires-exactly-one-named-function';
      else {
        const status=report.functions[0].status;
        if(status===resultStatus)actual='eligible';
        else if(status!=='manual-review-required')reason='unknown-analyzer-status';
      }
    }catch(error){
      reason='analysis-error';
    }
    // Invalid or unanalyzable samples are not successful classifications.
    if(reason){errors.push({id:item.id,reason});continue;}
    if(item.expected==='eligible')confusion[actual==='eligible'?'TP':'FN']++;
    else confusion[actual==='eligible'?'FP':'TN']++;
  }
  const ratio=(a,b)=>b?Number((a/b).toFixed(6)):null;
  const valid=cases.length-errors.length;
  return {
    schema:1,purpose:'limited-provenance-classification-not-security',
    submitted:cases.length,evaluated:valid,excluded:errors.length,
    complete:errors.length===0,confusion,
    precision:ratio(confusion.TP,confusion.TP+confusion.FP),
    eligibleRecall:ratio(confusion.TP,confusion.TP+confusion.FN),
    reviewRecall:ratio(confusion.TN,confusion.TN+confusion.FP),
    accuracy:ratio(confusion.TP+confusion.TN,valid),
    errors,
    limitations:['Not an independent holdout unless cases and labels were created externally before analyzer inspection',
      'Analysis and parse failures are excluded from classification scores and make the run incomplete',
      'Not a proof of security, correctness, semantic precision or production readiness']
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const file=process.argv[2];
    if(process.argv.length!==3||!file||!isAbsolute(file))throw new Error('Requires exactly one absolute corpus path');
    const real=realpathSync(file);
    const rel=relative(root,real);
    if(!rel||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel)))
      throw new Error('Corpus must be outside the repository');
    const raw=readFileSync(real);
    if(raw.byteLength>2_000_000)throw new Error('Corpus exceeds 2 MB');
    const report=evaluateCorpus(JSON.parse(raw.toString('utf8')));
    report.corpusSha256=createHash('sha256').update(raw).digest('hex');
    // Aggregate counts and case IDs with error categories, never source text.
    process.stdout.write(JSON.stringify(report)+'\n');
    if(report.errors.length)process.exitCode=2;
  }catch(error){
    process.stderr.write('GENESIS external evaluation failed: '+String(error.message).slice(0,160)+'\n');
    process.exitCode=2;
  }
}
