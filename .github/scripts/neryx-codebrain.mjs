import {analyzeSource} from '../../eval/genesis/code-analyzer.mjs';
import {appendFileSync} from 'node:fs';

// PR contents are fetched as inert blobs, never checked out or executed.
const okPath=p=>typeof p==='string'&&p.length<241&&!/[\x00-\x1f\x7f\\]/.test(p)&&!p.startsWith('/')&&!p.split('/').some(x=>!x||x==='.'||x==='..');
const clean=s=>String(s).replace(/[^\p{L}\p{N} ./_-]/gu,'_').slice(0,240);
const labels={JS001:'Dynamische Ausführung',JS002:'Dynamische Kompilierung',JS003:'HTML-Zuweisung',JS004:'Speicherlöschung',JS005:'document.write',JS006:'Mögliche doppelte Funktion',SEC001:'Möglicher privater Schlüssel'};

export async function inspect({repo,number,token,request=fetch,analyze=analyzeSource}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!Number.isInteger(number)||number<1||number>1000000||!token)throw Error('Ungültiger Auftrag');
 const base='https://api.github.com/repos/'+repo;
 const get=async path=>{
  const response=await request(base+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});
  if(!response.ok)throw Error('GitHub HTTP '+response.status);
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
  if(!/\.(js|mjs|cjs)$/.test(path)){row.reason='unsupported-type';continue;}
  if(!/^[a-f0-9]{40}$/i.test(f.sha||'')){row.reason='invalid-sha';continue;}
  try{
   const blob=await get('/git/blobs/'+f.sha);
   if(blob.encoding!=='base64'||typeof blob.content!=='string'||!Number.isInteger(blob.size)||blob.size>60000||used+blob.size>400000){row.reason='size-or-encoding';continue;}
   const bytes=Buffer.from(blob.content.replace(/\s/g,''),'base64');
   if(bytes.length!==blob.size||bytes.includes(0))throw Error('Invalid bytes');
   const source=bytes.toString('utf8');
   if(!Buffer.from(source,'utf8').equals(bytes))throw Error('Invalid UTF8');
   used+=bytes.length;
   // Ignore JS000: vm.Script does not parse ESM. Syntax will be added via Acorn in phase 2.
   const matches=analyze(path,source).filter(v=>v.rule!=='JS000');
   row.status='checked';row.reason='heuristic-only';
   row.findings=matches.slice(0,40).map(v=>({rule:v.rule,line:v.line,label:labels[v.rule]||'Heuristischer Hinweis'}));
   if(matches.length>40){row.status='skipped';row.reason='findings-truncated';}
  }catch{row.status='error';row.reason='fetch-or-analyzer-error';}
 }
 return {number,sha:pr.head.sha,rows,checked:rows.filter(x=>x.status==='checked').length,complete:rows.every(x=>x.status==='checked')};
}
export function render(r){
 const lines=['# NERYX CodeBrain 1.0','','Keine API-KI. Nur heuristische Hinweise; keine bestätigte vollständige Codeprüfung.','','PR #'+r.number+' | Commit '+r.sha,'','**Abdeckung: '+(r.complete?'vollständig für unterstützte Heuristik':'UNVOLLSTÄNDIG')+'**','','| Datei | Status | Hinweise |','|---|---|---|'];
 for(const x of r.rows){
  lines.push('| '+clean(x.file)+' | '+clean(x.status)+' ('+clean(x.reason)+') | '+x.findings.length+' |');
  for(const v of x.findings)lines.push('- '+clean(v.rule)+' in Zeile '+Number(v.line||0)+': '+clean(v.label)+' (unbestätigt)');
 }
 lines.push('','Ein grüner Lauf garantiert weder Korrektheit noch Sicherheit.');
 return lines.join('\n')+'\n';
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const r=await inspect({repo:process.env.GITHUB_REPOSITORY,number:Number(process.env.PR_NUMBER),token:process.env.GH_TOKEN});
  const summary=render(r);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
  else console.log(summary);
  console.log('NERYX CodeBrain checked='+r.checked+' total='+r.rows.length);
  if(!r.complete)process.exitCode=1;
 }catch(e){
  const detail=/^GitHub HTTP \d{3}$/.test(e.message)?e.message:'Check incomplete';
  console.error('NERYX CodeBrain: '+detail);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'# NERYX CodeBrain\n\nPrüfung fehlgeschlagen: '+detail+'\n');
  process.exitCode=1;
 }
}
