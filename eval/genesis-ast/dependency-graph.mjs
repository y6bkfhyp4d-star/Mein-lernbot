// GENESIS X CodeAnalyzer 2.3 – read-only, explicit-file dependency graph.
// No scanned code is executed; no implicit imports are loaded from disk.
import {parse} from 'acorn';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,relative,extname,dirname,isAbsolute,normalize,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const LIMIT=100,MAX_BYTES=2_000_000;
const EXTENSIONS=new Set(['.js','.mjs','.cjs']);
const windowsPath=s=>s.split(sep).join('/');

function parseEdges(file,source){
  let ast;
  const type=file.endsWith('.cjs')?'script':'module';
  try{ast=parse(source,{ecmaVersion:'latest',sourceType:type,locations:true,allowHashBang:true});}
  catch(error){
    if(file.endsWith('.js')){
      try{ast=parse(source,{ecmaVersion:'latest',sourceType:'script',locations:true,allowHashBang:true});}
      catch(second){return {parsed:false,edges:[],parseError:{line:second.loc?.line??1,column:(second.loc?.column??0)+1,message:String(second.message).slice(0,180)}};}
    }else return {parsed:false,edges:[],parseError:{line:error.loc?.line??1,column:(error.loc?.column??0)+1,message:String(error.message).slice(0,180)}};
  }
  const edges=[];
  function record(node,specifier,kind){
    edges.push({from:file,specifier,kind,line:node.loc.start.line,column:node.loc.start.column+1});
  }
  function walk(node){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){for(const item of node)walk(item);return;}
    if(typeof node.type!=='string')return;
    if(node.type==='ImportDeclaration')record(node,node.source.value,'import');
    if(node.type==='ExportNamedDeclaration'&&node.source)record(node,node.source.value,'reexport');
    if(node.type==='ExportAllDeclaration')record(node,node.source.value,'reexport-all');
    if(node.type==='ImportExpression'&&node.source?.type==='Literal'&&typeof node.source.value==='string')
      record(node,node.source.value,'dynamic-literal');
    if(node.type==='ImportExpression'&&!(node.source?.type==='Literal'&&typeof node.source.value==='string'))
      edges.push({from:file,specifier:null,kind:'dynamic-unknown',line:node.loc.start.line,column:node.loc.start.column+1});
    for(const [key,value] of Object.entries(node)){
      if(['type','start','end','loc','raw','value','name'].includes(key))continue;
      if(value&&typeof value==='object')walk(value);
    }
  }
  walk(ast);
  return {parsed:true,edges,parseError:null};
}
function resolveEdge(edge,nodes){
  const s=edge.specifier;
  if(s===null)return {...edge,status:'unknown-dynamic',to:null};
  if(!s.startsWith('./')&&!s.startsWith('../'))
    return {...edge,status:'external',to:null};
  // Reject query/hash syntax for local modules: cannot safely infer a filesystem target.
  if(/[?#]/.test(s))return {...edge,status:'unresolved-specifier',to:null};
  const base=normalize(resolve('/',dirname(edge.from),s)).slice(1).replaceAll('\\','/');
  if(base==='..'||base.startsWith('../'))return {...edge,status:'out-of-root',to:null};
  const candidates=extname(base)?[base]:[base+'.js',base+'.mjs',base+'.cjs',base+'/index.js',base+'/index.mjs',base+'/index.cjs'];
  const matches=candidates.filter(c=>nodes.has(c));
  if(matches.length===1)return {...edge,status:'resolved',to:matches[0]};
  if(matches.length>1)return {...edge,status:'ambiguous',to:null};
  return {...edge,status:'not-supplied',to:null};
}
function cycles(nodes,edges){
  const deps=new Map(nodes.map(n=>[n,[]]));
  for(const e of edges)if(e.status==='resolved')deps.get(e.from).push(e.to);
  const ids=new Map(),low=new Map(),stack=[],active=new Set(),out=[];let next=0;
  function dfs(n){
    ids.set(n,next);low.set(n,next++);
    stack.push(n);active.add(n);
    for(const m of deps.get(n)){
      if(!ids.has(m)){dfs(m);low.set(n,Math.min(low.get(n),low.get(m)));}
      else if(active.has(m))low.set(n,Math.min(low.get(n),ids.get(m)));
    }
    if(low.get(n)===ids.get(n)){
      const group=[];let p;
      do{p=stack.pop();active.delete(p);group.push(p);}while(p!==n);
      if(group.length>1||deps.get(n).includes(n))out.push(group.sort());
    }
  }
  for(const n of nodes)if(!ids.has(n))dfs(n);
  return out.sort((a,b)=>a[0].localeCompare(b[0]));
}
function impactFor(target,edges){
  const reverse=new Map();
  for(const e of edges)if(e.status==='resolved'){
    if(!reverse.has(e.to))reverse.set(e.to,new Set());
    reverse.get(e.to).add(e.from);
  }
  const seen=new Set(),queue=[target];
  while(queue.length){
    const n=queue.shift();
    for(const x of reverse.get(n)||[])if(x!==target&&!seen.has(x)){seen.add(x);queue.push(x);}
  }
  return [...seen].sort();
}
export function buildDependencyGraph(sources){
  if(!sources||typeof sources!=='object'||Array.isArray(sources))throw new TypeError('Datei-zu-Quelltext Objekt erforderlich');
  const entries=Object.entries(sources);
  if(!entries.length||entries.length>LIMIT)throw new Error('1 bis 100 explizite Dateien erforderlich');
  const seen=new Set(),files=[],raw=[];
  for(const [filename,source] of entries){
    if(typeof filename!=='string'||typeof source!=='string'||!filename||filename.includes('\0'))
      throw new TypeError('Ungültiger Dateiname oder Quelltext');
    const normalized=normalize(filename).replaceAll('\\','/');
    if(isAbsolute(filename)||normalized==='..'||normalized.startsWith('../')||normalized.startsWith('/')||
       normalized==='.'||!EXTENSIONS.has(extname(normalized))||seen.has(normalized))
      throw new Error('Dateipfad nicht erlaubt oder doppelt: '+filename);
    if(Buffer.byteLength(source,'utf8')>MAX_BYTES)throw new Error('Datei zu groß: '+filename);
    seen.add(normalized);
    const parsed=parseEdges(normalized,source);
    files.push({file:normalized,parsed:parsed.parsed,...(parsed.parseError?{parseError:parsed.parseError}:{})});
    raw.push(...parsed.edges);
  }
  files.sort((a,b)=>a.file.localeCompare(b.file));
  const nodes=files.map(f=>f.file),set=new Set(nodes);
  const edges=raw.map(e=>resolveEdge(e,set)).sort((a,b)=>a.from.localeCompare(b.from)||a.line-b.line||a.column-b.column);
  const impact=Object.fromEntries(nodes.map(n=>[n,impactFor(n,edges)]));
  return {version:'2.3-dependency-prototype',mode:'read-only',files,edges,cycles:cycles(nodes,edges),impact,
    summary:{files:nodes.length,edges:edges.length,resolved:edges.filter(e=>e.status==='resolved').length,
      unresolved:edges.filter(e=>!['resolved','external'].includes(e.status)).length},
    limitations:['Only explicitly provided files are analyzed','Unresolved imports are not assumed safe','Impact means potential reverse dependencies, not runtime proof'],
    changesApplied:false};
}
export function inspectDependencyFiles(paths,{root=process.cwd()}={}){
  if(!Array.isArray(paths)||paths.length<1||paths.length>LIMIT)throw new Error('1 bis 100 Dateipfade notwendig');
  const base=realpathSync(root),sources=Object.create(null);
  for(const input of paths){
    if(typeof input!=='string'||!input||input.includes('\0'))throw new Error('Ungültiger Pfad');
    const full=realpathSync(resolve(base,input)),rel=relative(base,full);
    if(rel==='..'||rel.startsWith('../')||isAbsolute(rel)||!EXTENSIONS.has(extname(full)))
      throw new Error('Datei außerhalb des Projektordners oder kein JavaScript');
    const info=statSync(full);
    if(!info.isFile()||info.size>MAX_BYTES)throw new Error('Datei zu groß oder kein reguläres File');
    const key=windowsPath(rel);
    if(Object.hasOwn(sources,key))throw new Error('Datei doppelt: '+key);
    sources[key]=readFileSync(full,'utf8');
  }
  return buildDependencyGraph(sources);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const paths=process.argv.slice(2);
    if(!paths.length)throw new Error('Aufruf: node dependency-graph.mjs <datei.js> [weitere Dateien]');
    console.log(JSON.stringify(inspectDependencyFiles(paths),null,2));
  }catch(error){console.error('GENESIS dependency graph: '+error.message);process.exitCode=1;}
}
