// Only safe, bounded metadata from HTTP 403/429; no URLs, tokens or response body.
const integer=(value,max)=>{
 if(typeof value!=='string'||!/^\d{1,12}$/.test(value))return null;
 const n=Number(value);
 return Number.isSafeInteger(n)&&n<=max?n:null;
};
export function githubRateLimitDiagnostic(response){
 const status=response?.status;
 if(status!==403&&status!==429)return null;
 const get=name=>response.headers?.get?.(name)??null;
 const remaining=integer(get('x-ratelimit-remaining'),100000000);
 const limit=integer(get('x-ratelimit-limit'),100000000);
 const reset=integer(get('x-ratelimit-reset'),9999999999);
 const retryAfter=integer(get('retry-after'),86400);
 const rawResource=get('x-ratelimit-resource');
 const resource=['core','search','graphql','integration_manifest','code_search'].includes(rawResource)?rawResource:'unknown';
 const kind=remaining===0?'primary-limit-exhausted':remaining!==null&&remaining>0?'secondary-or-policy-limit':'undetermined';
 return {status,kind,remaining,limit,reset,retryAfter,resource};
}
export function formatGithubRateLimitDiagnostic(d){
 if(!d)return 'No rate-limit diagnostic';
 const numeric=n=>n===null?'unknown':String(n);
 return 'GitHub API denied (HTTP '+d.status+'): kind='+d.kind+
  ', resource='+d.resource+', remaining='+numeric(d.remaining)+
  ', limit='+numeric(d.limit)+', reset_unix='+numeric(d.reset)+
  ', retry_after_seconds='+numeric(d.retryAfter);
}

 // Only documented throttling evidence may make the optional live probe inconclusive.
 // Generic 403 (permission/policy failure) must still fail the workflow.
export const isPublicApiRateLimit=d=>!!d&&(d.status===429||
 d.status===403&&(d.remaining===0||d.retryAfter!==null));
