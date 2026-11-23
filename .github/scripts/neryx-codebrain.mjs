import {analyzeSource} from '../../eval/genesis/code-analyzer.mjs';
import {appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// PR contents are fetched as inert blobs, never checked out or executed.
const okPath=p=>typeof p==='string'&&p.length<241&&!/[\x00-\x1f\x7f\\]/.test(p)&&!p.startsWith('/')&&!p.split('/').some(x=>!x||x==='.'||x==='..');
const clean=s=>String(s).replace(/[^\p{L}\p{N} ./_-]/gu,'_').slice(0,240);
export const parserEnv=()=>({PATH:process.env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8'});
const astLabels={AST000:'Syntaxfehler',AST001:'Dynamische Ausführung',AST002:'Dynamische Kompilierung',AST003:'HTML-Zuweisung',AST004:'Speicherlöschung',AST005:'document.write',AST006:'Mögliche doppelte Funktion',AST007:'Unbekanntes Importziel',SEC001:'Möglicher privater Schlüssel'};
const pythonSyntaxDefault=source=>{
 const helper=fileURLToPath(new URL('./neryx-python-syntax.py',import.meta.url));
 const output=execFileSync('python3',['-I','-S',helper],{input:source,timeout:5000,maxBuffer:4096,windowsHide:true,stdio:['pipe','pipe','pipe'],env:parserEnv()});
 const parsed=JSON.parse(output.toString('utf8'));
 if(typeof parsed.parsed!=='boolean')throw Error('invalid python result');
 return parsed;
};
const yamlSyntaxDefault=source=>{
 const helper=fileURLToPath(new URL('./neryx-yaml-syntax.rb',import.meta.url));
 const output=execFileSync('ruby',['-W0',helper],{input:source,timeout:5000,maxBuffer:4096,windowsHide:true,stdio:['pipe','pipe','pipe'],env:parserEnv()});
 const parsed=JSON.parse(output.toString('utf8'));
 if(typeof parsed.parsed!=='boolean')throw Error('invalid YAML result');
 return parsed;
};
// Shared isolated AST parser for trusted manual and unprivileged snapshot scanning.
export const astWorkerDefault=(path,source)=>{
 const helper=fileURLToPath(new URL('../../eval/genesis-ast/codebrain-worker.mjs',import.meta.url));
 const output=execFileSync(process.execPath,['--max-old-space-size=128',helper],{
  input:JSON.stringify({path,source}),timeout:2500,maxBuffer:16384,windowsHide:true,stdio:['pipe','pipe','pipe'],env:parserEnv()
 });
 const result=JSON.parse(output.toString('utf8'));
 if(!result||typeof result.parsed!=='boolean'||!Array.isArray(result.findings))throw Error('invalid AST worker result');
 return result;
};
const labels={JS001:'Dynamische Ausführung',JS002:'Dynamische Kompilierung',JS003:'HTML-Zuweisung',JS004:'Speicherlöschung',JS005:'document.write',JS006:'Mögliche doppelte Funktion',SEC001:'Möglicher privater Schlüssel'};

export async function inspect({repo,number,token,request=fetch,analyze=analyzeSource,ast=null,anonymous=false,pythonSyntax=pythonSyntaxDefault,yamlSyntax=yamlSyntaxDefault}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!Number.isInteger(number)||number<1||number>1000000||(!anonymous&&!token))throw Error('Ungültiger Auftrag');
 const base='https://api.github.com/repos/'+repo;
 const get=async path=>{
  const response=await request(base+path,{headers:{...(anonymous?{}:{Authorization:'Bearer '+token}),Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('GitHub HTTP '+response.status);
  // GitHub file-list responses include patches; bound transport bytes before JSON.parse.
  // Limits: PR metadata 64 KiB, file list 4 MiB, individual blobs 96 KiB.
  const limit=path.includes('/git/blobs/')?98304:path.includes('/files?')?4194304:65536;
  if(response.headers?.get){
   const length=Number(response.headers.get('content-length'));
   if(Number.isFinite(length)&&length>limit)throw Error('GitHub response too large');
  }
  if(response.body?.getReader){
   const reader=response.body.getReader();
   const chunks=[];let total=0;
   try{
    while(true){
     const {done,value}=await reader.read();
     if(done)break;
     total+=value.byteLength;
     if(total>limit)throw Error('GitHub response too large');
     chunks.push(value);
    }
   }catch(e){await reader.cancel().catch(()=>{});throw e;}
   return JSON.parse(Buffer.concat(chunks,total).toString('utf8'));
  }
  // Compatibility with in-memory mock responses used by offline contract tests.
  return response.json();
 };
 const pr=await get('/pulls/'+number);
 if(pr?.state!=='open'||pr?.base?.ref!=='main'||!/^[a-f0-9]{40}$/i.test(pr?.head?.sha||''))throw Error('PR nicht geeignet');
 if(!Number.isInteger(pr.changed_files)||pr.changed_files<1||pr.changed_files>30)throw Error('Leere oder zu große Dateiliste');
 const files=await get('/pulls/'+number+'/files?per_page=100');
 if(!Array.isArray(files)||files.length!==pr.changed_files)throw Error('Unvollständige Dateiliste');
 const rows=[];let used=0;
 for(const f of files){
  const path=f?.filename;
  const row={file:okPath(path)?path:'[invalid-path]',status:'skipped',reason:'unsupported',findings:[]};
  rows.push(row);
  if(!okPath(path)){row.reason='invalid-path';continue;}
  if(!['added','modified'].includes(f.status)){row.reason='not-added-or-modified';continue;}
  if(!/\.(js|mjs|cjs|json|yml|yaml|py)$/.test(path)){row.reason='unsupported-type';continue;}
  if(!/^[a-f0-9]{40}$/i.test(f.sha||'')){row.reason='invalid-sha';continue;}
  try{
   const blob=await get('/git/blobs/'+f.sha);
   if(blob.encoding!=='base64'||typeof blob.content!=='string'||blob.content.length>85000||!Number.isInteger(blob.size)||blob.size<0||blob.size>60000||used+blob.size>400000){row.reason='size-or-encoding';continue;}
   // Buffer.from(..., 'base64') silently ignores invalid characters: reject corruption.
   if(blob.sha!==undefined&&blob.sha!==f.sha)throw Error('Blob SHA mismatch');
   const encoded=blob.content.replace(/[\r\n]/g,'');
   if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw Error('Invalid base64');
   const bytes=Buffer.from(encoded,'base64');
   if(bytes.length!==blob.size||bytes.includes(0)||bytes.toString('base64')!==encoded)throw Error('Invalid bytes');
   const source=bytes.toString('utf8');
   if(!Buffer.from(source,'utf8').equals(bytes))throw Error('Invalid UTF8');
   used+=bytes.length;
   let matches=[];
   if(/\.py$/.test(path)){
    const parsed=pythonSyntax(source);
    if(!parsed||typeof parsed.parsed!=='boolean')throw Error('invalid python syntax result');
    if(!parsed.parsed)matches=[{rule:'PY000',line:Number.isInteger(parsed.line)&&parsed.line>0?parsed.line:1,label:'Python-Syntaxfehler',kind:'confirmed'}];
    row.reason='python-ast-parse';
   }else if(/\.json$/.test(path)){
    try{JSON.parse(source);}catch{
     matches=[{rule:'JSON000',line:1,label:'JSON-Syntaxfehler',kind:'confirmed'}];
    }
    row.reason='json-parse';
   }else if(/\.ya?ml$/.test(path)){
    // Psych.parse_stream creates an AST only: no YAML object deserialization.
    const parsed=yamlSyntax(source);
    if(!parsed||typeof parsed.parsed!=='boolean')throw Error('invalid YAML syntax result');
    if(!parsed.parsed)matches.push({rule:'YAML000',line:Number.isInteger(parsed.line)&&parsed.line>0?parsed.line:1,label:'YAML-Syntaxfehler',kind:'confirmed'});
    const markers=[[/pull_request_target\s*:/,'CI-Trigger pull_request_target'],[/\b(?:contents|actions|pull-requests)\s*:\s*write\b/,'CI-Schreibrechte'],[/\$\{\{[^\n]*github\.event\./,'Unvertrauenswürdiger Event-Ausdruck']];
    for(const [re,label] of markers)if(re.test(source))matches.push({rule:'YAML-WARN',line:1,label,kind:'heuristic'});
    row.reason='yaml-ast-parse';
   }else if(ast){
    const data=ast(path,source);
    if(!data||!Array.isArray(data.findings)||typeof data.parsed!=='boolean'||(!data.parsed&&!data.findings.some(v=>v?.rule==='AST000')))throw Error('Bad AST result');
    matches=data.findings.map(v=>({rule:v.rule,line:v.line,label:astLabels[v.rule]||'AST-Hinweis',kind:v.rule==='AST000'?'confirmed':'heuristic'}));
    row.reason=data.parsed?'ast':'ast-syntax-error';
   }else{
    // JS000 from vm.Script is unreliable for ESM; never report it as confirmed syntax.
    matches=analyze(path,source).filter(v=>v.rule!=='JS000').map(v=>({rule:v.rule,line:v.line,label:labels[v.rule]||'Heuristischer Hinweis',kind:'heuristic'}));
    row.reason='heuristic-only';
   }
   row.status='checked';
   row.findings=matches.slice(0,40).map(v=>({rule:v.rule,line:v.line,label:v.label,kind:v.kind}));
   if(matches.length>40){row.status='skipped';row.reason='findings-truncated';}
  }catch{row.status='error';row.reason='fetch-or-analyzer-error';}
 }
 const fresh=await get('/pulls/'+number);
 if(fresh?.head?.sha!==pr.head.sha||fresh?.state!=='open'||fresh?.base?.ref!=='main')throw Error('PR changed during review');
 return {number,sha:pr.head.sha,rows,checked:rows.filter(x=>x.status==='checked').length,complete:rows.every(x=>x.status==='checked'),blocking:rows.some(x=>x.findings.some(f=>f.kind==='confirmed'))};
}
export function render(r){
 const lines=['# NERYX CodeBrain 1.4','','Keine API-KI. Syntaxprüfung für JS, Python, JSON und YAML; Sicherheitswarnungen bleiben heuristisch. Keine vollständige Codefreigabe.','','PR #'+r.number+' | Commit '+r.sha,'','**Abdeckung: '+(r.complete?'alle unterstützten Dateitypen geprüft':'UNVOLLSTÄNDIG')+'**',r.blocking?'**Bestätigte Syntaxfehler gefunden: Prüfung nicht bestanden.**':'**Keine bestätigten Syntaxfehler in unterstützten Prüfungen festgestellt.**','','| Datei | Status | Hinweise |','|---|---|---|'];
 for(const x of r.rows){
  lines.push('| '+clean(x.file)+' | '+clean(x.status)+' ('+clean(x.reason)+') | '+x.findings.length+' |');
  for(const v of x.findings)lines.push('- '+clean(v.rule)+' in Zeile '+Number(v.line||0)+': '+clean(v.label)+' ('+(v.kind==='confirmed'?'bestätigter Syntaxfehler':'heuristische Warnung')+')');
 }
 lines.push('','Ein grüner Lauf garantiert weder Korrektheit noch Sicherheit.');
 return lines.join('\n')+'\n';
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const r=await inspect({repo:process.env.GITHUB_REPOSITORY,number:Number(process.env.PR_NUMBER),token:process.env.GH_TOKEN,ast:astWorkerDefault});
  const summary=render(r);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
  else console.log(summary);
  console.log('NERYX CodeBrain checked='+r.checked+' total='+r.rows.length);
  if(!r.complete||r.blocking)process.exitCode=1;
 }catch(e){
  const detail=/^GitHub HTTP \d{3}$/.test(e.message)?e.message:'Check incomplete';
  console.error('NERYX CodeBrain: '+detail);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'# NERYX CodeBrain\n\nPrüfung fehlgeschlagen: '+detail+'\n');
  process.exitCode=1;
 }
}
