// GENESIS X CodeAnalyzer 2.4 – conservative intraprocedural dataflow prototype.
// Only top-level named functions with straight-line statements. No source execution.
// Not a taint/security verdict; a potential provenance map for human review.
import {collectNamedFunctions} from './function-discovery.mjs';

const location=n=>({line:n.loc.start.line,column:n.loc.start.column+1});
function identifiers(pattern,out=[]){
  if(!pattern)return out;
  if(pattern.type==='Identifier')out.push(pattern.name);
  else if(pattern.type==='AssignmentPattern'||pattern.type==='RestElement')identifiers(pattern.left??pattern.argument,out);
  else if(pattern.type==='ArrayPattern')for(const n of pattern.elements)identifiers(n,out);
  else if(pattern.type==='ObjectPattern')for(const p of pattern.properties)
    identifiers(p.type==='RestElement'?p.argument:p.value,out);
  return out;
}
function inputs(expr,out=new Set(),flags={calls:false,dynamic:false}){
  if(!expr)return {names:out,flags};
  if(Array.isArray(expr)){for(const n of expr)inputs(n,out,flags);return {names:out,flags};}
  if(expr.type==='Identifier'){out.add(expr.name);return {names:out,flags};}
  if(expr.type==='Literal'||expr.type==='ThisExpression'||expr.type==='Super')return {names:out,flags};
  if(expr.type==='MemberExpression'){
    inputs(expr.object,out,flags);
    if(expr.computed)inputs(expr.property,out,flags);
    return {names:out,flags};
  }
  if(expr.type==='CallExpression'||expr.type==='NewExpression'){
    flags.calls=true;
    inputs(expr.callee,out,flags);
    inputs(expr.arguments,out,flags);
    return {names:out,flags};
  }
  if(expr.type==='ArrowFunctionExpression'||expr.type==='FunctionExpression'){
    flags.dynamic=true;return {names:out,flags};
  }
  if(expr.type==='Property'){
    if(expr.computed)inputs(expr.key,out,flags);
    inputs(expr.value,out,flags);return {names:out,flags};
  }
  for(const [key,value] of Object.entries(expr)){
    if(['type','start','end','loc','raw','value','name','operator','kind'].includes(key))continue;
    if(value&&typeof value==='object')inputs(value,out,flags);
  }
  return {names:out,flags};
}
function analyzeFunction(node){
  const params=node.params.flatMap(p=>identifiers(p));
  const provenance=new Map(params.map(p=>[p,new Set([p])]));
  const events=[],limitations=new Set();
  const origin=expression=>{
    const {names,flags}=inputs(expression);
    const sources=new Set();
    for(const name of names){
      const known=provenance.get(name);
      if(known)for(const value of known)sources.add(value);
      else sources.add('unknown:'+name);
    }
    if(flags.calls)sources.add('unknown:call-result');
    if(flags.dynamic)sources.add('unknown:closure');
    return [...sources].sort();
  };
  function update(name,sources,kind,node){
    provenance.set(name,new Set(sources));
    events.push({type:kind,target:name,sources,...location(node)});
  }
  for(const statement of node.body.body){
    if(statement.type==='VariableDeclaration'){
      for(const d of statement.declarations){
        if(d.id.type!=='Identifier'){limitations.add('destructuring-not-tracked');continue;}
        update(d.id.name,d.init?origin(d.init):['unknown:uninitialized'],'declaration',d);
      }
    }else if(statement.type==='ExpressionStatement'&&statement.expression.type==='AssignmentExpression'){
      const a=statement.expression;
      if(a.operator!=='='||a.left.type!=='Identifier'){limitations.add('complex-assignment-not-tracked');continue;}
      update(a.left.name,origin(a.right),'assignment',a);
    }else if(statement.type==='ReturnStatement'){
      events.push({type:'return',sources:origin(statement.argument),...location(statement)});
    }else if(statement.type==='EmptyStatement'||statement.type==='FunctionDeclaration'){
      if(statement.type==='FunctionDeclaration')limitations.add('nested-function-not-tracked');
    }else limitations.add('control-flow-or-statement-not-tracked:'+statement.type);
  }
  return {name:node.id.name,parameters:params,...location(node),events,
    limitations:[...limitations].sort(),confidence:limitations.size?'partial':'limited-straight-line'};
}
export function analyzeDataFlow(file,source){
  if(typeof file!=='string'||typeof source!=='string')throw new TypeError('Strings erforderlich');
  const discovered=collectNamedFunctions(file,source);
  if(!discovered.parsed)return {version:'2.4-prototype',file,parsed:false,
    error:discovered.error,functions:[],untracked:[],mode:'read-only',changesApplied:false};
  const functions=discovered.functions.map(item=>({
    ...analyzeFunction(item.node),functionId:item.id,depth:item.depth
  }));
  const untracked=[];
  return {version:'2.4-prototype',file,parsed:true,mode:'read-only',analysis:'conservative-straight-line',
    functions,untracked,limitations:[
      'Not a full control-flow or taint analysis',
      'Calls and unknown identifiers are explicitly unknown',
      'No cross-function, async, exception or alias tracking',
      'No automatic code changes or security verdicts'
    ],changesApplied:false};
}
