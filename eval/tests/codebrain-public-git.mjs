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

// Trusted collector script runs inside the disposable Git container. It emits
// only bounded raw proof objects and changed blobs, not a checkout or archive.
export const publicGitCollector = [
 'set -euo pipefail',
 'export LC_ALL=C',
 'base=$(git rev-parse --verify refs/neryx/base^{commit})',
 'head=$(git rev-parse --verify refs/neryx/head^{commit})',
 'printf "I %s %s\\n" "$base" "$head"',
 'declare -A seen=()',
 'total=0; count=0',
 'emit() {',
 '  local type="$1" oid="$2" limit="$3" size',
 '  [[ "$oid" =~ ^[0-9a-f]{40}$ ]]',
 '  size=$(git cat-file -s "$oid")',
 '  [[ "$size" =~ ^[0-9]+$ ]] && (( size <= limit ))',
 '  printf "%s %s " "$type" "$oid"',
 '  git cat-file "$type" "$oid" | base64 -w0',
 '  printf "\\n"',
 '}',
 'proof() {',
 '  local type="$1" oid="$2" size',
 '  [[ "$oid" =~ ^[0-9a-f]{40}$ ]]',
 '  if [[ -v seen[$oid] ]]; then return; fi',
 '  seen[$oid]=1',
 '  size=$(git cat-file -s "$oid")',
 '  [[ "$size" =~ ^[0-9]+$ ]] && (( size <= 1048576 ))',
 '  total=$((total+size)); count=$((count+1))',
 '  (( total <= 8388608 && count <= 4096 ))',
 '  emit "$type" "$oid" 1048576',
 '}',
 'for commit in "$base" "$head"; do',
 '  proof commit "$commit"',
 '  proof tree "$(git rev-parse "$commit^{tree}")"',
 '  git ls-tree -r -t -z "$commit" > /tmp/neryx-tree-list',
 '  while IFS= read -r -d "" record; do',
 '    meta=${record%%$\'\\t\'*}',
 '    read -r mode type oid <<< "$meta"',
 '    if [[ "$type" == tree ]]; then proof tree "$oid"; fi',
 '  done < /tmp/neryx-tree-list',
 'done',
 'git diff --raw --no-abbrev --no-renames --no-ext-diff --no-textconv -z "$base" "$head" > /tmp/neryx-diff',
 'n=0',
 'while IFS= read -r -d "" meta && IFS= read -r -d "" path; do',
 '  n=$((n+1)); (( n <= 30 ))',
 '  read -r oldmode mode oldoid oid status <<< "${meta#:}"',
 '  [[ "$status" =~ ^[AMD]$ ]]',
 '  printf "F %s %s %s " "$status" "$mode" "$oid"',
 '  printf "%s" "$path" | base64 -w0',
 '  printf "\\n"',
 '  if [[ "$status" != D ]]; then',
 '    [[ "$mode" == 100644 || "$mode" == 100755 ]]',
 '    emit blob "$oid" 70000',
 '  fi',
 'done < /tmp/neryx-diff',
 'printf "END %s\\n" "$n"'
].join('\n').replaceAll('\\${','${');
export function decodePublicGitCollector(plan,output){
 if(typeof output!=='string'||Buffer.byteLength(output)>15000000||!output.endsWith('\n'))throw Error('Invalid collector output');
 const lines=output.slice(0,-1).split('\n');
 const identity=lines.shift()?.split(' ');
 if(identity?.length!==3||identity[0]!=='I')throw Error('Missing collector identity');
 verifyPublicGitIdentity(plan,identity.slice(1));
 const objects=[],files=[];
 let pending=null,ended=false;
 for(const line of lines){
  if(ended)throw Error('Trailing collector data');
  const parts=line.split(' '),[type,sha,content]=parts;
  if(type==='commit'||type==='tree'){
   if(pending||parts.length!==3||files.length||objects.length>=4096)throw Error('Invalid collector proof sequence');
   objects.push({type,sha,content});
  }else if(type==='F'){
   if(pending||parts.length!==5||files.length>=30)throw Error('Invalid collector file sequence');
   const [,status,mode,oid,encodedPath]=parts;
   const raw=Buffer.from(encodedPath,'base64'),path=raw.toString('utf8');
   if(raw.toString('base64')!==encodedPath||!Buffer.from(path).equals(raw))throw Error('Invalid collector path encoding');
   if(status==='D'){
    if(mode!=='000000'||oid!=='0'.repeat(40))throw Error('Invalid deletion');
    files.push({path,status:'removed',mode:null,sha:null,size:0,content:null});
   }else{
    if(!['A','M'].includes(status))throw Error('Invalid collector status');
    pending={path,status:status==='A'?'added':'modified',mode,sha:oid};
   }
  }else if(type==='blob'){
   if(!pending||parts.length!==3||sha!==pending.sha)throw Error('Unexpected collector blob');
   files.push({...pending,size:Buffer.from(content,'base64').length,content});
   pending=null;
  }else if(type==='END'){
   if(pending||parts.length!==2||sha!==String(files.length))throw Error('Invalid collector end');
   ended=true;
  }else throw Error('Unknown collector record');
 }
 if(!ended)throw Error('Incomplete collector output');
 return verifyPublicGitTreeHandoff(plan,{base:plan.base,head:plan.head,files},objects);
}

 // Offline transport adapter. Only input from the verified collector is accepted.
