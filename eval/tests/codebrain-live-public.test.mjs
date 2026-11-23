// Credential-free, unprivileged, opt-in smoke against the triggering public PR.
// Caution: the pull_request workflow runs test code from the PR checkout, but has
// permissions: {} and no secrets. It is NOT a privileged trusted-code review.
import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect,render} from '../../.github/scripts/neryx-codebrain.mjs';

test('anonymously inspect triggering public PR via GitHub REST API', {skip:process.env.CODEBRAIN_LIVE_PUBLIC!=='1'}, async(t)=>{
 const repo=process.env.GITHUB_REPOSITORY;
 const number=Number(process.env.CODEBRAIN_PR_NUMBER);
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||!Number.isSafeInteger(number)||number<1)throw Error('Invalid triggering PR context');
 const headers=[];
 const request=async(url,options)=>{
  assert.ok(url.startsWith('https://api.github.com/repos/'+repo+'/'));
  assert.ok(!Object.hasOwn(options.headers,'Authorization'),'Anonymous smoke must not send bearer tokens');
  headers.push(url);
  return fetch(url,{headers:{...options.headers,'User-Agent':'NERYX-CodeBrain-public-smoke'},signal:AbortSignal.timeout(15000)});
 };
 let result;
 try{
  result=await inspect({repo,number,anonymous:true,request});
 }catch(err){
  if(/^GitHub HTTP (?:403|429)$/.test(String(err?.message))){
   console.log('NERYX PUBLIC API SMOKE: INCONCLUSIVE; unauthenticated API access denied or rate-limited');
   t.skip('Anonymous GitHub API returned HTTP 403/429; no live scan verified');
   return;
  }
  throw err;
 }
 assert.equal(result.number,number);
 assert.match(result.sha,/^[a-f0-9]{40}$/i);
 assert.ok(result.rows.length>=1,'The changed-file list must not be empty');
 assert.equal(result.rows.length,result.checked+result.rows.filter(x=>x.status!=='checked').length);
 assert.ok(result.rows.every(x=>['checked','partial','skipped','error'].includes(x.status)));
 assert.ok(headers.some(u=>u.endsWith('/pulls/'+number+'/files?per_page=100')));
 const report=render(result);
 assert.ok(report.includes('PR #'+number));
 assert.equal(report.includes('UNVOLLSTÄNDIG'),!result.complete);
 assert.doesNotMatch(report,/Bearer |ghp_|github_pat_/);
 console.log('Public API smoke: PR='+number+' real files='+result.rows.length+', checked='+result.checked+', partial='+result.rows.filter(x=>x.status==='partial').length+', skipped='+result.rows.filter(x=>x.status==='skipped').length+', errors='+result.rows.filter(x=>x.status==='error').length+', complete='+result.complete);
});
