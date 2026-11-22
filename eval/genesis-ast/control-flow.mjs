// GENESIS X CodeAnalyzer 2.5 — conservative read-only AST control-flow graph.
// Not a proof of runtime behavior, reachability, safety, or complete JS semantics.
import {parse} from 'acorn';
const position=n=>({line:n.loc?.start.line??1,column:(n.loc?.start.column??0)+1});
function graph(fn){
  let serial=0;
  const nodes=[],edges=[],limitations=new Set();
  const add=(type,ast=null)=>{const n={id:'n'+(++serial),type,...(ast?position(ast):{})};nodes.push(n);return n.id;};
  const edge=(from,to,kind='next')=>edges.push({from,to,kind});
  const exit=add('exit');
  let statementCount=0;
  function sequence(items,next){
    let current=next;
    for(let i=items.length-1;i>=0;i--)current=statement(items[i],current);
    return current;
  }
  function statement(s,next){
    if(!s)return next;
    if(++statementCount>2000)throw new Error('Analysekappung: mehr als 2000 Anweisungen');
    if(s.type==='BlockStatement')return sequence(s.body,next);
    if(s.type==='IfStatement'){
      const choice=add('if',s),yes=statement(s.consequent,next),no=s.alternate?statement(s.alternate,next):next;
      edge(choice,yes,'true');edge(choice,no,'false');return choice;
    }
    if(s.type==='WhileStatement'||s.type==='ForStatement'){
      const decision=add(s.type==='WhileStatement'?'while':'for',s);
      const body=statement(s.body,decision);
      edge(decision,body,'true');edge(decision,next,'false');
      if(s.type==='ForStatement'&&s.update)limitations.add('for-update-not-modeled');
      if(s.type==='ForStatement'&&s.init)limitations.add('for-initializer-not-modeled');
      return decision;
    }
    if(s.type==='DoWhileStatement'){
      const decision=add('do-while-condition',s),body=statement(s.body,decision);
      edge(decision,body,'true');edge(decision,next,'false');return body;
    }
    if(s.type==='ReturnStatement'||s.type==='ThrowStatement'){
      const current=add(s.type==='ReturnStatement'?'return':'throw',s);
      edge(current,exit,s.type==='ThrowStatement'?'exception':'return');return current;
    }
    const current=add(s.type,s);
    if(['BreakStatement','ContinueStatement','SwitchStatement','TryStatement',
        'ForOfStatement','ForInStatement','LabeledStatement','WithStatement'].includes(s.type)){
      limitations.add('unsupported-control-flow:'+s.type);
      // Fail-safe: no invented successor edge for unsupported branch semantics.
      return current;
    }
    if(s.type==='FunctionDeclaration')limitations.add('nested-function-not-expanded');
    edge(current,next);return current;
  }
  const first=sequence(fn.body.body,exit),entry=add('entry',fn);
  edge(entry,first,'enter');
  return {name:fn.id.name,...position(fn),entry,exit,nodes,edges,
    limitations:[...limitations].sort(),
    confidence:limitations.size?'partial':'structural-only'};
}
export function analyzeControlFlow(file,source){
  if(typeof file!=='string'||typeof source!=='string')throw new TypeError('Strings erforderlich');
  let ast,error;
  try{ast=parse(source,{ecmaVersion:'latest',sourceType:file.endsWith('.cjs')?'script':'module',locations:true,allowHashBang:true});}
  catch(e){
    if(file.endsWith('.js')){
      try{ast=parse(source,{ecmaVersion:'latest',sourceType:'script',locations:true,allowHashBang:true});}catch(second){error=second;}
    }else error=e;
  }
  if(error)return {version:'2.5-control-flow',file,parsed:false,
    error:{message:error.message,...{line:error.loc?.line??1,column:(error.loc?.column??0)+1}},
    graphs:[],mode:'read-only',changesApplied:false};
  const graphs=[],untracked=[];
  for(const stmt of ast.body){
    const node=stmt.type==='ExportNamedDeclaration'||stmt.type==='ExportDefaultDeclaration'?stmt.declaration:stmt;
    if(node?.type==='FunctionDeclaration'&&node.id?.name){
      try{graphs.push(graph(node));}catch(e){
        untracked.push({name:node.id.name,reason:String(e.message),...position(node)});
      }
    }else if(node?.type==='VariableDeclaration'){
      for(const item of node.declarations)if(['FunctionExpression','ArrowFunctionExpression'].includes(item.init?.type))
        untracked.push({name:item.id?.name??null,reason:'assigned-function-not-expanded',...position(item)});
    }
  }
  return {version:'2.5-control-flow',file,parsed:true,mode:'read-only',graphs,untracked,
    limitations:['Only named top-level functions','No runtime reachability proof',
      'Unsupported control-flow is left disconnected, not guessed',
      'No side-effect, async, callback or cross-function semantics'],
    changesApplied:false};
}
