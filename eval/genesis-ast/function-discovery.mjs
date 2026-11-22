// GENESIS X – AST function discovery, including nested functions inside IIFEs.
// Never executes source code. Identifies declarations by name + source position.
import {parse} from 'acorn';

export function collectNamedFunctions(file,source){
  if(typeof file!=='string'||typeof source!=='string')throw new TypeError('Strings erforderlich');
  let tree,sourceType=file.endsWith('.cjs')?'script':'module',error=null;
  try{tree=parse(source,{ecmaVersion:'latest',sourceType,locations:true,allowHashBang:true});}
  catch(first){
    if(file.endsWith('.js')){
      try{sourceType='script';tree=parse(source,{ecmaVersion:'latest',sourceType,locations:true,allowHashBang:true});}
      catch(second){error=second;}
    }else error=first;
  }
  if(error)return {parsed:false,functions:[],sourceType,error:{
    message:String(error.message).slice(0,180),line:error.loc?.line??1,column:(error.loc?.column??0)+1
  }};
  const functions=[],assigned=[],visited=new Set();
  function visit(node,depth=0){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){for(const child of node)visit(child,depth);return;}
    if(typeof node.type!=='string'||visited.has(node))return;
    visited.add(node);
    const isFunction=/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type);
    if(node.type==='VariableDeclarator'&&node.id?.type==='Identifier'&&
       ['FunctionExpression','ArrowFunctionExpression'].includes(node.init?.type))
      assigned.push({name:node.id.name,line:node.loc.start.line,column:node.loc.start.column+1});
    if(node.type==='FunctionDeclaration'&&node.id?.name){
      functions.push({id:node.id.name+'@'+node.start,name:node.id.name,
        line:node.loc.start.line,column:node.loc.start.column+1,
        depth,node});
    }
    for(const [key,value] of Object.entries(node)){
      if(['start','end','loc','range','raw','name','value'].includes(key))continue;
      if(value&&typeof value==='object')visit(value,depth+(isFunction?1:0));
    }
  }
  visit(tree);
  functions.sort((a,b)=>a.node.start-b.node.start);
  return {parsed:true,sourceType,functions,assigned};
}
