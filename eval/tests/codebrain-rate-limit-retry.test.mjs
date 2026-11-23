import test from 'node:test';
import assert from 'node:assert/strict';
import {rateLimitRetryDelay,requestWithRateLimitRetry} from './codebrain-rate-limit-retry.mjs';
const response=(status,headers={})=>({status,headers:new Headers(headers)});
test('primary hourly limit waits only if reset fits remaining CI budget',()=>{
 const d={remaining:0,reset:100, retryAfter:null};
 assert.equal(rateLimitRetryDelay(d,99500,20000),1500);
 assert.equal(rateLimitRetryDelay(d,50000,20000),null);
});
test('secondary limit uses only short numeric retry-after',()=>{
 assert.equal(rateLimitRetryDelay({remaining:5,reset:null,retryAfter:2},0),2000);
 assert.equal(rateLimitRetryDelay({remaining:5,reset:null,retryAfter:120},0),null);
 assert.equal(rateLimitRetryDelay({remaining:null,reset:null,retryAfter:null},0),null);
});
test('one short retry succeeds without exposing any bearer token',async()=>{
 let calls=0,waited=0;
 const result=await requestWithRateLimitRetry(async()=>{
  calls++;
  return calls===1?response(429,{'retry-after':'2','x-ratelimit-remaining':'1'}):response(200);
 },{sleep:async ms=>{waited=ms;}});
 assert.equal(result.status,200);
 assert.equal(calls,2);
 assert.equal(waited,2000);
});
test('long hourly reset remains 403, with zero needless retries',async()=>{
 let calls=0;
 const result=await requestWithRateLimitRetry(async()=>{
  calls++;
  return response(403,{'x-ratelimit-remaining':'0','x-ratelimit-reset':'1000'});
 },{now:()=>0,sleep:()=>{throw Error('not allowed');}});
 assert.equal(result.status,403);
 assert.equal(calls,1);
});
test('retry never loops when second response is still denied',async()=>{
 let calls=0;
 const result=await requestWithRateLimitRetry(async()=>{
  calls++;
  return response(429,{'retry-after':'1'});
 },{sleep:async()=>{}});
 assert.equal(result.status,429);
 assert.equal(calls,2);
});
test('server errors and successful responses never get retried',async()=>{
 for(const status of [200,500]){
  let calls=0;
  const result=await requestWithRateLimitRetry(async()=>{calls++;return response(status);});
  assert.equal(result.status,status);
  assert.equal(calls,1);
 }
});
