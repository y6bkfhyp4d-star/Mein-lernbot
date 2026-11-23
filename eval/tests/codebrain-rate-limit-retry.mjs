import {githubRateLimitDiagnostic} from './codebrain-rate-limit-diagnostics.mjs';

// Exactly one retry, only when GitHub's advertised wait fits the short CI budget.
// Exhausted hourly quota with distant reset stays INCONCLUSIVE (not green).
export function rateLimitRetryDelay(d,nowMs=Date.now(),maxWaitMs=20000){
 if(!d||!Number.isFinite(nowMs)||maxWaitMs<0)return null;
 let delay=null;
 if(d.remaining===0&&d.reset!==null){
  delay=Math.max(1000,d.reset*1000-nowMs+1000);
 }else if(d.retryAfter!==null){
  delay=Math.max(1000,d.retryAfter*1000);
 }
 return Number.isFinite(delay)&&delay<=maxWaitMs?Math.ceil(delay):null;
}
export async function requestWithRateLimitRetry(send,{now=()=>Date.now(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),maxWaitMs=20000,onRetry=()=>{}}={}){
 const first=await send();
 const diagnostic=githubRateLimitDiagnostic(first);
 const delay=rateLimitRetryDelay(diagnostic,now(),maxWaitMs);
 if(delay===null)return first;
 // Release the first error response instead of retaining its socket during wait.
 await first.body?.cancel?.().catch(()=>{});
 onRetry(delay,diagnostic);
 await sleep(delay);
 return send();
}
