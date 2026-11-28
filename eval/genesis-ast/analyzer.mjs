// GENESIS X CodeAnalyzer 2.1 – genuine Acorn AST, read-only, Node 22.
// Never evaluates, imports, bundles or modifies the analyzed source.
import {parse} from 'acorn';
import {readFileSync, realpathSync, statSync} from 'node:fs';
import {resolve, relative, extname, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const ranks={critical:0,high:1,medium:2,low:3,info:4};
const maxBytes=2_000_000;
const extensions=new Set(['.js','.mjs','.cjs']);

// A substitution-free template has a statically known cooked string value.
function literalTemplate(node){
  return node?.type==='TemplateLiteral'&&node.expressions.length===0&&
    node.quasis.length===1&&typeof node.quasis[0].value.cooked==='string'
    ?node.quasis[0].value.cooked:null;
}
function staticProperty(node,property){
  return node?.type==='MemberExpression' && (
    (!node.computed && node.property?.type==='Identifier' && node.property.name===property) ||
    (node.computed && (node.property?.type==='Literal' && node.property.value===property || literalTemplate(node.property)===property))
  );
}
// Follow assignment targets only, not computed keys, defaults or receiver reads.
function* assignmentTargets(root){
  const pending=[root];
  while(pending.length){
    const node=pending.pop();
    if(!node)continue;
    switch(node.type){
      case 'ArrayPattern': for(let i=node.elements.length-1;i>=0;i--)pending.push(node.elements[i]); break;
      case 'ObjectPattern':
        for(let i=node.properties.length-1;i>=0;i--){
          const p=node.properties[i]; pending.push(p.type==='RestElement'?p.argument:p.value);
        } break;
      case 'AssignmentPattern': pending.push(node.left); break;
      case 'RestElement': pending.push(node.argument); break;
      case 'MemberExpression': case 'Identifier': yield node; break;
    }
  }
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
 for(const name of ['eval','Function'])
  if((identifier(node,name)&&!shadowed(name,scope))||globalBuiltin(node,name,scope))return name;
 for(const name of ['document','localStorage'])
  if(staticProperty(node,name)&&globalObject(node.object,scope))
   return name;
 return null;
}
// Bounded string-only folding: no coercion, calls or execution.
function constantString(node,scope,position,depth=0){
 if(!node||depth>8)return null;
 if(node.type==='Literal'&&typeof node.value==='string')return node.value.length<=256?node.value:null;
 if(node.type==='TemplateLiteral'){
  const value=literalTemplate(node);
  return value!==null&&value.length<=256?value:null;
 }
 if(node.type==='Identifier'){
  const alias=aliasAt(node.name,scope,position);
  return alias?.origin==='constant-string'?alias.value:null;
 }
 if(node.type==='BinaryExpression'&&node.operator==='+'){
  const left=constantString(node.left,scope,position,depth+1);
  const right=constantString(node.right,scope,position,depth+1);
  return left!==null&&right!==null&&left.length+right.length<=256?left+right:null;
 }
 return null;
}
function collectAliases(statements,scope){
 for(const stmt of statements||[]){
  if(stmt?.type!=='VariableDeclaration'||stmt.kind!=='const')continue;
  for(const decl of stmt.declarations){
   // Simple immutable captures from an unshadowed global object.
   // No defaults, rest, nested patterns or computed keys are inferred.
   if(decl.id?.type==='ObjectPattern'&&globalObject(decl.init,scope)){
    for(const prop of decl.id.properties){
     if(prop.type!=='Property'||prop.computed||prop.kind!=='init'||prop.value?.type!=='Identifier')continue;
     const name=prop.key?.type==='Identifier'?prop.key.name:prop.key?.value;
     if(['eval','Function','document','localStorage'].includes(name))
      scope.aliases.set(prop.value.name,{origin:name,depth:0,after:decl.end});
    }
    continue;
   }
   if(decl.id?.type!=='Identifier')continue;
   // The initializer is evaluated before the binding can be used.
   // At most four additional immutable hops; unknown or mutable predecessors never qualify.
   const value=constantString(decl.init,scope,decl.start);
   if(value!==null){scope.aliases.set(decl.id.name,{origin:'constant-string',value,after:decl.end});continue;}
   // Null fallback is a possible receiver, not proof of definite identity.
   const nullable=decl.init?.type==='LogicalExpression'&&decl.init.operator==='??'&&
    decl.init.right?.type==='Literal'&&decl.init.right.value===null&&
    ['document','localStorage'].includes(aliasOrigin(decl.init.left,scope))
      ?aliasOrigin(decl.init.left,scope)+'-nullable':null;
   const direct=aliasOrigin(decl.init,scope)||nullable;
   const prior=decl.init?.type==='Identifier'?aliasAt(decl.init.name,scope,decl.start):null;
   const origin=direct||prior?.origin;
   const depth=direct?0:(prior?.depth??0)+1;
   if(origin&&depth<=4)scope.aliases.set(decl.id.name,{origin,depth,after:decl.end});
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
// Recognize unshadowed browser and Node.js global object names.
function globalObject(node,scope,depth=0){
 if(depth>4)return false;
 if(node?.type==='Identifier')return ['globalThis','window','self','global'].includes(node.name)&&!shadowed(node.name,scope);
 return node?.type==='MemberExpression'&&['globalThis','window','self','global'].some(name=>staticProperty(node,name))&&globalObject(node.object,scope,depth+1);
}
// Explicit global members bypass a shadowed document/localStorage name.
function explicitGlobal(node,object,property,scope){
 return staticProperty(node,property)&&staticProperty(node.object,object)&&
  globalObject(node.object.object,scope);
}
// Explicit builtin access requires an unshadowed global object name.
function globalBuiltin(node,name,scope){
 return staticProperty(node,name)&&globalObject(node.object,scope);
}
// Resolve only immutable, lexically visible builtin references. A sequence
// expression yields its final operand; no operand is evaluated by the analyzer.
function builtinReference(node,name,scope,position){
 if(node?.type==='SequenceExpression')node=node.expressions.at(-1);
 return (identifier(node,name)&&!shadowed(name,scope))||
  globalBuiltin(node,name,scope)||
  (node?.type==='Identifier'&&aliasAt(node.name,scope,position)?.origin===name);
}
// Narrow straight-line evidence only; never suppress a possible builtin call.
// Stop at the first unsupported statement or effect. An assignment can fail
// at runtime (e.g. a non-writable global), so this is confidence evidence only.
function replacementEvidence(tree){
 const marked=new WeakSet(), replaced=new Set(), captures=new Map();
 const names=['eval','Function'];
 const scope=createScope(tree,null);
 const direct=(n,name)=>globalBuiltin(n,name,scope)||
   (identifier(n,name)&&!shadowed(name,scope));
 const known=(n,name)=>n?.type==='Identifier'&&captures.has(n.name)
   ?captures.get(n.name)===name:direct(n,name)&&replaced.has(name);
 for(const stmt of tree.body){
  if(stmt.type==='EmptyStatement')continue;
  if(stmt.type==='VariableDeclaration'&&stmt.kind==='const'&&stmt.declarations.length===1){
   const d=stmt.declarations[0];
   if(d.id.type==='Identifier'&&names.some(n=>direct(d.init,n)||d.init?.type==='Identifier'&&captures.has(d.init.name))){
    captures.set(d.id.name,names.find(n=>known(d.init,n))||null);continue;
   }
   if(d.id.type==='ObjectPattern'&&identifier(d.init,'globalThis')&&!shadowed('globalThis',scope)&&d.id.properties.length===1){
    const p=d.id.properties[0],name=p.key?.name;
    if(p.type==='Property'&&!p.computed&&p.value?.type==='Identifier'&&names.includes(name)){
     captures.set(p.value.name,replaced.has(name)?name:null);continue;
    }
   }
   break;
  }
  const e=stmt.type==='ExpressionStatement'?stmt.expression:null;
  if(e?.type==='AssignmentExpression'&&e.operator==='='&&
    ['FunctionExpression','ArrowFunctionExpression'].includes(e.right?.type)&&
    identifier(e.left?.object,'globalThis')&&!shadowed('globalThis',scope)){
   const name=names.find(n=>staticProperty(e.left,n));
   if(name){replaced.add(name);continue;}
  }
  if(['CallExpression','NewExpression'].includes(e?.type)&&
     names.some(n=>known(e.callee,n)))marked.add(e);
  break;
 }
 return marked;
}
function walk(node,visit,parent=null,scope=null,uncertain=false){
 if(!node||typeof node!=='object')return;
 if(Array.isArray(node)){
  for(const child of node)walk(child,visit,parent,scope,uncertain);
  return;
 }
 if(typeof node.type!=='string')return;
 const scoped=['Program','BlockStatement','StaticBlock','CatchClause','SwitchStatement','ForStatement','ForInStatement','ForOfStatement'].includes(node.type);
 const ownScope=scoped?createScope(node,scope):scope;
 // C9: writes and branch joins take effect after their operand/branch evaluation.
 const postVisit=['AssignmentExpression','IfStatement','ConditionalExpression',
  'LogicalExpression','SwitchStatement','ForStatement','ForInStatement','ForOfStatement',
  'WhileStatement','DoWhileStatement','TryStatement'].includes(node.type);
 if(!postVisit)visit(node,parent,ownScope,uncertain);
 let childScope=ownScope;
 // A named class expression binds its name within its class definition.
 if(node.type==='ClassExpression'&&node.id){
  childScope={functions:new Set(),bindings:new Set([node.id.name]),aliases:new Map(),parent:ownScope};
 }
 if(isFunction(node)){
  childScope={functions:new Set(),bindings:new Set(),aliases:new Map(),parent:ownScope};
  for(const param of node.params)patternNames(param,childScope.bindings);
  if(node.type==='FunctionExpression'&&node.id)childScope.bindings.add(node.id.name);
  hoistedVars(node.body,childScope.bindings);
 }
 // Branches, loops, exception paths and uninvoked function bodies are not guaranteed to run.
 const uncertainChildren=uncertain||isFunction(node)||
  ['IfStatement','ConditionalExpression','LogicalExpression','SwitchStatement',
   'ForStatement','ForInStatement','ForOfStatement','WhileStatement','DoWhileStatement',
   'TryStatement','CatchClause'].includes(node.type);
 for(const key of Object.keys(node)){
  if(['loc','start','end','range','parent'].includes(key))continue;
  const value=node[key];
  if(value&&typeof value==='object')walk(value,visit,node,childScope,uncertainChildren);
 }
 if(postVisit)visit(node,parent,ownScope,uncertain);
}
function syntaxError(file,source,error){
  const line=error.loc?.line??1,column=(error.loc?.column??0)+1;
  return {rule:'AST000',severity:'high',file,line,column,
    message:'Acorn 8.15.0 lehnt den Quelltext in den getesteten Sprachmodi ab: '+String(error.message).slice(0,180),
    suggestion:'Sprachmodus, Dialekt und Syntax an dieser Position prüfen; keine Ausführung erfolgt.',confidence:'high'};
}
function scanSecretHeaders(file,source){
  const findings=[];
  let offset=0,line=1,lineStart=0;
  for(const match of source.matchAll(/-----BEGIN (?:(?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/g)){
    while(offset<match.index){
      const ch=source.charCodeAt(offset++);
      if(ch===13){line++;if(source.charCodeAt(offset)===10)offset++;lineStart=offset;}
      else if(ch===10||ch===0x2028||ch===0x2029){line++;lineStart=offset;}
    }
    const column=match.index-lineStart+1;
    findings.push({rule:'SEC001',severity:'critical',file,line,column,
      message:'Möglicher privater Schlüssel im Quelltext',
      suggestion:'Schlüssel und Zugriffsrechte prüfen; kompromittierte Schlüssel rotieren.',confidence:'medium'});
  }
  return findings;
}
export function analyzeAST(file,source){
  if(typeof file!=='string'||typeof source!=='string')throw new TypeError('Datei und Quelltext müssen Strings sein');
  // .js has no authoritative module/dialect metadata in this file-only API.
  // Try supported modes without executing or importing the source.
  const modes=file.endsWith('.mjs')?['module']:file.endsWith('.cjs')?['commonjs']:['module','script','commonjs'];
  let tree, lastError;
  for(const sourceType of modes){
    try{
      tree=parse(source,{ecmaVersion:'latest',sourceType:sourceType==='commonjs'?'script':sourceType,allowReturnOutsideFunction:sourceType==='commonjs',locations:true,allowHashBang:true});
      break;
    }catch(error){
      if(!(error instanceof SyntaxError))throw error;
      lastError=error;
    }
  }
  if(!tree)return {file,parser:'acorn-ast',findings:[...scanSecretHeaders(file,source),syntaxError(file,source,lastError)],imports:[],functions:[],calls:[],parsed:false};
  const findings=scanSecretHeaders(file,source),imports=[],functions=[],calls=[];
  const replacementHints=replacementEvidence(tree);
  const builtinConfidence=node=>replacementHints.has(node)?'medium':'high';
  // C12: explicit per-origin states. Only a proven straight-line replacement
  // suppresses a finding; unknown flow keeps the potentially original method.
  const states=new Map(['document','localStorage'].map(name=>
    [name,{kind:'original',at:0,possibleAt:Infinity}]));
  const state=origin=>states.get(origin);
  // A global rebinding separates old captures from future reads. Until
  // identity is proven again, never transfer a replacement across captures.
  const identityUncertain=new Set();
  const loseIdentity=origin=>{identityUncertain.add(origin);invalidate(origin);};
  const loseAllIdentity=()=>{for(const name of states.keys())loseIdentity(name);};
  // C14: each definitive state transition starts a fresh confidence epoch.
  // A prior maybe-write cannot keep lowering confidence after a full replacement
  // or an unknown call has invalidated that earlier branch history.
  const replace=(origin,at)=>{
    if(identityUncertain.has(origin))return;
    const s=state(origin);s.kind='replaced';s.at=at;s.possibleAt=Infinity;
  };
  const invalidate=origin=>{
    const s=state(origin);s.kind='unknown';s.at=0;s.possibleAt=Infinity;
  };
  const invalidateAll=()=>{for(const name of states.keys())invalidate(name);};
  const possible=(origin,at)=>{const s=state(origin);s.possibleAt=Math.min(s.possibleAt,at);};
  const stillKnown=(origin,pos,uncertain)=>{
    const s=state(origin);
    return uncertain||s.kind!=='replaced'||pos<s.at;
  };
  const confidenceFor=(origin,pos)=>pos>=state(origin).possibleAt?'medium':'high';
  // C24: a bound function captures the method at bind time. Keep this
  // separate from later changes to the underlying object's method.
  const boundFunctions=new WeakMap();
  const boundAt=(name,scope,pos)=>{
    for(let current=scope;current;current=current.parent){
      if(current.bindings?.has(name)){
        const found=boundFunctions.get(current)?.get(name);
        return found&&pos>=found.after?found:null;
      }
    }
    return null;
  };
  const boundSource=(expression,scope,pos)=>{
    if(expression?.type==='Identifier'){
      const prior=boundAt(expression.name,scope,pos);
      // C25: support a bounded chain of immutable function references.
      return prior&&prior.depth<4?{...prior,depth:prior.depth+1}:null;
    }
    if(expression?.type!=='CallExpression'||!staticProperty(expression.callee,'bind'))return null;
    // Restrict capture to a simple, known method access with inert bind args.
    if(expression.arguments.some(arg=>arg.type!=='Identifier'&&arg.type!=='Literal'))return null;
    const method=expression.callee.object;
    if(method?.type!=='MemberExpression')return null;
    const object=method.object;
    const origin=aliasOrigin(object,scope)||
      (object?.type==='Identifier'?aliasAt(object.name,scope,pos)?.origin:null);
    if(origin==='document'&&staticProperty(method,'write')||
       origin==='localStorage'&&staticProperty(method,'clear'))
      return {origin,originalPossible:stillKnown(origin,pos,false),
        confidence:confidenceFor(origin,pos),depth:0};
    return null;
  };
  // C5: only a freshly created function proves replacement; self-assignments,
  // unknown values and calls cannot justify suppressing a later warning.
  const provenReplacement=node=>node?.type==='AssignmentExpression'&&node.operator==='='&&
    ['ArrowFunctionExpression','FunctionExpression'].includes(node.right?.type);
  // C4: only a direct, unconditional assignment in EACH arm proves a join-point write.
  const simpleArmWrite=(arm,scope)=>{
    const stmt=arm?.type==='BlockStatement'&&arm.body.length===1?arm.body[0]:arm;
    const expr=stmt?.type==='ExpressionStatement'?stmt.expression:null;
    if(!provenReplacement(expr)||
       expr.left?.type!=='MemberExpression'||expr.left.object?.type!=='Identifier')return null;
    const name=expr.left.object.name,alias=aliasAt(name,scope,expr.start);
    if(alias?.origin==='document'&&staticProperty(expr.left,'write'))return 'document';
    if(alias?.origin==='localStorage'&&staticProperty(expr.left,'clear'))return 'localStorage';
    return null;
  };
  // C13: only side-effect-free, direct replacement arms can be merged by origin.
  // Any unsupported arm or effectful test falls back to C11's conservative barrier.
  const pureReplacementArm=(arm,scope)=>{
    if(!arm)return true;
    if(arm.type==='BlockStatement'&&arm.body.length===0)return true;
    return simpleArmWrite(arm,scope)!==null;
  };
  // C8: arguments and computed callee parts are evaluated before invoking a call.
  // Only traverse expressions executed now: a function body passed as a value is deferred.
  const eagerEffects=node=>{
    if(!node||typeof node!=='object')return false;
    if(Array.isArray(node))return node.some(eagerEffects);
    if(isFunction(node)||node.type==='ClassExpression')return false;
    // C19: deleting an inherited method can expose the original again inside
    // a conditional branch; the parent join must not preserve stale certainty.
    if(node.type==='UnaryExpression'&&node.operator==='delete')return true;
    if(['CallExpression','NewExpression','AwaitExpression','YieldExpression',
        'AssignmentExpression','UpdateExpression','TaggedTemplateExpression',
        'ImportExpression'].includes(node.type))return true;
    return Object.entries(node).some(([key,val])=>
      !['loc','start','end','range','parent'].includes(key)&&
      val&&typeof val==='object'&&eagerEffects(val));
  };
  const report=(rule,severity,node,message,suggestion,confidence='high')=>{
    findings.push({rule,severity,file,...loc(node),message,suggestion,confidence});
  };
  walk(tree,(node,parent,scope,uncertain)=>{
    if(node.type==='ImportDeclaration'){
      imports.push({specifier:node.source.value,kind:'static',...loc(node)});
    }else if(node.type==='ImportExpression'){
      if(node.source?.type==='Literal'&&typeof node.source.value==='string')
        imports.push({specifier:node.source.value,kind:'dynamic-literal',...loc(node)});
      else report('AST007','info',node,'Dynamischer Import mit unbekanntem Ziel','Abhängigkeit zur Laufzeit gesondert prüfen.','medium');
    }
    // VariableDeclarator is visited before its initializer; this preserves
    // the method's status at capture time, before bind()'s call barrier.
    if(node.type==='VariableDeclarator'&&parent?.type==='VariableDeclaration'&&
       ['const','let','var'].includes(parent.kind)&&
       node.id?.type==='Identifier'&&!uncertain){
      const bound=boundSource(node.init,scope,node.start);
      if(bound){
        if(!boundFunctions.has(scope))boundFunctions.set(scope,new Map());
        const mutable=parent.kind!=='const';
        boundFunctions.get(scope).set(node.id.name,{
          ...bound,originalPossible:mutable||bound.originalPossible,
          mutable,after:node.end
        });
      }
    }
    // Capture simple immutable destructured methods at declaration time.
    // Exclude defaults, rest, computed keys and nested patterns.
    if(node.type==='VariableDeclarator'&&parent?.type==='VariableDeclaration'&&
       parent.kind==='const'&&node.id?.type==='ObjectPattern'&&!uncertain){
      const object=node.init;
      const origin=aliasOrigin(object,scope)||
        (object?.type==='Identifier'?aliasAt(object.name,scope,node.start)?.origin:null);
      const key=origin==='document'?'write':origin==='localStorage'?'clear':null;
      if(key&&node.id.properties.every(p=>p.type==='Property'&&!p.computed&&
          p.kind==='init'&&p.value?.type==='Identifier')){
        for(const p of node.id.properties){
          if(!(identifier(p.key,key)||p.key?.type==='Literal'&&p.key.value===key))continue;
          if(!boundFunctions.has(scope))boundFunctions.set(scope,new Map());
          boundFunctions.get(scope).set(p.value.name,{
            origin,originalPossible:stillKnown(origin,node.start,false),
            confidence:confidenceFor(origin,node.start),depth:0,mutable:false,after:node.end
          });
        }
      }
    }
    // C26: record bound methods introduced by later assignments too.
    // Conditional/callback writes remain possible, never proven harmless.
    if(node.type==='AssignmentExpression'&&node.operator==='='&&
       node.left?.type==='Identifier'){
      let owner=scope;
      while(owner&&!owner.bindings?.has(node.left.name))owner=owner.parent;
      const known=owner&&boundFunctions.get(owner)?.get(node.left.name);
      const candidate=boundSource(node.right,scope,node.start);
      // A const binding cannot be reassigned to a new bound function.
      if(owner&&(known?.mutable||!known&&candidate)){
        if(!boundFunctions.has(owner))boundFunctions.set(owner,new Map());
        const next=candidate||known;
        boundFunctions.get(owner).set(node.left.name,{
          ...next,originalPossible:true,mutable:true,
          after:uncertain?node.start:node.end
        });
      }
    }
    if(node.type==='FunctionDeclaration'&&node.id?.name){
      const name=node.id.name;
      functions.push({name,...loc(node),async:!!node.async});
      if(scope?.functions.has(name))report('AST006','low',node,'Funktion im selben Block mehrfach deklariert: '+name,
        'Erneute Deklaration im gleichen Block prüfen.','medium');
      scope?.functions.add(name);
    }
    // C11 audit: a branch/loop/try may run code that restores an earlier method.
    // Revoke stale certainty at the join, then allow a proven two-arm replacement
    // below to establish a new one. Deferred function definitions are not executed.
    const safeIf=!uncertain&&node.type==='IfStatement'&&!eagerEffects(node.test)&&
      pureReplacementArm(node.consequent,scope)&&pureReplacementArm(node.alternate,scope);
    if(!uncertain&&['IfStatement','ConditionalExpression','LogicalExpression',
       'SwitchStatement','ForStatement','ForInStatement','ForOfStatement',
       'WhileStatement','DoWhileStatement','TryStatement'].includes(node.type)&&
       eagerEffects(node)&&!safeIf)invalidateAll();
    // Join only the supported two-arm shape; a missing arm is merely possible.
    if(!uncertain&&node.type==='IfStatement'){
      const yes=simpleArmWrite(node.consequent,scope);
      const no=simpleArmWrite(node.alternate,scope);
      if(yes&&yes===no)
        replace(yes,node.end);
      else for(const origin of new Set([yes,no].filter(Boolean)))
        // If this origin was already certainly replaced and both arms only
        // preserve or replace it with a fresh function, certainty is retained.
        if(!safeIf||state(origin).kind!=='replaced')
          possible(origin,node.end);
    }
    // C1: a written method is no longer a confirmed known builtin on that alias.
    // This is intentionally an order-local, conservative check; not control-flow proof.
    if(!uncertain&&provenReplacement(node)&&node.left?.type==='MemberExpression'&&
       node.left.object?.type==='Identifier'&&
       ['write','clear'].some(p=>staticProperty(node.left,p))){
      const alias=aliasAt(node.left.object.name,scope,node.start);
      if(alias&&((alias.origin==='document'&&staticProperty(node.left,'write'))||
                 (alias.origin==='localStorage'&&staticProperty(node.left,'clear'))))
        replace(alias.origin,node.end);
    }
    // C10: deleting, updating or assigning an unknown value ends a confirmed
    // method-replacement state. A newly created function remains a proven replacement.
    const mutation=node.type==='AssignmentExpression'&&node.left?.type==='MemberExpression'
      ?node.left
      :node.type==='UpdateExpression'&&node.argument?.type==='MemberExpression'
        ?node.argument
        :node.type==='UnaryExpression'&&node.operator==='delete'&&
          node.argument?.type==='MemberExpression'?node.argument:null;
    // Rebinding a global object can invalidate the identity assumptions of
    // existing aliases. Do not transfer a proven replacement across objects.
    // Unknown flow retains potential findings rather than suppressing them.
    const rebinding=node.type==='AssignmentExpression'?node.left:
      node.type==='UpdateExpression'||(node.type==='UnaryExpression'&&node.operator==='delete')?node.argument:null;
    if(rebinding){
      if(rebinding.type==='Identifier'&&!shadowed(rebinding.name,scope)){
        if(states.has(rebinding.name))loseIdentity(rebinding.name);
        if(['window','self','globalThis','global'].includes(rebinding.name))loseAllIdentity();
      }else if(rebinding.type==='MemberExpression'&&globalObject(rebinding.object,scope)){
        if(rebinding.computed&&rebinding.property?.type!=='Literal'&&literalTemplate(rebinding.property)===null)loseAllIdentity();
        else for(const name of states.keys())if(staticProperty(rebinding,name))loseIdentity(name);
        if(['window','self','globalThis','global'].some(name=>staticProperty(rebinding,name)))loseAllIdentity();
      }
    }
    // C20: an unknown computed property can designate the monitored method.
    // Only exact, freshly created replacements of a known property are proven.
    if(!uncertain&&mutation){
      // C21: globalThis.document, document and their immutable aliases all
      // refer to the same tracked method, unless the global name is shadowed.
      const object=mutation.object;
      const origin=aliasOrigin(object,scope)||
        (object?.type==='Identifier'?aliasAt(object.name,scope,node.start)?.origin:null);
      const unknownProperty=mutation.computed&&mutation.property?.type!=='Literal'&&literalTemplate(mutation.property)===null;
      const exactFresh=node.type==='AssignmentExpression'&&
        provenReplacement(node)&&!unknownProperty;
      if(!exactFresh&&origin==='document'&&
         (staticProperty(mutation,'write')||unknownProperty))
        invalidate('document');
      if(!exactFresh&&origin==='localStorage'&&
         (staticProperty(mutation,'clear')||unknownProperty))
        invalidate('localStorage');
    }
    if(node.type==='CallExpression'){
      // C22: indirect references and Function.prototype.call/apply still invoke
      // the underlying method. They must use the same provenance checks.
      const invoked=(callee)=>{
        if(callee?.type==='SequenceExpression')
          return invoked(callee.expressions.at(-1));
        // C23: a freshly bound method is invoked by the OUTER call, not by
        // the inner bind() expression. Do not report merely creating a bound fn.
        if(callee?.type==='CallExpression'&&
           staticProperty(callee.callee,'bind'))
          return invoked(callee.callee.object);
        if(callee?.type==='MemberExpression'&&
           (staticProperty(callee,'call')||staticProperty(callee,'apply')))
          return invoked(callee.object);
        return callee;
      };
      const target=invoked(node.callee);
      const bound=target?.type==='Identifier'?boundAt(target.name,scope,node.start):null;
      // C8: child expressions can mutate the known method before the outer call.
      if(!uncertain&&(eagerEffects(node.arguments)||
          (node.callee?.type==='MemberExpression'&&node.callee.computed&&
           eagerEffects(node.callee.property))))invalidateAll();
      const name=describeCall(node.callee);
      if(name)calls.push({name,...loc(node)});
      if(builtinReference(node.callee,'Function',scope,node.start))report('AST002','high',node,'Dynamische Function-Kompilierung','Statischen Parser statt dynamischer Kompilierung verwenden.',builtinConfidence(node));
      if(builtinReference(node.callee,'eval',scope,node.start))report('AST001','high',node,'Möglicher eval()-Aufruf','Unvertrauenswürdige Eingaben nicht als JavaScript ausführen.',builtinConfidence(node));
      if((bound?.origin==='localStorage'&&bound.originalPossible)||
         (member(target,'localStorage','clear')&&!shadowed('localStorage',scope))||
        explicitGlobal(target,'localStorage','clear',scope)||
        (staticProperty(target,'clear')&&target.object?.type==='Identifier'&&
         (aliasAt(target.object.name,scope,node.start)?.origin==='localStorage'&&
         stillKnown('localStorage',node.start,uncertain)||
         aliasAt(target.object.name,scope,node.start)?.origin==='localStorage-nullable')))
        report('AST004','high',node,'Löscht gesamten localStorage','Nur gezielte eigene Schlüssel entfernen.',
          confidenceFor('localStorage',node.start));
      if((bound?.origin==='document'&&bound.originalPossible)||
         (member(target,'document','write')&&!shadowed('document',scope))||
        explicitGlobal(target,'document','write',scope)||
        (staticProperty(target,'write')&&target.object?.type==='Identifier'&&
         (aliasAt(target.object.name,scope,node.start)?.origin==='document'&&
         stillKnown('document',node.start,uncertain)||
         aliasAt(target.object.name,scope,node.start)?.origin==='document-nullable')))
        report('AST005','medium',node,'document.write()-Aufruf','Sichere DOM-Methoden einsetzen.',
          confidenceFor('document',node.start));
    }
    // C6/C7: calls, constructors and suspension points may change shared methods.
    // Deferred bodies and uncertain paths must not change the outer scan state.
    if(!uncertain&&['CallExpression','NewExpression','AwaitExpression','YieldExpression'].includes(node.type)){
      invalidateAll();
    }
    if(node.type==='NewExpression'&&(builtinReference(node.callee,'Function',scope,node.start)))
      report('AST002','high',node,'Dynamische Function-Kompilierung','Statischen Parser statt dynamischer Kompilierung verwenden.',builtinConfidence(node));
    if(node.type==='AssignmentExpression'){
      for(const target of assignmentTargets(node.left)){
        if(staticProperty(target,'innerHTML')||
          (target.type==='MemberExpression'&&target.computed&&constantString(target.property,scope,target.start)==='innerHTML'))
          report('AST003','medium',target,'Zuweisung an innerHTML','Fremde Inhalte mit textContent darstellen oder sicher sanitizen.');
      }
      // A pattern can overwrite a monitored method or global binding. Never
      // retain a proven replacement across an unmodelled pattern write.
      if(!uncertain&&['ArrayPattern','ObjectPattern'].includes(node.left.type))invalidateAll();
    }
    // Reference scans the actual original text, including strings, below.
  });
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