export async function inspectPublicGitCollector(plan,output,{repo,number,parsers}){
 if(publicGitPlan({repo,number,head:plan.head,base:plan.base}).url!==plan.url)throw Error('Mismatched scan context');
 if(!parsers||['ast','pythonSyntax','yamlSyntax'].some(k=>typeof parsers[k]!=='function'))throw Error('Missing isolated parsers');
 const data=decodePublicGitCollector(plan,output);
 const {inspect}=await import('../../.github/scripts/neryx-codebrain.mjs');
 const {snapshotMatchesFiles,snapshotOutcome}=await import('./codebrain-git-snapshot.mjs');
 const files=data.files.map(f=>({filename:f.path,status:f.status,sha:f.sha||'0'.repeat(40)}));
 const blobs=new Map(data.files.filter(f=>f.status!=='removed').map(f=>[f.sha,f]));
 const prefix='https://api.github.com/repos/'+repo;
 const pr={state:'open',base:{ref:'main',sha:data.base},head:{sha:data.head},changed_files:files.length};
 const request=async url=>{
  if(url===prefix+'/pulls/'+number)return new Response(JSON.stringify(pr));
  if(url===prefix+'/pulls/'+number+'/files?per_page=100')return new Response(JSON.stringify(files));
  if(url.startsWith(prefix+'/git/blobs/')){
   const sha=url.slice((prefix+'/git/blobs/').length),f=blobs.get(sha);
   if(f)return new Response(JSON.stringify({sha,encoding:'base64',size:f.size,content:f.content}));
  }
  throw Error('Unexpected offline transport request');
 };
 const result=await inspect({repo,number,anonymous:true,request,ast:parsers.ast,pythonSyntax:parsers.pythonSyntax,yamlSyntax:parsers.yamlSyntax});
 if(result.sha!==data.head||!snapshotMatchesFiles(result,files))throw Error('Scan inventory mismatch');
 return {scope:'ENDPOINT_TREE_DIFF',base:data.base,head:data.head,result,outcome:snapshotOutcome(result)};
}

// Strict CONNECT admission contract. No DNS lookup or socket creation here.
// The eventual relay must independently pin its upstream and enforce limits.
export function admitPublicGitConnect(raw){
 if(!Buffer.isBuffer(raw)||raw.length<1||raw.length>4096)throw Error('Invalid proxy request size');
 if(raw.some(x=>x>126||(x<32&&x!==13&&x!==10&&x!==9)))throw Error('Invalid proxy request bytes');
 const text=raw.toString('ascii');
 if(!text.endsWith('\r\n\r\n')||text.indexOf('\r\n\r\n')!==text.length-4)throw Error('Invalid proxy framing');
 const lines=text.slice(0,-4).split('\r\n');
 if(lines.length>16||!/^CONNECT github\.com:443 HTTP\/1\.[01]$/.test(lines.shift()))throw Error('Denied proxy destination');
 const seen=new Set();
 for(const line of lines){
  const m=/^([A-Za-z][A-Za-z0-9-]{0,63}):[ \t]*([\x20-\x7e]{1,512})$/.exec(line);
  if(!m)throw Error('Invalid proxy header');
  const name=m[1].toLowerCase(),value=m[2].trim();
  if(seen.has(name))throw Error('Duplicate proxy header');
  seen.add(name);
  if(name==='host'&&value==='github.com:443')continue;
  if(name==='proxy-connection'&&/^(keep-alive|close)$/i.test(value))continue;
  if(name==='user-agent'&&value.length>0)continue;
  throw Error('Denied proxy header');
 }
 if(!seen.has('host'))throw Error('Missing proxy host');
 return Object.freeze({host:'github.com',port:443});
}

