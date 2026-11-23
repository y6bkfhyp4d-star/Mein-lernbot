// GENESIS X CodeAnalyzer 2.1 – genuine Acorn AST, read-only, Node 22.
// Never evaluates, imports, bundles or modifies the analyzed source.
import {parse} from 'acorn';
import {readFileSync, realpathSync, statSync} from 'node:fs';
import {resolve, relative, extname, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const ranks={critical:0,high:1,medium:2,low:3,info:4};
const maxBytes=2_000_000;
const extensions=new Set(['.js','.mjs','.cjs']);

function staticProperty(node,property){
  return node?.type==='MemberExpression' && (
    (!node.computed && node.property?.type==='Identifier' && node.property.name===property) ||
    (node.computed && node.property?.type==='Literal' && node.property.value===property)
  );
}
function member(node,object,property){
  return staticProperty(node,property) &&
    node.object?.type==='Identifier' && node.object.name===object;
}
function identifier(node,name){return node?.type==='Identifier' && node.name===name;}
function describeCall(node){
  if(node?.type==='Identifier') return node.name;
  if(node?.type==='MemberExpression' && !node.computed && node.property?.type==='Identifier')
    return node.property.name;
  return null;
}
function loc(node){return {line:node.loc.start.line,column:node.loc.start.column+1};}
// B1: resolve function-parameter bindings before attributing global member calls.
function patternNames(node,names){
 if(!node)return;
 if(node.type==='Identifier')names.add(node.name);
 else if(node.type==='RestElement')patternNames(node.argument,names);
 else if(node.type==='AssignmentPattern')patternNames(node.left,names);
 else if(node.type==='ArrayPattern')for(const item of node.elements)patternNames(item,names);
 else if(node.type==='ObjectPattern')for(const item of node.properties)
  patternNames(item.type==='RestElement'?item.argument:item.value,names);
}
// Declarations are collected before visiting references (var hoisting and lexical TDZ).
const isFunction=node=>['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node?.type);
function directBindings(statements,names){
 for(const stmt of statements||[]){
  if(!stmt)continue;
  if(stmt.type==='VariableDeclaration'&&stmt.kind!=='var')
   for(const decl of stmt.declarations)patternNames(decl.id,names);
  else if(['FunctionDeclaration','ClassDeclaration'].includes(stmt.type)&&stmt.id)
   names.add(stmt.id.name);
  else if(stmt.type==='ImportDeclaration')
   for(const spec of stmt.specifiers)names.add(spec.local.name);
 }
}
function hoistedVars(node,names){
 if(!node||typeof node!=='object'||isFunction(node)||node.type==='StaticBlock')return;
 if(Array.isArray(node)){for(const item of node)hoistedVars(item,names);return;}
 if(node.type==='VariableDeclaration'&&node.kind==='var')
  for(const decl of node.declarations)patternNames(decl.id,names);
 for(const key of Object.keys(node)){
  if(['loc','start','end','range','parent'].includes(key))continue;
  const value=node[key];
  if(value&&typeof value==='object')hoistedVars(value,names);
 }
}
function createScope(node,parent){
 const scope={functions:new Set(),bindings:new Set(),aliases:new Map(),parent};
 if(node.type==='Program'){
  directBindings(node.body,scope.bindings);
  hoistedVars(node.body,scope.bindings);
  collectAliases(node.body,scope);
 }else if(node.type==='BlockStatement'){
  directBindings(node.body,scope.bindings);
  collectAliases(node.body,scope);
 }else if(node.type==='StaticBlock'){
  directBindings(node.body,scope.bindings);
  hoistedVars(node.body,scope.bindings);
  collectAliases(node.body,scope);
 }else if(node.type==='CatchClause'){
  patternNames(node.param,scope.bindings);
 }else if(node.type==='SwitchStatement'){
  for(const branch of node.cases)directBindings(branch.consequent,scope.bindings);
  for(const branch of node.cases)collectAliases(branch.consequent,scope);
 }else if(['ForStatement','ForInStatement','ForOfStatement'].includes(node.type)){
  const declaration=node.type==='ForStatement'?node.init:node.left;
  if(declaration?.type==='VariableDeclaration'&&declaration.kind!=='var')
   for(const decl of declaration.declarations)patternNames(decl.id,scope.bindings);
 }
 return scope;
}
function shadowed(name,scope){
 for(let current=scope;current;current=current.parent)
  if(current.bindings?.has(name))return true;
 return false;
}
// Only immutable aliases with a statically identifiable global origin are followed.
function aliasOrigin(node,scope){
 if(!node)return null;
 if(identifier(node,'document')&&!shadowed('document',scope))return 'document';
 if(identifier(node,'localStorage')&&!shadowed('localStorage',scope))return 'localStorage';
 for(const name of ['document','localStorage'])
  if(staticProperty(node,name)&&identifier(node.object,'globalThis')&&!shadowed('globalThis',scope))
   return name;
 return null;
}
function collectAliases(statements,scope){
 for(const stmt of statements||[]){
  if(stmt?.type!=='VariableDeclaration'||stmt.kind!=='const')continue;
  for(const decl of stmt.declarations){
   if(decl.id?.type!=='Identifier')continue;
   // The initializer is evaluated before the binding can be used.
   // One immutable hop is allowed; unknown or mutable predecessors never qualify.
   const direct=aliasOrigin(decl.init,scope);
   const prior=decl.init?.type==='Identifier'?aliasAt(decl.init.name,scope,decl.start):null;
   const origin=direct||prior?.origin;
   const depth=direct?0:(prior?.depth??0)+1;
   if(origin&&depth<=1)scope.aliases.set(decl.id.name,{origin,depth,after:decl.end});
  }
 }
}
function aliasAt(name,scope,position){
 for(let current=scope;current;current=current.parent){
  if(current.bindings?.has(name)){
   const alias=current.aliases?.get(name);
   return alias&&position>=alias.after?alias:null;
  }
 }
 return null;
}
// Explicit globalThis members bypass a shadowed document/localStorage name,
 // but only if globalThis itself resolves to the global binding.
function explicitGlobal(node,object,property,scope){
 return staticProperty(node,property)&&staticProperty(node.object,object)&&
  identifier(node.object.object,'globalThis')&&!shadowed('globalThis',scope);
}
// Explicit builtin access is global only when globalThis is not locally bound.
function globalBuiltin(node,name,scope){
 return staticProperty(node,name)&&identifier(node.object,'globalThis')&&!shadowed('globalThis',scope);
}
function walk(node,visit,parent=null,scope=null){
 if(!node||typeof node!=='object')return;
 if(Array.isArray(node)){
  for(const child of node)walk(child,visit,parent,scope);
  return;
 }
 if(typeof node.type!=='string')return;
 const scoped=['Program','BlockStatement','StaticBlock','CatchClause','SwitchStatement','ForStatement','ForInStatement','ForOfStatement'].includes(node.type);
 const ownScope=scoped?createScope(node,scope):scope;
 visit(node,parent,ownScope);
 let childScope=ownScope;
 if(isFunction(node)){
  childScope={functions:new Set(),bindings:new Set(),aliases:new Map(),parent:ownScope};
  for(const param of node.params)patternNames(param,childScope.bindings);
  if(node.type==='FunctionExpression'&&node.id)childScope.bindings.add(node.id.name);
  hoistedVars(node.body,childScope.bindings);
 }
 for(const key of Object.keys(node)){
  if(['loc','start','end','range','parent'].includes(key))continue;
  const value=node[key];
  if(value&&typeof value==='object')walk(value,visit,node,childScope);
 }
}
function syntaxError(file,source,error){
  const line=error.loc?.line??1,column=(error.loc?.column??0)+1;
  return {rule:'AST000',severity:'high',file,line,column,
    message:'JavaScript-Syntaxfehler: '+String(error.message).slice(0,180),
    suggestion:'Syntax an dieser Position korrigieren; keine Ausführung erfolgt.',confidence:'high'};
}
export function analyzeAST(file,source){
  if(typeof file!=='string'||typeof source!=='string')throw new TypeError('Datei und Quelltext müssen Strings sein');
  const type=file.endsWith('.mjs')?'module':file.endsWith('.cjs')?'script':'module';
  let tree;
  try{
    tree=parse(source,{ecmaVersion:'latest',sourceType:type,locations:true,allowHashBang:true});
  }catch(error){
    // Classic .js code often uses top-level return, or should be handled as scripts.
    if(type==='module'&&file.endsWith('.js')){
      try{tree=parse(source,{ecmaVersion:'latest',sourceType:'script',locations:true,allowHashBang:true});}
      catch(err){return {file,parser:'acorn-ast',findings:[syntaxError(file,source,err)],imports:[],functions:[],calls:[],parsed:false};}
    }else return {file,parser:'acorn-ast',findings:[syntaxError(file,source,error)],imports:[],functions:[],calls:[],parsed:false};
  }
  const findings=[],imports=[],functions=[],calls=[];
  const report=(rule,severity,node,message,suggestion,confidence='high')=>{
    findings.push({rule,severity,file,...loc(node),message,suggestion,confidence});
  };
  walk(tree,(node,parent,scope)=>{
    if(node.type==='ImportDeclaration'){
      imports.push({specifier:node.source.value,kind:'static',...loc(node)});
    }else if(node.type==='ImportExpression'){
      if(node.source?.type==='Literal'&&typeof node.source.value==='string')
        imports.push({specifier:node.source.value,kind:'dynamic-literal',...loc(node)});
      else report('AST007','info',node,'Dynamischer Import mit unbekanntem Ziel','Abhängigkeit zur Laufzeit gesondert prüfen.','medium');
    }
    if(node.type==='FunctionDeclaration'&&node.id?.name){
      const name=node.id.name;
      functions.push({name,...loc(node),async:!!node.async});
      if(scope?.functions.has(name))report('AST006','low',node,'Funktion im selben Block mehrfach deklariert: '+name,
        'Erneute Deklaration im gleichen Block prüfen.','medium');
      scope?.functions.add(name);
    }
    if(node.type==='CallExpression'){
      const name=describeCall(node.callee);
      if(name)calls.push({name,...loc(node)});
      if((identifier(node.callee,'Function')&&!shadowed('Function',scope))||globalBuiltin(node.callee,'Function',scope))report('AST002','high',node,'Dynamische Function-Kompilierung','Statischen Parser statt dynamischer Kompilierung verwenden.');
      if((identifier(node.callee,'eval')&&!shadowed('eval',scope))||globalBuiltin(node.callee,'eval',scope))report('AST001','high',node,'Direkter eval()-Aufruf','Unvertrauenswürdige Eingaben nicht als JavaScript ausführen.');
      if((member(node.callee,'localStorage','clear')&&!shadowed('localStorage',scope))||
        explicitGlobal(node.callee,'localStorage','clear',scope)||
        (staticProperty(node.callee,'clear')&&node.callee.object?.type==='Identifier'&&
         aliasAt(node.callee.object.name,scope,node.start)?.origin==='localStorage'))
        report('AST004','high',node,'Löscht gesamten localStorage','Nur gezielte eigene Schlüssel entfernen.');
      if((member(node.callee,'document','write')&&!shadowed('document',scope))||
        explicitGlobal(node.callee,'document','write',scope)||
        (staticProperty(node.callee,'write')&&node.callee.object?.type==='Identifier'&&
         aliasAt(node.callee.object.name,scope,node.start)?.origin==='document'))
        report('AST005','medium',node,'document.write()-Aufruf','Sichere DOM-Methoden einsetzen.');
    }
    if(node.type==='NewExpression'&&((identifier(node.callee,'Function')&&!shadowed('Function',scope))||globalBuiltin(node.callee,'Function',scope)))
      report('AST002','high',node,'Dynamische Function-Kompilierung','Statischen Parser statt dynamischer Kompilierung verwenden.');
    if(node.type==='AssignmentExpression'&&staticProperty(node.left,'innerHTML'))
      report('AST003','medium',node,'Zuweisung an innerHTML','Fremde Inhalte mit textContent darstellen oder sicher sanitizen.');
    // Reference scans the actual original text, including strings, below.
  });
  for(const match of source.matchAll(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g)){
    const pre=source.slice(0,match.index),line=pre.split('\n').length;
    const column=match.index-pre.lastIndexOf('\n');
    findings.push({rule:'SEC001',severity:'critical',file,line,column,
      message:'Möglicher privater Schlüssel im Quelltext',
      suggestion:'Schlüssel und Zugriffsrechte prüfen; kompromittierte Schlüssel rotieren.',confidence:'medium'});
  }
  findings.sort((a,b)=>ranks[a.severity]-ranks[b.severity]||a.line-b.line||a.column-b.column||a.rule.localeCompare(b.rule));
  return {file,parser:'acorn-ast',parsed:true,findings,imports,functions,calls};
}

export function inspectASTFiles(paths,{root=process.cwd()}={}){
  if(!Array.isArray(paths)||paths.length<1||paths.length>100)
    throw new Error('Zwischen 1 und 100 ausdrückliche Dateipfade erforderlich');
  const base=realpathSync(root),files=[];
  for(const input of paths){
    if(typeof input!=='string'||!input||input.includes('\0'))throw new Error('Ungültiger Pfad');
    const abs=realpathSync(resolve(base,input)),rel=relative(base,abs);
    if(rel==='..'||rel.startsWith('../')||isAbsolute(rel))
      throw new Error('Datei außerhalb des Repositorys verboten');
    if(!extensions.has(extname(abs)))throw new Error('Nur JS/MJS/CJS erlaubt');
    const stat=statSync(abs);
    if(!stat.isFile()||stat.size>maxBytes)throw new Error('Datei zu groß oder keine normale Datei');
    files.push(analyzeAST(rel.replaceAll('\\','/'),readFileSync(abs,'utf8')));
  }
  return {version:'2.1-ast-prototype',mode:'read-only',parser:'acorn-ast',files,
    totalFindings:files.reduce((n,f)=>n+f.findings.length,0),changesApplied:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const files=process.argv.slice(2);
    if(!files.length)throw new Error('Aufruf: node eval/genesis-ast/analyzer.mjs app.js [weitere.js]');
    process.stdout.write(JSON.stringify(inspectASTFiles(files),null,2)+'\n');
  }catch(error){process.stderr.write('GENESIS AST: '+error.message+'\n');process.exitCode=1;}
}
