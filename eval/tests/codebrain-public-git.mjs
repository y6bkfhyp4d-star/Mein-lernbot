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

// Verify raw Git commit/tree objects against pinned SHA-1 identities.
// Derive the complete endpoint-tree difference, independently of the handoff list.
export function verifyPublicGitTreeHandoff(plan,packet,objects){
 const validated=validatePublicGitHandoff(plan,packet);
 if(!Array.isArray(objects)||objects.length>4096)throw Error('Invalid proof inventory');
 const map=new Map();
 let total=0;
 for(const o of objects){
  if(!o||!SHA.test(o.sha)||!['commit','tree'].includes(o.type)||typeof o.content!=='string'||o.content.length>1398104||map.has(o.sha))throw Error('Invalid proof object');
  const raw=Buffer.from(o.content,'base64');
  total+=raw.length;
  if(raw.toString('base64')!==o.content||total>8388608||createHash('sha1').update(o.type+' '+raw.length+'\0').update(raw).digest('hex')!==o.sha)throw Error('Invalid proof hash or size');
  map.set(o.sha,{type:o.type,raw});
 }
 const used=new Set();
 const get=(sha,type)=>{
  const o=map.get(sha);
  if(!o||o.type!==type)throw Error('Missing proof object');
  used.add(sha);
  return o.raw;
 };
 const root=sha=>{
  const raw=get(sha,'commit');
  const first=raw.subarray(0,raw.indexOf(10)).toString('ascii');
  if(!/^tree [a-f0-9]{40}$/.test(first))throw Error('Invalid commit tree');
  return first.slice(5);
 };
 const inventory=sha=>{
  const files=new Map();
  let count=0;
  function walk(id,prefix,depth){
   if(depth>32)throw Error('Tree depth limit');
   const raw=get(id,'tree'),names=new Set();
   let pos=0;
   while(pos<raw.length){
    if(++count>20000)throw Error('Tree entry limit');
    const space=raw.indexOf(32,pos),nul=raw.indexOf(0,space+1);
    if(space<pos||nul<=space+1||nul+21>raw.length)throw Error('Malformed tree entry');
    const mode=raw.subarray(pos,space).toString('ascii');
    const bytes=raw.subarray(space+1,nul),name=bytes.toString('utf8');
    if(!Buffer.from(name).equals(bytes)||/[\x00-\x1f\x7f\\/]/.test(name)||['.','..','.git'].includes(name.toLowerCase())||names.has(name))throw Error('Invalid tree name');
    names.add(name);
    const path=prefix+name,oid=raw.subarray(nul+1,nul+21).toString('hex');
    if(path.length>240)throw Error('Tree path limit');
    if(mode==='40000')walk(oid,path+'/',depth+1);
    else if(['100644','100755','120000','160000'].includes(mode))files.set(path,{mode,sha:oid});
    else throw Error('Unsupported tree mode');
    pos=nul+21;
   }
  }
  walk(root(sha),'',0);
  return files;
 };
 const base=inventory(plan.base),head=inventory(plan.head);
 const expected=new Map();
 for(const path of new Set([...base.keys(),...head.keys()])){
  const a=base.get(path),b=head.get(path);
  if(a?.mode===b?.mode&&a?.sha===b?.sha)continue;
  if([a,b].some(x=>x&&!['100644','100755'].includes(x.mode)))throw Error('Unsupported changed tree mode');
  expected.set(path,b?{status:a?'modified':'added',...b}:{status:'removed',mode:null,sha:null});
  if(expected.size>30)throw Error('Changed tree limit');
 }
 if(expected.size!==validated.files.length||used.size!==map.size)throw Error('Incomplete or excess proof inventory');
 for(const f of validated.files){
  const e=expected.get(f.path);
  if(!e||e.status!==f.status||e.mode!==f.mode||e.sha!==f.sha)throw Error('Handoff differs from pinned trees');
 }
 return validated;
}
