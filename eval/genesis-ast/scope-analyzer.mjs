// GENESIS X AST Scope Analyzer 2.2 – nonexecuting, read-only static name resolution.
// Supported: lexical bindings, var/function hoisting, imports, params, catch,
// destructuring, references, shadowing. Not yet full JS semantic/data-flow analysis.
import {parse} from 'acorn';

const at=node=>({line:node.loc.start.line,column:node.loc.start.column+1});
const iterable=x=>Array.isArray(x)?x:[];
const names=(node,out=[])=>{
  if(!node)return out;
  switch(node.type){
    case 'Identifier':out.push(node);break;
    case 'RestElement':case 'AssignmentPattern':names(node.argument??node.left,out);break;
    case 'ArrayPattern':for(const v of node.elements)names(v,out);break;
    case 'ObjectPattern':for(const p of node.properties)names(p.type==='RestElement'?p.argument:p.value,out);break;
  }
  return out;
};

export function analyzeScopes(file,source){
  if(typeof file!=='string'||typeof source!=='string')throw new TypeError('Strings erforderlich');
  let tree,sourceType=file.endsWith('.cjs')?'script':'module';
  try{tree=parse(source,{ecmaVersion:'latest',sourceType,locations:true,allowHashBang:true});}
  catch(error){
    if(file.endsWith('.js')&&sourceType==='module'){
      try{sourceType='script';tree=parse(source,{ecmaVersion:'latest',sourceType,locations:true,allowHashBang:true});}
      catch(e){return {file,parsed:false,error:{message:e.message,line:e.loc?.line??1,column:(e.loc?.column??0)+1},mode:'read-only',bindings:[],references:[],shadowing:[]};}
    }else return {file,parsed:false,error:{message:error.message,line:error.loc?.line??1,column:(error.loc?.column??0)+1},mode:'read-only',bindings:[],references:[],shadowing:[]};
  }
  let nextScope=0,nextBinding=0;
  const bindings=[],references=[],shadowing=[];
  const scope=(kind,parent)=>({id:++nextScope,kind,parent,items:new Map()});
  const root=scope('program',null);
  const find=(s,name)=>{for(let current=s;current;current=current.parent)if(current.items.has(name))return current.items.get(name);return null;};
  const declare=(s,node,kind)=>{
    if(!node||node.type!=='Identifier')return;
    const target=kind==='var'?nearestVar(s):s;
    const previous=target.items.get(node.name);
    if(previous)return previous;
    const outer=find(target.parent,node.name);
    const binding={id:++nextBinding,name:node.name,kind,scope:target.id,...at(node)};
    target.items.set(node.name,binding);bindings.push(binding);
    if(outer)shadowing.push({name:node.name,inner:binding.id,outer:outer.id,...at(node)});
    return binding;
  };
  const nearestVar=s=>{for(let p=s;p;p=p.parent)if(p.kind==='function'||p.kind==='program')return p;return s;};
  const declarePattern=(s,pattern,kind)=>{for(const n of names(pattern))declare(s,n,kind);};
  const hoist=(statements,s)=>{
    for(const stmt of iterable(statements)){
      if(!stmt)continue;
      const x=stmt.type==='ExportNamedDeclaration'||stmt.type==='ExportDefaultDeclaration'?stmt.declaration:stmt;
      if(!x)continue;
      if(x.type==='FunctionDeclaration')declare(s,x.id,'function');
      else if(x.type==='ClassDeclaration')declare(s,x.id,'class');
      else if(x.type==='VariableDeclaration')for(const d of x.declarations)declarePattern(s,d.id,x.kind);
      else if(x.type==='ImportDeclaration')for(const item of x.specifiers)declare(s,item.local,'import');
    }
  };
  const reference=(n,s)=>{
    if(!n||n.type!=='Identifier')return;
    const resolved=find(s,n.name);
    references.push({name:n.name,...at(n),scope:s.id,binding:resolved?.id??null,
      status:resolved?'resolved':'external-or-unresolved'});
  };
  function visit(node,s){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){for(const n of node)visit(n,s);return;}
    switch(node.type){
      case 'Program':hoist(node.body,s);visit(node.body,s);return;
      case 'BlockStatement':{
        const child=scope('block',s);hoist(node.body,child);visit(node.body,child);return;
      }
      case 'StaticBlock':{
        const child=scope('static-block',s);hoist(node.body,child);visit(node.body,child);return;
      }
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':{
        const child=scope('function',s);
        if(node.type==='FunctionExpression')declare(child,node.id,'function');
        for(const p of node.params)declarePattern(child,p,'param');
        for(const p of node.params)patternDefaults(p,child);
        if(node.body?.type==='BlockStatement'){
          hoist(node.body.body,child);visit(node.body.body,child);
        }else visit(node.body,child);
        return;
      }
      case 'CatchClause':{
        const child=scope('catch',s);declarePattern(child,node.param,'catch');visit(node.body,child);return;
      }
      case 'VariableDeclaration':
        for(const d of node.declarations){patternDefaults(d.id,s);visit(d.init,s);}return;
      case 'ImportDeclaration':return;
      case 'ClassDeclaration':
      case 'ClassExpression':{
        const child=scope('class',s);
        if(node.type==='ClassExpression')declare(child,node.id,'class');
        visit(node.superClass,s);visit(node.body,child);return;
      }
      case 'PropertyDefinition':visit(node.computed?node.key:null,s);visit(node.value,s);return;
      case 'MethodDefinition':visit(node.computed?node.key:null,s);visit(node.value,s);return;
      case 'Property':
        if(node.computed)visit(node.key,s);
        if(node.shorthand&&node.value?.type==='Identifier')reference(node.value,s);
        else visit(node.value,s);
        return;
      case 'MemberExpression':
        visit(node.object,s);if(node.computed)visit(node.property,s);return;
      case 'Identifier':reference(node,s);return;
      case 'LabeledStatement':visit(node.body,s);return;
      case 'BreakStatement':case 'ContinueStatement':return;
      case 'ExportSpecifier':return;
      case 'ImportSpecifier':case 'ImportDefaultSpecifier':case 'ImportNamespaceSpecifier':return;
      case 'ExportNamedDeclaration':
        if(node.declaration)visit(node.declaration,s);
        else if(!node.source)for(const spec of node.specifiers)visit(spec.local,s);
        return;
      case 'ExportDefaultDeclaration':visit(node.declaration,s);return;
      case 'ExportAllDeclaration':return;
      case 'MetaProperty':return;
      case 'AssignmentPattern':visit(node.right,s);return;
      case 'ObjectPattern':case 'ArrayPattern':patternDefaults(node,s);return;
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':{
        const child=scope('loop',s);
        if(node.init?.type==='VariableDeclaration')for(const d of node.init.declarations)declarePattern(child,d.id,node.init.kind);
        if(node.left?.type==='VariableDeclaration')for(const d of node.left.declarations)declarePattern(child,d.id,node.left.kind);
        visit(node.init,child);visit(node.left,child);visit(node.right,child);
        visit(node.test,child);visit(node.update,child);visit(node.body,child);return;
      }
    }
    // Only ESTree child nodes are traversed, excluding non-AST fields.
    for(const [key,val] of Object.entries(node)){
      if(['type','start','end','loc','raw','value','name','source'].includes(key))continue;
      if(val&&typeof val==='object')visit(val,s);
    }
  }
  function patternDefaults(pattern,s){
    if(!pattern)return;
    if(pattern.type==='AssignmentPattern'){visit(pattern.right,s);patternDefaults(pattern.left,s);}
    else if(pattern.type==='RestElement')patternDefaults(pattern.argument,s);
    else if(pattern.type==='ArrayPattern')for(const e of pattern.elements)patternDefaults(e,s);
    else if(pattern.type==='ObjectPattern')for(const p of pattern.properties){
      if(p.type==='RestElement')patternDefaults(p.argument,s);
      else {if(p.computed)visit(p.key,s);patternDefaults(p.value,s);}
    }
  }
  visit(tree,root);
  return {file,parsed:true,sourceType,mode:'read-only',bindings,references,shadowing,
    summary:{bindings:bindings.length,references:references.length,
      resolved:references.filter(x=>x.status==='resolved').length,
      externalOrUnresolved:references.filter(x=>x.status!=='resolved').length}};
}
