// Offline verification of the GitHub Actions synthetic merge commit.
// No GitHub API, no credentials. Never execute inspected source.
import {execFileSync} from 'node:child_process';
import {inspect,render,astWorkerDefault,gitBlobHash} from '../../.github/scripts/neryx-codebrain.mjs';
const SHA=/^[a-f0-9]{40}$/i;
const run=(args,maxBuffer=131072)=>execFileSync('git',args,{encoding:'buffer',maxBuffer,timeout:8000,stdio:['ignore','pipe','pipe']});
const safeFile=p=>typeof p==='string'&&p.length<241&&!/[\x00-\x1f\x7f\\]/.test(p)&&!p.startsWith('/')&&!p.split('/').some(x=>!x||x==='.'||x==='..');
export async function inspectGitSnapshot({repo,number,expectedHead,git=run,ast=null}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||!Number.isSafeInteger(number)||number<1||!SHA.test(expectedHead||''))throw Error('Invalid snapshot context');
 const txt=args=>git(args).toString('utf8').trim();
 const merge=txt(['rev-parse','HEAD']);
 const base=txt(['rev-parse','HEAD^1']);
 const head=txt(['rev-parse','HEAD^2']);
 if(!SHA.test(merge)||!SHA.test(base)||head.toLowerCase()!==expectedHead.toLowerCase())throw Error('PR merge snapshot head mismatch');
 const diff=git(['diff','--no-ext-diff','--no-textconv','--name-status','-z','--no-renames',base,merge],131072);
 const decoded=diff.toString('utf8');
 if(!Buffer.from(decoded,'utf8').equals(diff))throw Error('Invalid git diff encoding');
 const entries=decoded.split('\0');
 if(entries.at(-1)!=='')throw Error('Invalid git diff output');
 entries.pop();
 if(entries.length===0||entries.length%2)throw Error('Invalid git diff entries');
 const files=[];
 const paths=new Set();
 for(let i=0;i<entries.length;i+=2){
  const [status,path]=[entries[i],entries[i+1]];
  if(!/^[AMD]$/.test(status)||!safeFile(path)||paths.has(path))throw Error('Unsupported git diff entry');
  paths.add(path);
  let sha='0'.repeat(40);
  if(status==='A'||status==='M'){
   sha=txt(['rev-parse','--verify',merge+':'+path]);
   if(!SHA.test(sha))throw Error('Invalid git blob SHA');
  }
  files.push({filename:path,status:status==='A'?'added':status==='M'?'modified':'removed',sha});
 }
 if(files.length>30)throw Error('Snapshot has too many changes');
 const pr={state:'open',base:{ref:'main'},head:{sha:head},changed_files:files.length};
 const prefix='https://api.github.com/repos/'+repo;
 const request=async(url,options)=>{
  if(url===prefix+'/pulls/'+number)return new Response(JSON.stringify(pr));
  if(url===prefix+'/pulls/'+number+'/files?per_page=100')return new Response(JSON.stringify(files));
  if(!url.startsWith(prefix+'/git/blobs/'))throw Error('Unexpected snapshot transport request');
  const sha=url.slice((prefix+'/git/blobs/').length);
  if(!SHA.test(sha))throw Error('Invalid snapshot blob ID');
  if(!files.some(f=>f.sha===sha))throw Error('Blob not in changed file list');
  const size=Number(txt(['cat-file','-s',sha]));
  if(!Number.isSafeInteger(size)||size<0)throw Error('Invalid git blob size');
  const bytes=size>70000?Buffer.alloc(0):git(['cat-file','blob',sha],73728);
  if(size<=70000&&bytes.length!==size)throw Error('Git blob length mismatch');
  if(size<=70000){
   const actual=gitBlobHash(bytes);
   if(actual!==sha.toLowerCase())throw Error('Git blob content hash mismatch');
  }
  const payload={sha,encoding:'base64',size,content:bytes.toString('base64')};
  return new Response(JSON.stringify(payload));
 };
 const result=await inspect({repo,number,anonymous:true,request,ast});
 if(!snapshotMatchesFiles(result,files))throw Error('Snapshot result file mismatch');
 return {result,merge,base,head};
}
// Compare scanner output against the independently enumerated Git changes.
export function snapshotMatchesFiles(result,files){
 if(!Array.isArray(files)||!files.length||!Array.isArray(result?.rows)||result.rows.length!==files.length)return false;
 const expected=new Map();
 for(const f of files){
  if(!safeFile(f?.filename)||expected.has(f.filename)||!['added','modified','removed'].includes(f.status))return false;
  expected.set(f.filename,f.status);
 }
 for(const row of result.rows){
  if(!row||!expected.has(row.file))return false;
  const removed=expected.get(row.file)==='removed';
  const deletion=row.status==='skipped'&&row.reason==='not-added-or-modified';
  if(removed!==deletion||(!removed&&row.reason==='not-added-or-modified'))return false;
  expected.delete(row.file);
 }
 return expected.size===0;
}
// Unsupported or deleted files remain disclosed; truncated or failed supported scans cannot pass.
export const snapshotPasses=r=>{
 if(!r||!Array.isArray(r.rows)||typeof r.complete!=='boolean'||typeof r.blocking!=='boolean')return false;
 const seen=new Set();
 for(const row of r.rows){
  if(!row||!safeFile(row.file)||seen.has(row.file)||!Array.isArray(row.findings)||row.findings.length>40)return false;
  seen.add(row.file);
  if(row.findings.some(f=>!f||!['confirmed','heuristic'].includes(f.kind)||!Number.isSafeInteger(f.line)||f.line<1||typeof f.rule!=='string'||!f.rule||typeof f.label!=='string'))return false;
  if(row.status==='skipped'&&row.findings.length)return false;
 }
 if(r.blocking!==r.rows.some(x=>x.findings.some(f=>f.kind==='confirmed')))return false;
 const checked=r.rows.filter(x=>x?.status==='checked').length;
 if(!checked||checked!==r.checked||r.complete!==r.rows.every(x=>x?.status==='checked')||r.blocking)return false;
 return r.rows.every(x=>x?.status==='checked'||
  (x?.status==='skipped'&&typeof x.file==='string'&&safeFile(x.file)&&(
   (x.reason==='unsupported-type'&&!/\.(?:js|mjs|cjs|json|ya?ml|py)$/i.test(x.file))||
   x.reason==='not-added-or-modified'
  )));
};
// Intentional unsupported skips are distinct from incomplete attempted scans.
export const snapshotOutcome=r=>!snapshotPasses(r)?'INCOMPLETE':r.complete?'COMPLETE':'PARTIAL_UNSUPPORTED';
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const number=Number(process.env.CODEBRAIN_PR_NUMBER);
  const data=await inspectGitSnapshot({repo:process.env.GITHUB_REPOSITORY,number,expectedHead:process.env.CODEBRAIN_PR_HEAD_SHA,ast:astWorkerDefault});
  console.log('NERYX SNAPSHOT: isolated Acorn AST active for JS/MJS/CJS');
  console.log('NERYX SNAPSHOT ONLY: merge='+data.merge+' PR-head='+data.head+' files='+data.result.rows.length+' checked='+data.result.checked+' skipped='+data.result.rows.filter(x=>x.status==='skipped').length+' errors='+data.result.rows.filter(x=>x.status==='error').length+' complete='+data.result.complete+' outcome='+snapshotOutcome(data.result));
  // C27: path and reason are sanitized, source content is never logged.
  for(const row of data.result.rows.filter(x=>x.status!=='checked')){
   const safeName=typeof row.file==='string'&&safeFile(row.file)?row.file:'[invalid-path]';
   const safeReason=typeof row.reason==='string'&&/^[a-z-]{1,48}$/.test(row.reason)?row.reason:'unknown';
   console.log('NERYX SNAPSHOT EXCEPTION: '+row.status+' '+safeReason+' '+safeName);
  }
  if(process.env.GITHUB_STEP_SUMMARY){
   const {appendFileSync}=await import('node:fs');
   appendFileSync(process.env.GITHUB_STEP_SUMMARY,'# NERYX CodeBrain: lokaler PR-Merge-Snapshot (ohne GitHub API)\n\n**Kein Live-API-Nachweis, kein unabhängiger Sicherheitsreview.**\n\n'+'**Snapshot-Abdeckung: '+snapshotOutcome(data.result)+'** (COMPLETE=alle geprüft; PARTIAL_UNSUPPORTED=nur ausdrücklich ausgelassene Dateien; INCOMPLETE=Scanfehler oder Abbruch).\n\n'+render(data.result));
  }
  if(!snapshotPasses(data.result))process.exitCode=1;
 }catch{
  console.error('NERYX SNAPSHOT: verification incomplete');
  process.exitCode=1;
 }
}