// Bounded relay. The caller supplies a trusted connector; no client-selected
// address is forwarded to it. No listener is opened merely by importing.
export async function createPublicGitRelay({connectUpstream,host='127.0.0.1',port=0}){
 if(typeof connectUpstream!=='function')throw Error('Missing trusted upstream connector');
 const {createServer}=await import('node:net');
 const sockets=new Set();
 let accepted=0,total=0,closed=false;
 const server=createServer(client=>{
  if(closed||accepted>=12||sockets.size>=4){client.destroy();return;}
  accepted++;
  sockets.add(client);
  let upstream=null,header=Buffer.alloc(0),phase='header',bytes=0,finished=false;
  const deadline=setTimeout(()=>finish(),45000);
  function finish(){
   if(finished)return;
   finished=true;clearTimeout(deadline);
   sockets.delete(client);client.destroy();upstream?.destroy();
  }
  client.on('error',finish);client.on('close',finish);
  client.setTimeout(5000,finish);
  function account(chunk){
   bytes+=chunk.length;total+=chunk.length;
   if(bytes>67108864||total>134217728){finish();return false;}
   return true;
  }
  client.on('data',chunk=>{
   if(finished)return;
   if(phase==='relay'){
    if(account(chunk)&&!upstream.write(chunk))client.pause();
    return;
   }
   if(phase!=='header'){finish();return;}
   if(header.length+chunk.length>4096){finish();return;}
   header=Buffer.concat([header,chunk]);
   if(!header.includes('\r\n\r\n'))return;
   try{admitPublicGitConnect(header);}catch{finish();return;}
   phase='connecting';client.pause();
   Promise.resolve().then(()=>connectUpstream()).then(socket=>{
    if(finished){socket.destroy();return;}
    upstream=socket;
    upstream.on('error',finish);upstream.on('close',finish);
    upstream.setTimeout(10000,finish);
    upstream.on('drain',()=>{if(!finished)client.resume();});
    client.on('drain',()=>{if(!finished)upstream.resume();});
    upstream.on('data',data=>{
     if(account(data)&&!client.write(data))upstream.pause();
    });
    phase='relay';client.setTimeout(10000,finish);
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    client.resume();
   }).catch(finish);
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
 return Object.freeze({address:server.address(),close:async()=>{
  closed=true;
  for(const socket of sockets)socket.destroy();
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 }});
}

// Conservative IPv4-only admission. DNS is a trusted deployment dependency,
// not an authentication mechanism; Git still verifies GitHub TLS certificates.
export function publicGitIPv4(address){
 if(typeof address!=='string'||! /^(?:0|[1-9][0-9]{0,2})(?:\.(?:0|[1-9][0-9]{0,2})){3}$/.test(address))return false;
 const [a,b,c,d]=address.split('.').map(Number);
 if([a,b,c,d].some(n=>n>255))return false;
 return !(a===0||a===10||a===127||a>=224||
  (a===100&&b>=64&&b<=127)||(a===169&&b===254)||
  (a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===88&&c===99))||
  (a===192&&b===0&&c===2)||(a===198&&(b===18||b===19||b===51&&c===100))||
  (a===203&&b===0&&c===113));
}
export async function resolvePublicGitUpstream(resolve4){
 if(typeof resolve4!=='function')throw Error('Missing trusted resolver');
 const addresses=await resolve4('github.com');
 if(!Array.isArray(addresses)||addresses.length<1||addresses.length>16||
   addresses.some(a=>!publicGitIPv4(a)))throw Error('Unsafe GitHub DNS result');
 return Object.freeze({host:addresses[0],port:443,family:4});
}
// Resolve once per instance, then connect only to that numeric address.
// No client-provided host, port or credentials enter this connector.
export async function createFixedPublicGitConnector(){
 const {Resolver}=await import('node:dns/promises');
 const {createConnection}=await import('node:net');
 const resolver=new Resolver({timeout:2000,tries:2});
 const target=await resolvePublicGitUpstream(host=>resolver.resolve4(host));
 return ()=>new Promise((resolve,reject)=>{
  const socket=createConnection(target);
  const timer=setTimeout(()=>socket.destroy(Error('Upstream connection deadline')),5000);
  const fail=error=>{clearTimeout(timer);socket.destroy();reject(error);};
  socket.once('error',fail);
  socket.once('connect',()=>{
   clearTimeout(timer);
   if(socket.remoteAddress!==target.host||socket.remotePort!==443){fail(Error('Upstream identity mismatch'));return;}
   // Keep an error listener until the relay attaches its own listeners.
   resolve(socket);
  });
 });
}
