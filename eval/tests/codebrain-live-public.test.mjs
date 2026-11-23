// Public GitHub API smoke test. No GITHUB_TOKEN, secrets, Gemini, npm install or PR code execution.
// Runs only when explicitly enabled by the isolated workflow.
import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect,render} from '../../.github/scripts/neryx-codebrain.mjs';

test('anonymously scan actual open PR #97 via public GitHub REST API', {skip:process.env.CODEBRAIN_LIVE_PUBLIC!=='1'}, async(t)=>{
 const headers=[];
 const request=async(url,options)=>{
  assert.ok(url.startsWith('https://api.github.com/repos/y6bkfhyp4d-star/Mein-lernbot/'));
  assert.ok(!Object.hasOwn(options.headers,'Authorization'),'Live API must not receive a bearer token');
  headers.push(url);
  const response=await fetch(url,{headers:{...options.headers,'User-Agent':'NERYX-CodeBrain-public-smoke'},signal:AbortSignal.timeout(15000)});
  return response;
 };
 let result;
 try{
  result=await inspect({
   repo:'y6bkfhyp4d-star/Mein-lernbot',number:97,
   anonymous:true,request
  });
 }catch(err){
  if(/^GitHub HTTP (?:403|429)$/.test(String(err?.message))){
   console.log('NERYX PUBLIC API SMOKE: INCONCLUSIVE (anonymous API denied or rate-limited); no coverage claim');
   t.skip('Anonymous GitHub API access returned HTTP 403/429; no live coverage verified on this run');
   return;
  }
  throw err;
 }
 assert.ok(result.rows.length>=5,'Expect real PR files, not an empty synthetic response');
 assert.ok(result.rows.some(x=>x.file==='.github/scripts/neryx-codebrain.mjs'&&x.status==='checked'));
 assert.ok(result.rows.some(x=>x.file==='.github/workflows/neryx-codebrain.yml'&&x.status==='checked'&&x.reason==='yaml-ast-parse'));
 assert.ok(result.rows.some(x=>x.file==='docs/NERYX_CODEBRAIN_V1.md'&&x.status==='skipped'));
 assert.equal(result.complete,false,'Unsupported Markdown and partial YAML must not pass');
 assert.ok(headers.some(u=>u.includes('/pulls/97/files?per_page=100')));
 const report=render(result);
 assert.match(report,/UNVOLLSTÄNDIG/);
 assert.doesNotMatch(report,/Bearer |ghp_|github_pat_/);
 console.log('Public API smoke: real files='+result.rows.length+', checked='+result.checked+', partial='+result.rows.filter(x=>x.status==='partial').length+', skipped='+result.rows.filter(x=>x.status==='skipped').length);
});
