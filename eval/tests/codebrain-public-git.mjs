// Candidate acquisition contract. No network call until a bounded runner is supplied.
const SHA=/^[a-f0-9]{40}$/;
export function publicGitPlan({repo,number,head,base}){
 if(typeof repo!=='string'||!(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/).test(repo)||repo.endsWith('.git'))throw Error('Invalid public repository');
 if(!Number.isSafeInteger(number)||number<1||number>1000000||typeof head!=='string'||typeof base!=='string'||!SHA.test(head)||!SHA.test(base))throw Error('Invalid pinned acquisition context');
 const url='https://github.com/'+repo+'.git';
 const opts=['--no-replace-objects','-c','protocol.allow=never','-c','protocol.https.allow=always','-c','http.followRedirects=false','-c','http.sslVerify=true','-c','credential.helper=','-c','core.hooksPath=/dev/null','-c','fetch.fsckObjects=true'];
 const fetch=[...opts,'fetch','--no-tags','--no-recurse-submodules','--depth=1','--no-write-fetch-head','--',url,'refs/heads/main:refs/neryx/base','refs/pull/'+number+'/head:refs/neryx/head'];
 return Object.freeze({url,head,base,fetch:Object.freeze(fetch),verify:Object.freeze([Object.freeze([...opts,'rev-parse','--verify','refs/neryx/base^{commit}']),Object.freeze([...opts,'rev-parse','--verify','refs/neryx/head^{commit}'])])});
}
// The runner contract requires an empty, bounded bare repository and sanitized
// environment. This function alone does not enforce OS/network/disk isolation.
export function verifyPublicGitIdentity(plan,outputs){
 if(!Array.isArray(outputs)||outputs.length!==2||outputs.some(x=>typeof x!=='string'||!SHA.test(x)))throw Error('Invalid acquired commit identity');
 if(outputs[0]!==plan.base||outputs[1]!==plan.head)throw Error('Public Git refs changed or do not match pinned identities');
 return Object.freeze({base:outputs[0],head:outputs[1]});
}
