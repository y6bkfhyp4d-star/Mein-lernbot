// GENESIS X CodeAnalyzer 2.6 — read-only combination of existing AST reports.
// Reports a potential provenance chain ONLY for one unbranched simple function.
// Any uncertainty fails closed: no automatic optimization, code edit or safety verdict.
import {analyzeControlFlow} from './control-flow.mjs';
import {analyzeDataFlow} from './dataflow-analyzer.mjs';

const ALLOWED_GRAPH_TYPES=new Set(['entry','exit','VariableDeclaration','ExpressionStatement','return','EmptyStatement']);
const UNKNOWN=s=>s.startsWith('unknown:');

export function correlateFlows(file,source){
  if(typeof file!=='string'||typeof source!=='string')throw new TypeError('file/source must be strings');
  const control=analyzeControlFlow(file,source);
  const data=analyzeDataFlow(file,source);
  if(!control.parsed||!data.parsed)return {
    version:'2.6-correlation',file,parsed:false,mode:'read-only',changesApplied:false,
    status:'unavailable',reason:'parse-error',functions:[],errors:[control.error,data.error].filter(Boolean)
  };
  const graphs=new Map(control.graphs.map(g=>[g.functionId,g]));
  const nameCounts=new Map();
  for(const fn of data.functions)nameCounts.set(fn.name,(nameCounts.get(fn.name)||0)+1);
  const graphCounts=new Map();
  for(const g of control.graphs)graphCounts.set(g.name,(graphCounts.get(g.name)||0)+1);
  const functions=data.functions.map(fn=>{
    const cfg=graphs.get(fn.functionId);
    const reasons=[];
    if((nameCounts.get(fn.name)||0)!==1||(graphCounts.get(fn.name)||0)!==1)
      reasons.push('nonunique-function-identity');
    if(!cfg)reasons.push('missing-control-flow-graph');
    else {
      if(cfg.limitations.length)reasons.push('control-flow-limitations');
      if(cfg.nodes.some(n=>!ALLOWED_GRAPH_TYPES.has(n.type)))reasons.push('nonlinear-or-unsupported-control-flow');
      if(cfg.edges.some(e=>!['enter','next','return'].includes(e.kind)))reasons.push('nonlinear-edge');
      if(cfg.nodes.some(n=>n.type==='ExpressionStatement'))reasons.push('expression-statement-effects-not-verified');
      if(cfg.nodes.some(n=>n.type==='VariableDeclaration')&&!fn.events.some(e=>e.type==='declaration'))
        reasons.push('declaration-coverage-mismatch');
    }
    if(fn.limitations.length)reasons.push('data-flow-limitations');
    if(fn.events.filter(e=>e.type==='return').length!==1)
      reasons.push('requires-exactly-one-return');
    if(fn.events.some(e=>e.sources.some(UNKNOWN)))reasons.push('unknown-provenance');
    if(data.untracked.some(u=>u.name===fn.name))reasons.push('function-not-fully-tracked');
    const unique=[...new Set(reasons)].sort();
    return {
      name:fn.name,line:fn.line,column:fn.column,
      status:unique.length?'manual-review-required':'eligible-for-limited-report',
      confidence:unique.length?'insufficient':'limited-straight-line',
      reasons:unique,
      // Evidence is surfaced, not a claim of correctness or a permission to change code.
      evidence:unique.length?[]:fn.events.map(e=>({...e})),
      graphNodes:cfg?.nodes.length??0
    };
  });
  return {
    version:'2.6-correlation',file,parsed:true,mode:'read-only',
    purpose:'review-evidence-only',functions,
    untracked:{control:control.untracked,data:data.untracked},
    limitations:[
      'No semantic proof; straight-line evidence is only a potential provenance relationship',
      'No automatic security verdict, patch, merge or source execution',
      'Branching/looping/unknown values are excluded from evidence',
      'No cross-function or alias analysis'
    ],
    changesApplied:false
  };
}
