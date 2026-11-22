// GENESIS X Phase 2: compare actual committed Git blobs without checkout or source execution.
// Git commands receive fixed argv, no shell; the working tree and index are never altered.
import {execFileSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {relative,resolve,isAbsolute} from 'node:path';
import {createFindingReport} from './finding-report.mjs';

const SHA=/^[0-9a-f]{40}$/;
const git=(cwd,args,maxBuffer=2_500_000)=>{
  try{return execFileSync('git',args,{cwd,encoding:'utf8',timeout:12000,
    maxBuffer,stdio:['ignore','pipe','pipe']}).trimEnd();}
  catch{throw new Error('Git commit or blob unavailable; comparison aborted');}
};
function fileName(file){
  if(typeof file!=='string'||!file||file.includes('\\')||file.includes('\0')||
     file.startsWith('/')||file.split('/').some(x=>!x||x==='.'||x==='..')||
     !/\.(?:js|mjs|cjs)$/.test(file))throw new TypeError('Invalid JS file path');
}
function resolveCommit(root,sha){
  if(typeof sha!=='string'||!SHA.test(sha))throw new TypeError('Full commit SHA required');
  const commit=git(root,['rev-parse','--verify',sha+'^{commit}']);
  if(commit!==sha)throw new Error('Requested SHA does not resolve to that commit');
  return commit;
}
function blob(root,sha,path){
  const type=git(root,['cat-file','-t',sha+':'+path]);
  if(type!=='blob')throw new Error('Path is not a blob');
  const size=Number(git(root,['cat-file','-s',sha+':'+path]));
  if(!Number.isInteger(size)||size>2_000_000)throw new Error('Blob exceeds limit');
  // No trim: exact committed source bytes must be hashed by finding-report.mjs.
  try{return execFileSync('git',['show',sha+':'+path],{
    cwd:root,encoding:'utf8',timeout:12000,maxBuffer:2_500_000,
    stdio:['ignore','pipe','pipe']
  });}catch{throw new Error('Cannot read committed source blob');}
}
function key(f){return [f.ruleId,f.severity,f.message].join('\u0000');}
function diffFindings(before,after){
  const previous=new Map();
  for(const f of before){const k=key(f);if(!previous.has(k))previous.set(k,[]);previous.get(k).push(f);}
  const added=[],unchanged=[];
  for(const f of after){
    const available=previous.get(key(f));
    if(available?.length){
      const old=available.shift();
      unchanged.push({before:old,after:f});
    }else added.push(f);
  }
  const removed=[...previous.values()].flat();
  return {added,removed,unchanged};
}
export function compareGitFindings({root,baseSha,headSha,files}){
  if(typeof root!=='string'||!root)throw new TypeError('Repository root required');
  if(!Array.isArray(files)||files.length<1||files.length>20||
     new Set(files).size!==files.length)throw new TypeError('1..20 distinct explicit files required');
  for(const file of files)fileName(file);
  const cwd=realpathSync(root);
  if(git(cwd,['rev-parse','--show-toplevel'])!==cwd)
    throw new Error('Root must be the actual Git repository top-level');
  const base=resolveCommit(cwd,baseSha),head=resolveCommit(cwd,headSha);
  const perFile=[];
  for(const file of [...files].sort()){
    const oldReport=createFindingReport(file,blob(cwd,base,file),{gitSha:base});
    const newReport=createFindingReport(file,blob(cwd,head,file),{gitSha:head});
    const delta=diffFindings(oldReport.findings,newReport.findings);
    perFile.push({file,base:oldReport.source,head:newReport.source,
      parsed:{base:oldReport.parsed,head:newReport.parsed},
      ...delta,summary:{added:delta.added.length,removed:delta.removed.length,
        unchanged:delta.unchanged.length}});
  }
  return {
    schemaVersion:1,version:'2.8-git-findings-prototype',
    mode:'read-only',changesApplied:false,
    repository:{baseSha:base,headSha:head,files:perFile.length},
    files:perFile,
    summary:{added:perFile.reduce((n,f)=>n+f.summary.added,0),
      removed:perFile.reduce((n,f)=>n+f.summary.removed,0),
      unchanged:perFile.reduce((n,f)=>n+f.summary.unchanged,0)},
    limitations:[
      'Rule/message matching is heuristic and may pair unrelated findings in the same file',
      'Line movement alone is not considered a new finding',
      'No AST node identity, semantic bug proof, execution, checkout, patch, merge or deployment'
    ]
  };
}
