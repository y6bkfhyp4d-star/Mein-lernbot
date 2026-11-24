import {createHash} from 'node:crypto';
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

// Candidate handoff: compare endpoint trees, NOT a merge-base PR diff.
// Only regular files, no symlinks, submodules or executable checkout.
export function validatePublicGitHandoff(plan,packet){
 const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys;
 if(!exact(packet,'base,files,head')||!Array.isArray(packet.files)||packet.files.length<1||packet.files.length>30)throw Error('Invalid Git handoff');
 verifyPublicGitIdentity(plan,[packet.base,packet.head]);
 const seen=new Set(),files=[];
 let total=0;
 for(const f of packet.files){
  if(!exact(f,'content,mode,path,sha,size,status')||typeof f.path!=='string'||f.path.length<1||f.path.length>240||/[\x00-\x1f\x7f\\]/.test(f.path)||f.path.split('/').some(x=>!x||x==='.'||x==='..'||x.toLowerCase()==='.git')||seen.has(f.path))throw Error('Invalid handoff path');
  seen.add(f.path);
  if(!['added','modified','removed'].includes(f.status))throw Error('Invalid handoff status');
  if(f.status==='removed'){
   if(f.mode!==null||f.sha!==null||f.size!==0||f.content!==null)throw Error('Invalid removed entry');
   files.push(Object.freeze({...f}));continue;
  }
  if(!['100644','100755'].includes(f.mode)||typeof f.sha!=='string'||!SHA.test(f.sha)||!Number.isSafeInteger(f.size)||f.size<0||f.size>70000||typeof f.content!=='string'||f.content.length>93336)throw Error('Invalid handoff blob metadata');
  const bytes=Buffer.from(f.content,'base64');
  if(bytes.length!==f.size||bytes.toString('base64')!==f.content)throw Error('Invalid handoff blob encoding');
  const hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(hash!==f.sha)throw Error('Invalid handoff blob hash');
  total+=bytes.length;
  if(total>2100000)throw Error('Handoff aggregate limit');
  files.push(Object.freeze({...f}));
 }
 return Object.freeze({base:packet.base,head:packet.head,files:Object.freeze(files)});
}
